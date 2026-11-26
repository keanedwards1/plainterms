import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { hashResultAccessKey, secureEqualStrings } from "./lib/resultAccessKey.mjs";
import { optionalUser } from "./lib/auth.mjs";
import { planSideSwitch } from "./lib/reviewSide.mjs";
import { documentSummaryAttributes } from "./lib/runAnalysis.mjs";

const db = new DynamoDBClient({});
const METHODS = "POST,OPTIONS";

function keyMatches(accessKey, item) {
  const key = typeof accessKey === "string" ? accessKey.trim() : "";
  if (!key) return false;
  const provided = hashResultAccessKey(key);
  return [item.access_key_hash?.S, item.access_key_hash_previous?.S].some(
    (hash) => typeof hash === "string" && hash && secureEqualStrings(provided, hash)
  );
}

async function queueReview(resultId, party) {
  const name = process.env.REVIEW_FUNCTION_NAME;
  if (!name) throw new Error("Review worker is not configured.");
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  await new LambdaClient({}).send(
    new InvokeCommand({
      FunctionName: name,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ resultId, party })),
    })
  );
}

/**
 * POST /result/{id}/side  { party }
 * Rewrites the review for the other side of the contract. Instant when that
 * side was reviewed before; otherwise returns 202 and the worker fills it in.
 */
export const handler = async (event, _context, deps = {}) => {
  const guard = methodGuard(event, "POST", METHODS);
  if (guard) return guard;

  const id = event?.pathParameters?.id;
  if (!id) return jsonResponse(event, 400, { error: "Missing result id" }, METHODS);
  const body = parseJsonBody(event, METHODS);
  if (!body.ok) return body.response;

  const accessKey = event?.queryStringParameters?.k ?? event?.queryStringParameters?.key;
  const viewer = await (deps.optionalUser ?? optionalUser)(event);
  if (!viewer && !accessKey) return jsonResponse(event, 401, { error: "Sign in to change this review." }, METHODS);

  const res = await db.send(new GetItemCommand({ TableName: process.env.RESULTS_TABLE, Key: { result_id: { S: id } }, ConsistentRead: true }));
  const item = res.Item;
  if (!item) return jsonResponse(event, 404, { error: "Result not found" }, METHODS);
  const isOwner = Boolean(viewer && item.owner_user_id?.S && viewer.userId === item.owner_user_id.S);
  if (!isOwner && !keyMatches(accessKey, item)) return jsonResponse(event, 404, { error: "Result not found" }, METHODS);

  let uiResult;
  try {
    uiResult = JSON.parse(item.ui_result?.S ?? "");
  } catch {
    return jsonResponse(event, 409, { error: "This result can't be changed." }, METHODS);
  }
  if (uiResult?.review_status?.state === "processing") {
    return jsonResponse(event, 202, { state: "processing", party: uiResult.review_status.party }, METHODS);
  }

  const plan = planSideSwitch(uiResult, body.payload?.party);
  if (plan.kind === "invalid") return jsonResponse(event, 400, { error: "Pick one of the parties named in the contract." }, METHODS);
  if (plan.kind === "noop") return jsonResponse(event, 200, { state: "ready" }, METHODS);

  const summary = documentSummaryAttributes(plan.uiResult);
  await db.send(
    new UpdateItemCommand({
      TableName: process.env.RESULTS_TABLE,
      Key: { result_id: { S: id } },
      UpdateExpression: "SET ui_result = :ui, risk_score = :score, risk_label = :label, recommendation_action = :action, recommendation_label = :reclabel, flag_count = :flags",
      ExpressionAttributeValues: {
        ":ui": { S: JSON.stringify(plan.uiResult) },
        ":score": summary.risk_score,
        ":label": summary.risk_label,
        ":action": summary.recommendation_action,
        ":reclabel": summary.recommendation_label,
        ":flags": summary.flag_count,
      },
    })
  );

  if (plan.kind === "swapped") return jsonResponse(event, 200, { state: "ready" }, METHODS);

  try {
    await (deps.queueReview ?? queueReview)(id, plan.party);
  } catch (err) {
    const failed = { ...uiResult, review_status: { state: "failed", party: plan.party, message: "We couldn't start the new review." } };
    await db
      .send(new UpdateItemCommand({ TableName: process.env.RESULTS_TABLE, Key: { result_id: { S: id } }, UpdateExpression: "SET ui_result = :ui", ExpressionAttributeValues: { ":ui": { S: JSON.stringify(failed) } } }))
      .catch(() => {});
    console.error("switch side: queue failed", err);
    return jsonResponse(event, 500, { error: "We couldn't start the new review." }, METHODS);
  }
  return jsonResponse(event, 202, { state: "processing", party: plan.party }, METHODS);
};
