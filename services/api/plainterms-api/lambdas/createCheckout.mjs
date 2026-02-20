import Stripe from "stripe";
import { getStripeConfig } from "./lib/stripeConfig.mjs";
import { validateObjectKey, validateUploadMeta } from "./lib/uploadPolicy.mjs";
import { verifyPrecheckToken } from "./lib/precheckToken.mjs";
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

  const objectKey = payload.objectKey;
  const filename = payload.filename;
  const contentType = payload.contentType;
  const size = payload.size;
  const precheckToken = payload.precheckToken;
  const selectionCheck = parseAnalysisSelection(payload);

  if (!objectKey || !filename || !contentType || typeof size !== "number") {
    return json(event, 400, {
      error: "objectKey, filename, contentType, and numeric size are required",
    });
  }

  if (!selectionCheck.ok) {
    return json(event, 400, { error: selectionCheck.error });
  }

  if (typeof precheckToken !== "string" || !precheckToken.trim()) {
    return json(event, 400, { error: "precheckToken is required." });
  }

  const uploadMeta = validateUploadMeta({
    filename,
    contentType,
    size,
    requireSize: true,
  });
  if (!uploadMeta.ok) {
    const status = uploadMeta.errorCode === "file_too_large" ? 413 : 400;
    return json(event, status, { error: uploadMeta.error });
  }

  const objectKeyCheck = validateObjectKey(objectKey);
  if (!objectKeyCheck.ok) {
    return json(event, 400, { error: objectKeyCheck.error });
  }

  try {
    const precheck = await verifyPrecheckToken(precheckToken);
    if (!precheck.ok) {
      return json(event, 409, {
        error: "Precheck token is invalid or expired. Please re-upload your contract.",
        code: precheck.error,
      });
    }

    const tokenPayload = precheck.payload;
    const tokenMatchesUpload =
      tokenPayload.objectKey === objectKeyCheck.objectKey &&
      tokenPayload.filename === uploadMeta.filename &&
      tokenPayload.contentType === uploadMeta.contentType &&
      tokenPayload.size === size;

    if (!tokenMatchesUpload) {
      return json(event, 409, {
        error: "Precheck does not match this file. Please upload and validate again.",
        code: "precheck_payload_mismatch",
      });
    }

    if (
      tokenPayload.scanPassed !== true ||
      tokenPayload.textExtractionPrecheckPassed !== true
    ) {
      return json(event, 409, {
        error:
          "Precheck did not complete required safety/readability checks. Please upload and validate again.",
        code: "precheck_required_checks_not_passed",
      });
    }

    const { stripeSecretKey, stripePriceIds } = await getStripeConfig();
    const selectedTier = selectionCheck.selection.reportTier;
    const selectedPriceId = stripePriceIds?.[selectedTier];
    if (!selectedPriceId) {
      return json(event, 500, {
        error: `Missing Stripe price configuration for tier: ${selectedTier}`,
      });
    }
    const appBaseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
    if (!appBaseUrl) {
      return json(event, 500, { error: "Missing required env var: APP_BASE_URL" });
    }

    const stripe = new Stripe(stripeSecretKey);
    const selection = selectionCheck.selection;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      success_url: `${appBaseUrl}/analyze/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/analyze?canceled=1`,
      metadata: {
        objectKey: objectKeyCheck.objectKey,
        filename: uploadMeta.filename,
        contentType: uploadMeta.contentType,
        size: String(size),
        precheckValidated: "true",
        scanPassed: "true",
        textExtractionPrecheckPassed: "true",
        reportTier: selectedTier,
        ...(selection.analysisMode ? { analysisMode: selection.analysisMode } : {}),
        ...(selection.llmModel ? { llmModel: selection.llmModel } : {}),
      },
    });

    if (!session.url) {
      return json(event, 500, { error: "Stripe session created without redirect URL" });
    }

    return json(event, 200, {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(event, 500, { error: `Checkout creation failed: ${message}` });
  }
};
