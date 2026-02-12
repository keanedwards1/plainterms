import Stripe from "stripe";
import { runAnalysis } from "./lib/runAnalysis.mjs";
import { getStripeConfig } from "./lib/stripeConfig.mjs";

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

    const objectKey = session.metadata?.objectKey;
    const filename = session.metadata?.filename;
    const contentType = session.metadata?.contentType;
    const sizeRaw = session.metadata?.size;
    const size = Number(sizeRaw);

    if (!objectKey || !filename || !contentType || !Number.isFinite(size)) {
      return json(500, { error: "Checkout session metadata missing contract upload fields" });
    }

    const { resultId } = await runAnalysis({
      objectKey,
      filename,
      contentType,
      size,
    });

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
