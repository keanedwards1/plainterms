import crypto from "node:crypto";
import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const defaultDb = new DynamoDBClient({});
const USAGE_RETENTION_SECONDS = 400 * 24 * 60 * 60;

function usageTable() {
  const name = process.env.USAGE_TABLE;
  if (!name) throw new Error("Missing required env var: USAGE_TABLE");
  return name;
}

export function currentPeriod(now = new Date()) {
  return now.toISOString().slice(0, 7); // YYYY-MM, UTC
}

/**
 * Atomically counts one document against this month's limit. The condition
 * runs inside DynamoDB, so concurrent requests can never push the count past
 * the limit. Returns `{ ok: true, count }` or `{ ok: false, reason: "limit_reached" }`.
 */
export async function reserveDocument(userId, limit, { db = defaultDb, now = new Date() } = {}) {
  const expiresAt = Math.floor(now.getTime() / 1000) + USAGE_RETENTION_SECONDS;
  try {
    const res = await db.send(
      new UpdateItemCommand({
        TableName: usageTable(),
        Key: { user_id: { S: userId }, period: { S: currentPeriod(now) } },
        UpdateExpression: "ADD docs_count :one SET expires_at = if_not_exists(expires_at, :exp)",
        ConditionExpression: "attribute_not_exists(docs_count) OR docs_count < :limit",
        ExpressionAttributeValues: {
          ":one": { N: "1" },
          ":limit": { N: String(limit) },
          ":exp": { N: String(expiresAt) },
        },
        ReturnValues: "UPDATED_NEW",
      })
    );
    return { ok: true, count: Number(res?.Attributes?.docs_count?.N ?? 1) };
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return { ok: false, reason: "limit_reached" };
    throw err;
  }
}

/** Gives back a reserved document when the analysis could not start. Best effort. */
export async function releaseDocument(userId, { db = defaultDb, now = new Date() } = {}) {
  try {
    await db.send(
      new UpdateItemCommand({
        TableName: usageTable(),
        Key: { user_id: { S: userId }, period: { S: currentPeriod(now) } },
        UpdateExpression: "ADD docs_count :minus",
        ConditionExpression: "docs_count > :zero",
        ExpressionAttributeValues: { ":minus": { N: "-1" }, ":zero": { N: "0" } },
      })
    );
  } catch {
    // Ignore: an over-count by one is harmless.
  }
}

export async function getMonthlyCount(userId, { db = defaultDb, now = new Date() } = {}) {
  const res = await db.send(
    new GetItemCommand({
      TableName: usageTable(),
      Key: { user_id: { S: userId }, period: { S: currentPeriod(now) } },
    })
  );
  return Number(res?.Item?.docs_count?.N ?? 0);
}

function tokenKey(token) {
  return `token#${crypto.createHash("sha256").update(String(token), "utf8").digest("base64url")}`;
}

/**
 * Marks a precheck token as spent so one upload can only start one analysis.
 * Stored in the usage table under a hashed key that expires with the token.
 */
export async function consumePrecheckToken(token, tokenExpEpoch, { db = defaultDb } = {}) {
  try {
    await db.send(
      new PutItemCommand({
        TableName: usageTable(),
        Item: {
          user_id: { S: tokenKey(token) },
          period: { S: "used" },
          expires_at: { N: String(Math.floor(tokenExpEpoch) + 3600) },
        },
        ConditionExpression: "attribute_not_exists(user_id)",
      })
    );
    return true;
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

/** Un-spends a precheck token when the analysis it started failed, so the user can retry. */
export async function releasePrecheckToken(token, { db = defaultDb } = {}) {
  try {
    await db.send(
      new DeleteItemCommand({
        TableName: usageTable(),
        Key: { user_id: { S: tokenKey(token) }, period: { S: "used" } },
      })
    );
  } catch {
    // Ignore: the user can still add the file again.
  }
}

export async function deleteUsageForUser(userId, { db = defaultDb } = {}) {
  let startKey;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: usageTable(),
        KeyConditionExpression: "user_id = :u",
        ExpressionAttributeValues: { ":u": { S: userId } },
        ProjectionExpression: "user_id, period",
        ExclusiveStartKey: startKey,
      })
    );
    const items = page?.Items ?? [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25).map((item) => ({
        DeleteRequest: { Key: { user_id: item.user_id, period: item.period } },
      }));
      await db.send(new BatchWriteItemCommand({ RequestItems: { [usageTable()]: batch } }));
    }
    startKey = page?.LastEvaluatedKey;
  } while (startKey);
}
