import Stripe from "stripe";
import { runAnalysis } from "./lib/runAnalysis.mjs";
import { getStripeConfig } from "./lib/stripeConfig.mjs";
import { parseAnalysisSelection } from "./lib/analysisSelection.mjs";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST,OPTIONS",
  };
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { ...corsHeaders(), "content-type": "application/json" },
    body: JSON.stringify(bodyObj),
  };
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
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const sessionId = payload.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return json(400, { error: "sessionId is required" });
  }

  try {
    const { stripeSecretKey } = await getStripeConfig();
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return json(404, { error: "Checkout session not found" });
    }

    if (session.payment_status !== "paid") {
      return json(409, {
        error: "Checkout session is not paid",
        payment_status: session.payment_status,
      });
    }

    const existingResultId = session.metadata?.resultId;
    if (existingResultId) {
      return json(200, { resultId: existingResultId, reused: true });
    }

    if (session.metadata?.refundId) {
      return json(409, {
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
    });
    const analysisSelection = selectionCheck.ok
      ? selectionCheck.selection
      : { analysisMode: null, llmModel: null };

    if (!objectKey || !filename || !contentType || !Number.isFinite(size)) {
      return json(500, { error: "Checkout session metadata missing contract upload fields" });
    }

    let resultId;
    try {
      const analysis = await runAnalysis({
        objectKey,
        filename,
        contentType,
        size,
      }, analysisSelection);
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

      return json(500, {
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

    return json(200, { resultId, reused: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: `Checkout verification failed: ${message}` });
  }
};
