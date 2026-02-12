import Stripe from "stripe";
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

  const objectKey = payload.objectKey;
  const filename = payload.filename;
  const contentType = payload.contentType;
  const size = payload.size;

  if (!objectKey || !filename || !contentType || typeof size !== "number") {
    return json(400, {
      error: "objectKey, filename, contentType, and numeric size are required",
    });
  }

  try {
    const { stripeSecretKey, stripePriceId } = await getStripeConfig();
    if (!stripePriceId) {
      return json(500, { error: "Missing Stripe price configuration." });
    }
    const appBaseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
    if (!appBaseUrl) {
      return json(500, { error: "Missing required env var: APP_BASE_URL" });
    }

    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appBaseUrl}/analyze/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/analyze?canceled=1`,
      metadata: {
        objectKey: String(objectKey),
        filename: String(filename),
        contentType: String(contentType),
        size: String(size),
      },
    });

    if (!session.url) {
      return json(500, { error: "Stripe session created without redirect URL" });
    }

    return json(200, {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: `Checkout creation failed: ${message}` });
  }
};
