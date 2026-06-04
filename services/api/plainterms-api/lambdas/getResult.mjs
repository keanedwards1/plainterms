/* service/api/plainterms-api/hello-world/getResult.mjs */

import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { jsonResponse, methodGuard } from "./lib/http.mjs";
import { hashResultAccessKey, secureEqualStrings } from "./lib/resultAccessKey.mjs";

const db = new DynamoDBClient({});
const METHODS = "GET,OPTIONS";

function getRetentionDays() {
  const raw = Number(process.env.RESULT_TTL_DAYS ?? "30");
  if (!Number.isFinite(raw) || raw <= 0) return 30;
  return Math.floor(raw);
}

function matchesAnyAccessHash({ accessKey, hashes }) {
  const normalized = typeof accessKey === "string" ? accessKey.trim() : "";
  if (!normalized) return false;

  const providedAccessKeyHash = hashResultAccessKey(normalized);
  return hashes.some((hash) => typeof hash === "string" && hash && secureEqualStrings(providedAccessKeyHash, hash));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasMeaningfulRevisionTargets(uiResult) {
  const flags = asArray(uiResult?.report?.red_flags);
  const clauses = asArray(uiResult?.report?.clause_breakdown);
  const hasPriorityFlags = flags.some((flag) => flag?.severity === "high" || flag?.severity === "medium");
  const hasUnclearClauses = clauses.some(
    (clause) => clause?.status === "missing" || clause?.status === "unclear"
  );
  return hasPriorityFlags || hasUnclearClauses;
}

function withRevision(uiResult, revision) {
  return {
    ...uiResult,
    document: {
      ...(uiResult?.document ?? {}),
      revision,
    },
  };
}

function revisionWorkerNameFromEnv() {
  return (
    process.env.DOCUMENT_REVISION_FUNCTION_NAME ||
    process.env.DOCUMENT_REVISION_FUNCTION_ARN ||
    ""
  ).trim();
}

async function queueDocumentRevisionJob(resultId) {
  const workerName = revisionWorkerNameFromEnv();
  if (!workerName) return false;
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  const lambda = new LambdaClient({});
  await lambda.send(
    new InvokeCommand({
      FunctionName: workerName,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ resultId })),
    })
  );
  return true;
}

export const handler = async (event) => {
  const methodResponse = methodGuard(event, "GET", METHODS);
  if (methodResponse) return methodResponse;

  const id = event?.pathParameters?.id;
  if (!id) {
    return jsonResponse(event, 400, { error: "Missing result id" }, METHODS);
  }

  const accessKey = event?.queryStringParameters?.k ?? event?.queryStringParameters?.key;
  if (typeof accessKey !== "string" || !accessKey.trim()) {
    return jsonResponse(event, 401, { error: "Missing result access key." }, METHODS);
  }

  try {
    const cmd = new GetItemCommand({
      TableName: process.env.RESULTS_TABLE,
      Key: {
        result_id: { S: id },
      },
    });

    const res = await db.send(cmd);

    if (!res.Item) {
      return jsonResponse(event, 404, { error: "Result not found", status: "not_found" }, METHODS);
    }

    const expectedAccessKeyHash = res.Item.access_key_hash?.S ?? "";
    const previousAccessKeyHash = res.Item.access_key_hash_previous?.S ?? "";
    if (!expectedAccessKeyHash && !previousAccessKeyHash) {
      return jsonResponse(event, 401, {
        error: "This result requires a refreshed secure access link. Please verify checkout again.",
      }, METHODS);
    }

    if (
      !matchesAnyAccessHash({
        accessKey,
        hashes: [expectedAccessKeyHash, previousAccessKeyHash],
      })
    ) {
      return jsonResponse(event, 403, { error: "Invalid result access key." }, METHODS);
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    const expiresAt = Number(res.Item.expires_at?.N ?? "0");
    if (Number.isFinite(expiresAt) && expiresAt > 0 && nowEpoch >= expiresAt) {
      return jsonResponse(event, 410, {
        status: "expired",
        resultId: id,
        message: "This result is no longer available.",
        retention_days: getRetentionDays(),
      }, METHODS);
    }

    const resultStatus = res.Item.status?.S ?? "complete";

    if (resultStatus === "processing") {
      return jsonResponse(event, 202, {
        status: "processing",
        resultId: id,
        message: "Analysis is still in progress.",
      }, METHODS);
    }

    if (resultStatus === "expired") {
      return jsonResponse(event, 410, {
        status: "expired",
        resultId: id,
        message: "This result is no longer available.",
      }, METHODS);
    }

    if (!res.Item.ui_result?.S) {
      return jsonResponse(event, 202, {
        status: "processing",
        resultId: id,
        message: "Analysis is still in progress.",
      }, METHODS);
    }

    let uiResult;
    try {
      uiResult = JSON.parse(res.Item.ui_result.S);
    } catch {
      return jsonResponse(event, 500, {
        error: "Stored result payload is invalid. Please verify checkout again for a refreshed link.",
      }, METHODS);
    }

    if (!uiResult?.document?.revision) {
      const extractedText =
        typeof uiResult?.document?.extracted_text === "string" ? uiResult.document.extracted_text : "";
      const nextRevision = !extractedText.trim()
        ? {
            status: "not_available",
            message: "Document text was not available for revision generation.",
          }
        : hasMeaningfulRevisionTargets(uiResult)
          ? {
              status: "processing",
              message: "Generating revised wording in the background.",
            }
          : {
              status: "not_needed",
              message: "No material wording risks were identified for automated revision.",
            };
      uiResult = withRevision(uiResult, nextRevision);

      try {
        await db.send(
          new UpdateItemCommand({
            TableName: process.env.RESULTS_TABLE,
            Key: {
              result_id: { S: id },
            },
            UpdateExpression: "SET ui_result = :ui",
            ExpressionAttributeValues: {
              ":ui": { S: JSON.stringify(uiResult) },
            },
          })
        );
      } catch {
        // Non-fatal: continue returning payload for this request.
      }

      if (nextRevision.status === "processing") {
        try {
          await queueDocumentRevisionJob(id);
        } catch {
          // Non-fatal: worker may be retried on subsequent requests.
        }
      }
    }

    const abVariant = res.Item.ab_variant?.S ?? null;
    return jsonResponse(event, 200, { ...uiResult, _ab_variant: abVariant }, METHODS);
  } catch {
    return jsonResponse(event, 502, { error: "Failed to load result right now. Please retry shortly." }, METHODS);
  }
};
