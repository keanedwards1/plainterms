import {
  BatchGetItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const defaultDb = new DynamoDBClient({});
const defaultS3 = new S3Client({});
const OWNER_INDEX = "owner-created-index";
const MAX_PAGE_SIZE = 50;

function resultsTable() {
  const name = process.env.RESULTS_TABLE;
  if (!name) throw new Error("Missing required env var: RESULTS_TABLE");
  return name;
}

export function encodeCursor(lastKey) {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey), "utf8").toString("base64url");
}

export function decodeCursor(cursor) {
  if (typeof cursor !== "string" || !cursor || cursor.length > 2048) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const ok =
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.result_id?.S === "string" &&
      typeof parsed.owner_user_id?.S === "string" &&
      typeof parsed.created_at?.S === "string";
    return ok ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function documentFromItem(item) {
  const expiresAt = Number(item?.expires_at?.N);
  return {
    id: item?.result_id?.S ?? "",
    createdAt: item?.created_at?.S ?? "",
    fileName: item?.file_name?.S ?? "Contract document",
    status: item?.status?.S ?? "complete",
    riskScore: Number(item?.risk_score?.N ?? 0),
    riskLabel: item?.risk_label?.S ?? "medium",
    recommendationAction: item?.recommendation_action?.S ?? "negotiate",
    recommendationLabel: item?.recommendation_label?.S ?? "",
    flagCount: Number(item?.flag_count?.N ?? 0),
    expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null,
  };
}

/** Newest-first page of a user's documents, read from the owner GSI. */
export async function listOwnerDocuments(userId, { cursor, limit = 20, db = defaultDb, nowEpoch } = {}) {
  const pageSize = Math.min(Math.max(Math.floor(Number(limit) || 20), 1), MAX_PAGE_SIZE);
  const res = await db.send(
    new QueryCommand({
      TableName: resultsTable(),
      IndexName: OWNER_INDEX,
      KeyConditionExpression: "owner_user_id = :u",
      ExpressionAttributeValues: { ":u": { S: userId } },
      ScanIndexForward: false,
      Limit: pageSize,
      ExclusiveStartKey: decodeCursor(cursor),
    })
  );
  const now = nowEpoch ?? Math.floor(Date.now() / 1000);
  const documents = (res?.Items ?? [])
    .map(documentFromItem)
    // DynamoDB TTL deletes lazily, so hide anything already past its expiry.
    .filter((doc) => doc.expiresAt === null || doc.expiresAt > now);
  return { documents, nextCursor: encodeCursor(res?.LastEvaluatedKey) };
}

/** Every result key a user owns (paginates the whole GSI). */
export async function listAllOwnerResultKeys(userId, { db = defaultDb } = {}) {
  const keys = [];
  let startKey;
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: resultsTable(),
        IndexName: OWNER_INDEX,
        KeyConditionExpression: "owner_user_id = :u",
        ExpressionAttributeValues: { ":u": { S: userId } },
        ExclusiveStartKey: startKey,
      })
    );
    for (const item of res?.Items ?? []) {
      if (item?.result_id?.S) keys.push(item.result_id.S);
    }
    startKey = res?.LastEvaluatedKey;
  } while (startKey);
  return keys;
}

export async function getResultItem(resultId, { db = defaultDb } = {}) {
  const res = await db.send(
    new GetItemCommand({ TableName: resultsTable(), Key: { result_id: { S: resultId } } })
  );
  return res?.Item ?? null;
}

/** Deletes a stored result and its uploaded file. */
export async function deleteResultAndUpload(item, { db = defaultDb, s3 = defaultS3 } = {}) {
  const objectKey = item?.object_key?.S;
  const bucket = process.env.UPLOAD_BUCKET;
  if (objectKey && bucket) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch {
      // The bucket lifecycle rule removes uploads after 30 days anyway.
    }
  }
  await db.send(
    new DeleteItemCommand({
      TableName: resultsTable(),
      Key: { result_id: { S: item.result_id.S } },
    })
  );
}

/**
 * Sets (or clears, when `expiresAtEpoch` is null) the expiry on every result a
 * user owns. Used when the plan changes: Pro keeps documents, free keeps them
 * for 30 days.
 */
