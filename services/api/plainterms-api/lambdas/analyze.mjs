import { runAnalysis } from "./lib/runAnalysis.mjs";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { requireUser } from "./lib/auth.mjs";
import { ensureUser } from "./lib/users.mjs";
import { monthlyDocumentLimit } from "./lib/plans.mjs";
import {
  consumePrecheckToken,
  releaseDocument,
  releasePrecheckToken,
  reserveDocument,
} from "./lib/usage.mjs";
import { checkPrecheckedUpload } from "./lib/precheckGate.mjs";

const METHODS = "POST,OPTIONS";

function log(level, event, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

function refineWorkerName() {
  return String(process.env.REFINE_ANALYSIS_FUNCTION_NAME ?? "").trim();
}

async function queueRefine(resultId) {
  const workerName = refineWorkerName();
  if (!workerName) return false;
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  await new LambdaClient({}).send(
    new InvokeCommand({
      FunctionName: workerName,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ resultId })),
    })
  );
  return true;
}

/**
 * POST /analyze — signed-in analysis.
 *
 * 1. Verify the WorkOS token and load (or create) the user.
 * 2. Check the upload against its precheck token, and spend the token so one
 *    upload starts one analysis.
 * 3. Count the document against the plan's monthly limit (atomic in DynamoDB).
 * 4. Store an instant rules-engine result, then hand the AI pass to the refine
 *    worker so the user sees a first answer in seconds.
 */
export const handler = async (event, _context, deps = {}) => {
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;

  const auth = await (deps.requireUser ?? requireUser)(event);
  if (!auth.ok) return jsonResponse(event, auth.status, { error: auth.error }, METHODS);

  const parsed = parseJsonBody(event, METHODS);
  if (!parsed.ok) return parsed.response;

  const gate = await checkPrecheckedUpload(parsed.payload);
  if (!gate.ok) return jsonResponse(event, gate.status, gate.body, METHODS);

  const { userId, email } = auth.user;
  let reserved = false;
  let tokenSpent = false;
  try {
    const user = await ensureUser(userId, email);

    const fresh = await consumePrecheckToken(parsed.payload.precheckToken, gate.tokenPayload.exp);
    if (!fresh) {
      return jsonResponse(event, 409, {
        error: "This upload was already analyzed. Open it from your documents, or add the file again.",
        code: "precheck_token_used",
      }, METHODS);
    }
    tokenSpent = true;

    const quota = await reserveDocument(userId, monthlyDocumentLimit(user.plan));
    if (!quota.ok) {
      await releasePrecheckToken(parsed.payload.precheckToken);
      log("info", "analyze.monthly_limit_reached", { plan: user.plan });
      return jsonResponse(event, 429, {
        error: "You've reached this month's document limit.",
        code: "monthly_limit_reached",
        plan: user.plan,
      }, METHODS);
    }
    reserved = true;

    const result = await runAnalysis(gate.upload, {}, { selectedAddons: [] }, {
      plan: user.plan,
      ownerUserId: userId,
      rulesOnly: true,
    });

    let status = result.status;
    try {
      const queued = await queueRefine(result.resultId);
      if (!queued) status = "complete";
    } catch (err) {
      log("error", "analyze.refine_queue_failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return jsonResponse(event, 200, {
      resultId: result.resultId,
      accessKey: result.accessKey,
      status,
      plan: user.plan,
    }, METHODS);
  } catch (err) {
    if (reserved) await releaseDocument(userId);
    if (tokenSpent) await releasePrecheckToken(parsed.payload.precheckToken);
    log("error", "analyze.failed", { message: err instanceof Error ? err.message : String(err) });
    return jsonResponse(event, 500, {
      error: "We couldn't analyze this document. Please try again.",
      code: "analysis_failed",
    }, METHODS);
  }
};
