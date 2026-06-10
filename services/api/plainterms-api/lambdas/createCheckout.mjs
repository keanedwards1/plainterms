import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import Stripe from "stripe";
import { getStripeConfig } from "./lib/stripeConfig.mjs";
import { validateObjectKey, validateUploadMeta } from "./lib/uploadPolicy.mjs";
import { verifyPrecheckToken } from "./lib/precheckToken.mjs";
import { parseAnalysisSelection } from "./lib/analysisSelection.mjs";
import { formatSelectedAddonsCsv, parseAddonSelection } from "./lib/addonSelection.mjs";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { hashResultAccessKey, secureEqualStrings } from "./lib/resultAccessKey.mjs";
const METHODS = "POST,OPTIONS";
const db = new DynamoDBClient({});

function logServerError(eventName, message, fields = {}) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: eventName,
      message,
      ...fields,
    })
  );
}

function hasString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isExpired(item) {
  const nowEpoch = Math.floor(Date.now() / 1000);
  const expiresAt = Number(item?.expires_at?.N ?? "0");
  return Number.isFinite(expiresAt) && expiresAt > 0 && nowEpoch >= expiresAt;
}

async function verifyPreviewResultAccess(resultId, previewAccessKey) {
  const tableName = process.env.RESULTS_TABLE;
  if (!tableName) {
    return { ok: false, status: 500, error: "Missing required env var: RESULTS_TABLE" };
  }

  const normalizedId = String(resultId ?? "").trim();
  const normalizedKey = String(previewAccessKey ?? "").trim();
  if (!normalizedId || !normalizedKey) {
    return { ok: false, status: 400, error: "previewResultId and previewAccessKey are required." };
  }

  const res = await db.send(
    new GetItemCommand({
      TableName: tableName,
      Key: {
        result_id: { S: normalizedId },
      },
    })
  );

  if (!res.Item) {
    return { ok: false, status: 404, error: "Preview result not found." };
  }

  if ((res.Item.status?.S ?? "complete") !== "complete" || !res.Item.ui_result?.S) {
    return { ok: false, status: 409, error: "Preview result is not ready yet." };
  }

  if (isExpired(res.Item)) {
    return { ok: false, status: 410, error: "Preview result has expired. Please upload again." };
  }

  const expectedHash = res.Item.access_key_hash_preview?.S ?? "";
  const providedHash = hashResultAccessKey(normalizedKey);
  if (!expectedHash || !secureEqualStrings(providedHash, expectedHash)) {
    return { ok: false, status: 403, error: "Invalid preview access key." };
  }

  return { ok: true, resultId: normalizedId };
}

