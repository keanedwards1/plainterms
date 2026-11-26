import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { generateContractReview } from "./lib/llmReview.mjs";
import { applyNewSideReview } from "./lib/reviewSide.mjs";
import { modelForPlan, normalizePlan } from "./lib/plans.mjs";
import { documentSummaryAttributes } from "./lib/runAnalysis.mjs";

const db = new DynamoDBClient({});

async function save(resultId, uiResult, withSummary = false) {
  const summary = withSummary ? documentSummaryAttributes(uiResult) : null;
  await db.send(
    new UpdateItemCommand({
      TableName: process.env.RESULTS_TABLE,
      Key: { result_id: { S: resultId } },
      UpdateExpression: summary
        ? "SET ui_result = :ui, risk_score = :score, risk_label = :label, recommendation_action = :action, recommendation_label = :reclabel, flag_count = :flags"
        : "SET ui_result = :ui",
      ExpressionAttributeValues: {
        ":ui": { S: JSON.stringify(uiResult) },
        ...(summary
          ? {
              ":score": summary.risk_score,
              ":label": summary.risk_label,
              ":action": summary.recommendation_action,
              ":reclabel": summary.recommendation_label,
              ":flags": summary.flag_count,
            }
          : {}),
      },
    })
  );
}

async function queueRevision(resultId) {
  const name = process.env.DOCUMENT_REVISION_FUNCTION_NAME;
  if (!name) return false;
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  await new LambdaClient({}).send(
    new InvokeCommand({ FunctionName: name, InvocationType: "Event", Payload: Buffer.from(JSON.stringify({ resultId })) })
  );
  return true;
}

/** Worker: writes a review for the side the user picked, then restarts the revised draft (Pro). */
export const handler = async (event) => {
  const resultId = typeof event?.resultId === "string" ? event.resultId.trim() : "";
  const party = typeof event?.party === "string" ? event.party.trim() : "";
  if (!resultId || !party) return { ok: false, reason: "invalid_event" };

  const record = await db.send(new GetItemCommand({ TableName: process.env.RESULTS_TABLE, Key: { result_id: { S: resultId } }, ConsistentRead: true }));
  const item = record?.Item;
  if (!item) return { ok: false, reason: "not_found" };
  let uiResult;
  try {
    uiResult = JSON.parse(item.ui_result?.S ?? "");
  } catch {
    return { ok: false, reason: "invalid_ui_result" };
  }

  const plan = normalizePlan(item.plan?.S);
  try {
    const outcome = await generateContractReview({
      extractedText: uiResult?.document?.extracted_text ?? "",
      analysisMode: "llm",
      llmModel: modelForPlan(plan),
      party,
    });
    if (!outcome.ok || !outcome.review) throw new Error(outcome.reason || "review_failed");

    const isPro = plan === "pro";
    const next = applyNewSideReview(uiResult, outcome.review, isPro ? { revision: { status: "processing" } } : {});
    await save(resultId, next, true);
    if (isPro) {
      try {
        await queueRevision(resultId);
      } catch (err) {
        console.error("generate review: revision queue failed", err);
      }
    }
    return { ok: true, reason: "ready" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate review failed", { resultId, message: message.slice(0, 300) });
    await save(resultId, { ...uiResult, review_status: { state: "failed", party, message: "We couldn't review it from that side. Try again." } });
    return { ok: false, reason: "generation_failed" };
  }
};
