import { refineStoredAnalysis } from "./lib/runAnalysis.mjs";

// Async worker invoked by POST /analyze. Replaces the instant rules result
// with the plan's AI analysis. Safe to retry: refineStoredAnalysis only acts
// while the stored status is still "refining".
export const handler = async (event) => {
  const resultId = typeof event?.resultId === "string" ? event.resultId.trim() : "";
  if (!resultId) return { ok: false, reason: "missing_result_id" };
  const outcome = await refineStoredAnalysis(resultId);
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: "refine.done", ...outcome }));
  return outcome;
};
