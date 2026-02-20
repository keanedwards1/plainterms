import Stripe from "stripe";
import { runAnalysis } from "./lib/runAnalysis.mjs";
import { getStripeSecretKey } from "./lib/stripeConfig.mjs";
import { parseAnalysisSelection } from "./lib/analysisSelection.mjs";
import { corsHeaders } from "./lib/cors.mjs";

function json(event, statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event, "POST,OPTIONS"),
      "content-type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}

function getAnalysisTimeoutMs() {
  const raw = Number(process.env.ANALYSIS_TIMEOUT_MS ?? 5 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 60 * 1000;
  return Math.floor(raw);
}

async function runAnalysisWithTimeout(args, analysisSelection) {
  const timeoutMs = getAnalysisTimeoutMs();
  let timer = null;
  try {
    return await Promise.race([
      runAnalysis(args, analysisSelection),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(`Analysis timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function paymentIntentIdFromSession(session) {
  const value = session?.payment_intent;
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.id) return value.id;
  return null;
}

async function safeUpdateSessionMetadata(stripe, sessionId, metadataPatch) {
  try {
    await stripe.checkout.sessions.update(sessionId, {
      metadata: metadataPatch,
    });
  } catch {
    // Best effort only.
  }
}

async function attemptAutoRefund({ stripe, sessionId, session, analysisMessage }) {
  const existingRefundId = session.metadata?.refundId;
  if (existingRefundId) {
    return {
      refunded: true,
      refundId: existingRefundId,
      reason: "already_refunded",
    };
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  if (!paymentIntentId) {
    return {
      refunded: false,
      reason: "missing_payment_intent",
      detail:
        "Payment succeeded but no payment intent was attached. Manual refund may be required.",
    };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        source: "plainterms_auto_refund",
        checkoutSessionId: sessionId,
        cause: "analysis_failure",
      },
    });

    await safeUpdateSessionMetadata(stripe, sessionId, {
      ...(session.metadata ?? {}),
      analysisError: analysisMessage.slice(0, 200),
      refundId: refund.id,
      refundStatus: refund.status ?? "pending",
    });

    return {
      refunded: true,
      refundId: refund.id,
      refundStatus: refund.status ?? "pending",
      reason: "refunded",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      refunded: false,
      reason: "refund_failed",
      detail: `Automatic refund failed: ${message}`,
    };
  }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(event, "POST,OPTIONS"), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(event, 405, { error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(event, 400, { error: "Invalid JSON body" });
  }

  const sessionId = payload.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return json(event, 400, { error: "sessionId is required" });
  }

  try {
    const stripeSecretKey = await getStripeSecretKey();
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return json(event, 404, { error: "Checkout session not found" });
    }

    if (session.payment_status !== "paid") {
      return json(event, 409, {
        error: "Checkout session is not paid",
        payment_status: session.payment_status,
      });
    }

    const existingResultId = session.metadata?.resultId;
    if (existingResultId) {
      return json(event, 200, { resultId: existingResultId, reused: true });
    }

    if (session.metadata?.refundId) {
      return json(event, 409, {
        error:
          "Analysis previously failed and this payment was already refunded. Please retry from upload.",
        refunded: true,
        refundId: session.metadata.refundId,
      });
    }

    const objectKey = session.metadata?.objectKey;
    const filename = session.metadata?.filename;
    const contentType = session.metadata?.contentType;
    const sizeRaw = session.metadata?.size;
    const size = Number(sizeRaw);
    const selectionCheck = parseAnalysisSelection({
      analysisMode: session.metadata?.analysisMode,
      llmModel: session.metadata?.llmModel,
      reportTier: session.metadata?.reportTier,
    });
    const analysisSelection = selectionCheck.ok
      ? selectionCheck.selection
      : { analysisMode: null, llmModel: null, reportTier: "report_69" };

    if (!objectKey || !filename || !contentType || !Number.isFinite(size)) {
      return json(event, 500, {
        error: "Checkout session metadata missing contract upload fields",
      });
    }

    let resultId;
    try {
      const analysis = await runAnalysisWithTimeout(
        {
          objectKey,
          filename,
          contentType,
          size,
        },
        analysisSelection
      );
      resultId = analysis.resultId;
    } catch (analysisErr) {
      const analysisMessage =
        analysisErr instanceof Error ? analysisErr.message : "Unknown analysis error";
      const refund = await attemptAutoRefund({
        stripe,
        sessionId,
        session,
        analysisMessage,
      });

      return json(event, 500, {
        error: `Analysis failed after payment: ${analysisMessage}`,
        refunded: refund.refunded,
        refundId: refund.refundId,
        refundStatus: refund.refundStatus,
        detail: refund.detail,
      });
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...(session.metadata ?? {}),
        resultId: String(resultId),
      },
    });

    return json(event, 200, { resultId, reused: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(event, 500, { error: `Checkout verification failed: ${message}` });
  }
};
