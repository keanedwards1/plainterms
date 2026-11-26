import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { generateReviewExtras } from "./lib/llmReview.mjs";
import { documentSummaryAttributes } from "./lib/runAnalysis.mjs";
import { modelForPlan, normalizePlan } from "./lib/plans.mjs";
import { updateUiResult } from "./lib/updateUiResult.mjs";

const db = new DynamoDBClient({});

function log(event, fields) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

/**
 * Background worker, queued once the core review is on screen: writes the review's negotiation extras
 * (asks, fallbacks, redlines, checklist, dates, what-ifs). One AI call; the classic page keeps the rules result.
 */
export const handler = async (event, _context, deps = {}) => {
  const resultId = typeof event?.resultId === "string" ? event.resultId.trim() : "";
  if (!resultId) return { ok: false, reason: "missing_result_id" };

  const record = await db.send(
    new GetItemCommand({ TableName: process.env.RESULTS_TABLE, Key: { result_id: { S: resultId } }, ConsistentRead: true })
  );
  const item = record?.Item;
  if (!item) return { ok: false, reason: "not_found" };
  let uiResult;
  try {
    uiResult = JSON.parse(item.ui_result?.S ?? "");
  } catch {
    return { ok: false, reason: "invalid_ui_result" };
  }

  const plan = normalizePlan(item.plan?.S);
  const started = Date.now();
  const extractedText = typeof event.extractedText === "string" ? event.extractedText : uiResult?.document?.extracted_text ?? "";

  const extrasJob = uiResult.review
    ? (deps.generateReviewExtras ?? generateReviewExtras)({ extractedText, review: uiResult.review, llmModel: modelForPlan(plan) })
        .then((out) => ({ ...out, ms: Date.now() - started }))
    : Promise.resolve({ ok: false, reason: "no_review", ms: 0 });
  // The classic page keeps the instant rules result; it no longer gets its own AI pass.
  const [extras] = await Promise.allSettled([extrasJob]);
  const extrasOut = extras.status === "fulfilled" ? extras.value : { ok: false, reason: String(extras.reason?.message ?? extras.reason) };
  log("enrich.timing", {
    resultId,
    extras_ms: extrasOut.ms ?? null,
    extras: extrasOut.ok ? "ok" : String(extrasOut.reason).slice(0, 200),
  });

  const written = await (deps.updateUiResult ?? updateUiResult)(
    resultId,
    (current) => {
      let next = { ...current };
      if (current.review) {
        next = { ...next, review: extrasOut.ok ? extrasOut.review : { ...current.review, extras_status: "failed" } };
      }
      return next;
    },
    {
      extra: (next) => {
        const summary = documentSummaryAttributes(next);
        const set = ["risk_score = :score", "risk_label = :label", "recommendation_action = :action", "recommendation_label = :reclabel", "flag_count = :flags"];
        const values = {
          ":score": summary.risk_score,
          ":label": summary.risk_label,
          ":action": summary.recommendation_action,
          ":reclabel": summary.recommendation_label,
          ":flags": summary.flag_count,
        };
        return { set, values };
      },
    }
  );

  return { ok: true, reason: "enriched", extras: extrasOut.ok, written: Boolean(written) };
};