export async function setOwnerDocumentsExpiry(userId, expiresAtEpoch, { db = defaultDb } = {}) {
  const ids = await listAllOwnerResultKeys(userId, { db });
  for (const id of ids) {
    const command =
      expiresAtEpoch === null
        ? new UpdateItemCommand({
            TableName: resultsTable(),
            Key: { result_id: { S: id } },
            UpdateExpression: "REMOVE expires_at",
            ConditionExpression: "attribute_exists(result_id)",
          })
        : new UpdateItemCommand({
            TableName: resultsTable(),
            Key: { result_id: { S: id } },
            UpdateExpression: "SET expires_at = :e",
            ConditionExpression: "attribute_exists(result_id)",
            ExpressionAttributeValues: { ":e": { N: String(Math.floor(expiresAtEpoch)) } },
          });
    try {
      await db.send(command);
    } catch (err) {
      if (err?.name !== "ConditionalCheckFailedException") throw err;
    }
  }
  return ids.length;
}

const SEARCH_PAGE_SIZE = 40;
const SEARCH_TEXT_LIMIT = 12000;

function parseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clip(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** The compact, searchable view of one document: names, parties, the review and the contract text. */
export function searchRecordFromItem(item) {
  const summary = documentFromItem(item);
  const ui = parseJson(item?.ui_result?.S) ?? {};
  const review = ui.review ?? null;
  const parties = review?.perspective?.parties?.map((p) => clip(p?.name, 120)).filter(Boolean) ?? [];
  return {
    ...summary,
    parties,
    verdict: clip(review?.verdict?.headline ?? summary.recommendationLabel, 80),
    issues: (review?.issues ?? []).slice(0, 10).map((i) => ({ title: clip(i?.title, 120), why: clip(i?.why, 400) })),
    deal: (review?.deal ?? []).slice(0, 8).map((d) => clip(d?.value, 240)).filter(Boolean),
    gaps: (review?.gaps ?? []).slice(0, 6).map((g) => clip(g, 160)).filter(Boolean),
    text: clip(ui?.document?.extracted_text, SEARCH_TEXT_LIMIT),
  };
}

/**
 * One page of a user's search index, newest first: the owner GSI gives the ids,
 * then a batch read fetches the full records. Pages stay well under the Lambda
 * response limit; the client follows `nextCursor` until it's null.
 */
export async function listOwnerSearchRecords(userId, { cursor, db = defaultDb, nowEpoch } = {}) {
  const page = await db.send(
    new QueryCommand({
      TableName: resultsTable(),
      IndexName: OWNER_INDEX,
      KeyConditionExpression: "owner_user_id = :u",
      ExpressionAttributeValues: { ":u": { S: userId } },
      ScanIndexForward: false,
      Limit: SEARCH_PAGE_SIZE,
      ExclusiveStartKey: decodeCursor(cursor),
    })
  );
  const now = nowEpoch ?? Math.floor(Date.now() / 1000);
  const ids = (page?.Items ?? [])
    .map(documentFromItem)
    .filter((doc) => doc.id && (doc.expiresAt === null || doc.expiresAt > now))
    .map((doc) => doc.id);

  const byId = new Map();
  let keys = ids.map((id) => ({ result_id: { S: id } }));
  for (let attempt = 0; keys.length && attempt < 5; attempt += 1) {
    const res = await db.send(
      new BatchGetItemCommand({
        RequestItems: {
          [resultsTable()]: {
            Keys: keys,
            ProjectionExpression:
              "result_id, owner_user_id, created_at, file_name, #s, risk_score, risk_label, recommendation_action, recommendation_label, flag_count, expires_at, ui_result",
            ExpressionAttributeNames: { "#s": "status" },
          },
        },
      })
    );
    for (const item of res?.Responses?.[resultsTable()] ?? []) {
      // Never return another user's document, even if an id slipped through.
      if (item?.owner_user_id?.S === userId) byId.set(item.result_id.S, searchRecordFromItem(item));
    }
    keys = res?.UnprocessedKeys?.[resultsTable()]?.Keys ?? [];
  }
  return { documents: ids.map((id) => byId.get(id)).filter(Boolean), nextCursor: encodeCursor(page?.LastEvaluatedKey) };
}