export const handler = async (event) => {
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;

  const parsedPayload = parseJsonBody(event, METHODS);
  if (!parsedPayload.ok) return parsedPayload.response;
  const payload = parsedPayload.payload;

  const objectKey = payload.objectKey;
  const filename = payload.filename;
  const contentType = payload.contentType;
  const size = payload.size;
  const precheckToken = payload.precheckToken;
  const previewResultId = payload.previewResultId;
  const previewAccessKey = payload.previewAccessKey;
  const isPreviewUnlock = hasString(previewResultId) || hasString(previewAccessKey);
  const selectionCheck = parseAnalysisSelection(payload);
  const addonCheck = parseAddonSelection(payload);

  if (isPreviewUnlock) {
    try {
      const previewCheck = await verifyPreviewResultAccess(previewResultId, previewAccessKey);
      if (!previewCheck.ok) {
        return jsonResponse(event, previewCheck.status, {
          error: previewCheck.error,
        }, METHODS);
      }

      if (!selectionCheck.ok) {
        return jsonResponse(event, 400, { error: selectionCheck.error }, METHODS);
      }

      const selectedTier = selectionCheck.selection.reportTier;
      if (selectedTier !== "report_69") {
        return jsonResponse(event, 400, {
          error: "Preview unlock currently supports the Report tier only.",
          code: "unsupported_preview_unlock_tier",
        }, METHODS);
      }

      const { stripeSecretKey, stripePriceIds } = await getStripeConfig();
      const selectedPriceId = stripePriceIds?.[selectedTier];
      if (!selectedPriceId) {
        return jsonResponse(event, 500, {
          error: `Missing Stripe price configuration for tier: ${selectedTier}`,
        }, METHODS);
      }

      const appBaseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
      if (!appBaseUrl) {
        return jsonResponse(event, 500, { error: "Missing required env var: APP_BASE_URL" }, METHODS);
      }

      const stripe = new Stripe(stripeSecretKey);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: selectedPriceId, quantity: 1 }],
        success_url: `${appBaseUrl}/analyze/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl}/preview/${encodeURIComponent(previewCheck.resultId)}?p=${encodeURIComponent(
          String(previewAccessKey).trim()
        )}&canceled=1`,
        metadata: {
          previewUnlock: "true",
          previewResultId: previewCheck.resultId,
          reportTier: selectedTier,
          selectedAddons: "",
        },
      });

      if (!session.url) {
        return jsonResponse(event, 500, { error: "Stripe session created without redirect URL" }, METHODS);
      }

      return jsonResponse(event, 200, {
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
      }, METHODS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logServerError("checkout.preview_create_error", message);
      return jsonResponse(event, 500, {
        error: "Checkout creation failed. Please try again.",
        code: "checkout_creation_failed",
      }, METHODS);
    }
  }

  if (!objectKey || !filename || !contentType || typeof size !== "number") {
    return jsonResponse(event, 400, {
      error: "objectKey, filename, contentType, and numeric size are required",
    }, METHODS);
  }

  if (!selectionCheck.ok) {
    return jsonResponse(event, 400, { error: selectionCheck.error }, METHODS);
  }
  if (!addonCheck.ok) {
    return jsonResponse(event, 400, { error: addonCheck.error }, METHODS);
  }

  if (typeof precheckToken !== "string" || !precheckToken.trim()) {
    return jsonResponse(event, 400, { error: "precheckToken is required." }, METHODS);
  }

  const uploadMeta = validateUploadMeta({
    filename,
    contentType,
    size,
    requireSize: true,
  });
  if (!uploadMeta.ok) {
    const status = uploadMeta.errorCode === "file_too_large" ? 413 : 400;
    return jsonResponse(event, status, { error: uploadMeta.error }, METHODS);
  }

  const objectKeyCheck = validateObjectKey(objectKey);
  if (!objectKeyCheck.ok) {
    return jsonResponse(event, 400, { error: objectKeyCheck.error }, METHODS);
  }

  try {
    const precheck = await verifyPrecheckToken(precheckToken);
    if (!precheck.ok) {
      return jsonResponse(event, 409, {
        error: "Precheck token is invalid or expired. Please re-upload your contract.",
        code: precheck.error,
      }, METHODS);
    }

    const tokenPayload = precheck.payload;
    const tokenMatchesUpload =
      tokenPayload.objectKey === objectKeyCheck.objectKey &&
      tokenPayload.filename === uploadMeta.filename &&
      tokenPayload.contentType === uploadMeta.contentType &&
      tokenPayload.size === size;

    if (!tokenMatchesUpload) {
      return jsonResponse(event, 409, {
        error: "Precheck does not match this file. Please upload and validate again.",
        code: "precheck_payload_mismatch",
      }, METHODS);
    }

    if (
      tokenPayload.scanPassed !== true ||
      tokenPayload.textExtractionPrecheckPassed !== true
    ) {
      return jsonResponse(event, 409, {
        error:
          "Precheck did not complete required safety/readability checks. Please upload and validate again.",
        code: "precheck_required_checks_not_passed",
      }, METHODS);
    }

    const { stripeSecretKey, stripePriceIds, stripeAddonPriceIds } = await getStripeConfig();
    const selectedTier = selectionCheck.selection.reportTier;
    const selectedPriceId = stripePriceIds?.[selectedTier];
    if (!selectedPriceId) {
      return jsonResponse(event, 500, {
        error: `Missing Stripe price configuration for tier: ${selectedTier}`,
      }, METHODS);
    }
    const selectedAddons = addonCheck.selection.selectedAddons;
    const addonLineItems = [];
    for (const addon of selectedAddons) {
      const addonPriceId = stripeAddonPriceIds?.[addon];
      if (!addonPriceId) {
        return jsonResponse(event, 400, {
          error: `Add-on "${addon}" is not available right now.`,
          code: "addon_not_configured",
        }, METHODS);
      }
      addonLineItems.push({ price: addonPriceId, quantity: 1 });
    }

    const appBaseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
    if (!appBaseUrl) {
      return jsonResponse(event, 500, { error: "Missing required env var: APP_BASE_URL" }, METHODS);
    }

    const stripe = new Stripe(stripeSecretKey);
    const selection = selectionCheck.selection;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: selectedPriceId, quantity: 1 }, ...addonLineItems],
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
        selectedAddons: formatSelectedAddonsCsv(selectedAddons),
        ...(selection.analysisMode ? { analysisMode: selection.analysisMode } : {}),
        ...(selection.llmModel ? { llmModel: selection.llmModel } : {}),
      },
    });

    if (!session.url) {
      return jsonResponse(event, 500, { error: "Stripe session created without redirect URL" }, METHODS);
    }

    return jsonResponse(event, 200, {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    }, METHODS);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logServerError("checkout.create_error", message);
    return jsonResponse(event, 500, {
      error: "Checkout creation failed. Please try again.",
      code: "checkout_creation_failed",
    }, METHODS);
  }
};
