import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import crypto from "node:crypto";
import Stripe from "stripe";
import { applyTierToReport, runAnalysis } from "./lib/runAnalysis.mjs";
import { getStripeSecretKey } from "./lib/stripeConfig.mjs";
import { parseAnalysisSelection } from "./lib/analysisSelection.mjs";
import { parseSelectedAddonsCsv } from "./lib/addonSelection.mjs";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { createResultAccessKey, hashResultAccessKey } from "./lib/resultAccessKey.mjs";

const db = new DynamoDBClient({});
const METHODS = "POST,OPTIONS";

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

function getAnalysisTimeoutMs() {
  const raw = Number(process.env.ANALYSIS_TIMEOUT_MS ?? 5 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 60 * 1000;
  return Math.floor(raw);
}

function getVerifyWaitTimeoutMs() {
  const raw = Number(process.env.CHECKOUT_VERIFY_WAIT_TIMEOUT_MS ?? 45 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 45 * 1000;
  return Math.floor(raw);
}

function getVerifyPollIntervalMs() {
  const raw = Number(process.env.CHECKOUT_VERIFY_POLL_MS ?? 1500);
  if (!Number.isFinite(raw) || raw < 250) return 1500;
  return Math.floor(raw);
}

function getAnalysisLockStaleMs() {
  const raw = Number(process.env.CHECKOUT_VERIFY_LOCK_STALE_MS ?? getAnalysisTimeoutMs() + 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return getAnalysisTimeoutMs() + 60 * 1000;
  return Math.floor(raw);
}

function parseIsoMs(value) {
  if (typeof value !== "string" || !value.trim()) return NaN;
  return Date.parse(value);
}

function isAnalysisLockStale(metadata = {}) {
  const startedAtMs = parseIsoMs(metadata.analysisStartedAt);
  if (!Number.isFinite(startedAtMs)) return true;
  return Date.now() - startedAtMs > getAnalysisLockStaleMs();
}

function isAnalysisInProgress(metadata = {}) {
  return metadata.analysisStatus === "processing" && !isAnalysisLockStale(metadata);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSessionStateChange(stripe, sessionId) {
  const deadline = Date.now() + getVerifyWaitTimeoutMs();
  let latest = null;

  while (Date.now() < deadline) {
    await sleep(getVerifyPollIntervalMs());
    latest = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = latest?.metadata ?? {};

    if (metadata.resultId || metadata.refundId) return latest;
    if (metadata.analysisStatus !== "processing") return latest;
    if (isAnalysisLockStale(metadata)) return latest;
  }

  return latest;
}

async function runAnalysisWithTimeout(args, analysisSelection, addonSelection) {
  const timeoutMs = getAnalysisTimeoutMs();
  let timer = null;
  try {
    return await Promise.race([
      runAnalysis(args, analysisSelection, addonSelection),
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

async function issueResultAccessKeyForResult(resultId) {
  const tableName = process.env.RESULTS_TABLE;
  if (!tableName) {
    throw new Error("Missing required env var: RESULTS_TABLE");
  }

  const accessKey = createResultAccessKey();
  const accessKeyHash = hashResultAccessKey(accessKey);
  await db.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: {
        result_id: { S: String(resultId) },
      },
      ConditionExpression: "attribute_exists(result_id)",
      UpdateExpression:
        "SET access_key_hash_previous = if_not_exists(access_key_hash, :empty), access_key_hash = :hash, access_key_rotated_at = :rotatedAt",
      ExpressionAttributeValues: {
        ":empty": { S: "" },
        ":hash": { S: accessKeyHash },
        ":rotatedAt": { S: new Date().toISOString() },
      },
    })
  );

  return accessKey;
}

async function applyPurchasedTierToStoredResult(resultId, selectedTier) {
  const tableName = process.env.RESULTS_TABLE;
  if (!tableName) {
    throw new Error("Missing required env var: RESULTS_TABLE");
  }

  const res = await db.send(
    new GetItemCommand({
      TableName: tableName,
      Key: {
        result_id: { S: String(resultId) },
      },
    })
  );

  if (!res.Item?.ui_result?.S) return;

  let uiResult;
  try {
    uiResult = JSON.parse(res.Item.ui_result.S);
  } catch {
    return;
  }

  const currentReport = uiResult?.report;
  if (!currentReport) return;

  const tieredReport = applyTierToReport(currentReport, selectedTier);
  const nextUiResult = {
    ...uiResult,
    report: tieredReport,
  };

  await db.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: {
        result_id: { S: String(resultId) },
      },
      UpdateExpression: "SET ui_result = :ui, purchased_report_tier = :tier",
      ExpressionAttributeValues: {
        ":ui": { S: JSON.stringify(nextUiResult) },
        ":tier": { S: selectedTier },
      },
    })
  );
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

async function issueAccessForResultAndScrubSession({
  stripe,
  sessionId,
  session,
  reused,
}) {
  const resultId = session?.metadata?.resultId;
  if (!resultId) {
    throw new Error("Missing resultId in session metadata.");
  }

  const selectionCheck = parseAnalysisSelection({
    reportTier: session?.metadata?.reportTier,
  });
  if (selectionCheck.ok && selectionCheck.selection.reportTier) {
    await applyPurchasedTierToStoredResult(resultId, selectionCheck.selection.reportTier);
  }
  const rotatedAccessKey = await issueResultAccessKeyForResult(resultId);
  await safeUpdateSessionMetadata(stripe, sessionId, {
    ...(session.metadata ?? {}),
    resultId: String(resultId),
    resultAccessKey: "",
    analysisStatus: "complete",
    analysisOwner: "",
  });

  return {
    resultId,
    accessKey: rotatedAccessKey,
    reused,
  };
}

async function issueAccessForPreviewUnlockAndScrubSession({ stripe, sessionId, session }) {
  const resultId = session?.metadata?.previewResultId;
  if (!resultId) {
    throw new Error("Missing previewResultId in session metadata.");
  }

  const selectionCheck = parseAnalysisSelection({
    reportTier: session?.metadata?.reportTier,
  });
  const selectedTier = selectionCheck.ok ? selectionCheck.selection.reportTier : "report_69";
  await applyPurchasedTierToStoredResult(resultId, selectedTier);
  const rotatedAccessKey = await issueResultAccessKeyForResult(resultId);
  await safeUpdateSessionMetadata(stripe, sessionId, {
    ...(session.metadata ?? {}),
    resultId: String(resultId),
    previewResultId: "",
    previewUnlock: "complete",
    resultAccessKey: "",
    reportTier: selectedTier,
    analysisStatus: "complete",
    analysisOwner: "",
    analysisCompletedAt: new Date().toISOString(),
  });

  return {
    resultId,
    accessKey: rotatedAccessKey,
    reused: true,
  };
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
      resultAccessKey: "",
      analysisStatus: "failed",
      analysisOwner: "",
      analysisCompletedAt: new Date().toISOString(),
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
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;
  const parsedPayload = parseJsonBody(event, METHODS);
  if (!parsedPayload.ok) return parsedPayload.response;
  const payload = parsedPayload.payload;

  const sessionId = payload.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return jsonResponse(event, 400, { error: "sessionId is required" });
  }

  try {
    const stripeSecretKey = await getStripeSecretKey();
    const stripe = new Stripe(stripeSecretKey);

    let session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return jsonResponse(event, 404, { error: "Checkout session not found" });
    }

    if (session.payment_status !== "paid") {
      return jsonResponse(event, 409, {
        error: "Checkout session is not paid",
        payment_status: session.payment_status,
      });
    }

    if (session.metadata?.resultId) {
      const response = await issueAccessForResultAndScrubSession({
        stripe,
        sessionId,
        session,
        reused: true,
      });
      return jsonResponse(event, 200, response);
    }

    if (session.metadata?.previewUnlock === "true" && session.metadata?.previewResultId) {
      const response = await issueAccessForPreviewUnlockAndScrubSession({
        stripe,
        sessionId,
        session,
      });
      return jsonResponse(event, 200, response);
    }

    if (session.metadata?.refundId) {
      return jsonResponse(event, 409, {
        error:
          "Analysis previously failed and this payment was already refunded. Please retry from upload.",
        refunded: true,
        refundId: session.metadata.refundId,
      });
    }

    if (isAnalysisInProgress(session.metadata ?? {})) {
      const waited = await waitForSessionStateChange(stripe, sessionId);
      if (waited) {
        session = waited;
      }

      if (session.metadata?.resultId) {
        const response = await issueAccessForResultAndScrubSession({
          stripe,
          sessionId,
          session,
          reused: true,
        });
        return jsonResponse(event, 200, response);
      }

      if (session.metadata?.refundId) {
        return jsonResponse(event, 409, {
          error:
            "Analysis previously failed and this payment was already refunded. Please retry from upload.",
          refunded: true,
          refundId: session.metadata.refundId,
        });
      }

      if (isAnalysisInProgress(session.metadata ?? {})) {
        return jsonResponse(event, 409, {
          error:
            "Analysis is already in progress for this checkout session. Please retry in a moment.",
          code: "analysis_in_progress",
        });
      }
    }

    const analysisOwner = crypto.randomUUID();
    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...(session.metadata ?? {}),
        analysisStatus: "processing",
        analysisOwner,
        analysisStartedAt: new Date().toISOString(),
        resultAccessKey: "",
      },
    });

    session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.resultId) {
      const response = await issueAccessForResultAndScrubSession({
        stripe,
        sessionId,
        session,
        reused: true,
      });
      return jsonResponse(event, 200, response);
    }

    if (session.metadata?.refundId) {
      return jsonResponse(event, 409, {
        error:
          "Analysis previously failed and this payment was already refunded. Please retry from upload.",
        refunded: true,
        refundId: session.metadata.refundId,
      });
    }

    const ownsAnalysis =
      session.metadata?.analysisStatus === "processing" &&
      session.metadata?.analysisOwner === analysisOwner;

    if (!ownsAnalysis) {
      const waited = await waitForSessionStateChange(stripe, sessionId);
      if (waited?.metadata?.resultId) {
        const response = await issueAccessForResultAndScrubSession({
          stripe,
          sessionId,
          session: waited,
          reused: true,
        });
        return jsonResponse(event, 200, response);
      }

      if (waited?.metadata?.refundId) {
        return jsonResponse(event, 409, {
          error:
            "Analysis previously failed and this payment was already refunded. Please retry from upload.",
          refunded: true,
          refundId: waited.metadata.refundId,
        });
      }

      return jsonResponse(event, 409, {
        error: "Analysis is already in progress for this checkout session. Please retry shortly.",
        code: "analysis_in_progress",
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
    const selectedAddons = parseSelectedAddonsCsv(session.metadata?.selectedAddons);

    if (!objectKey || !filename || !contentType || !Number.isFinite(size)) {
      return jsonResponse(event, 500, {
        error: "Checkout session metadata missing contract upload fields",
      });
    }

    let resultId;
    let resultAccessKey;
    try {
      const analysis = await runAnalysisWithTimeout(
        {
          objectKey,
          filename,
          contentType,
          size,
        },
        analysisSelection,
        { selectedAddons }
      );
      resultId = analysis.resultId;
      resultAccessKey = analysis.accessKey;
      if (!resultAccessKey) {
        throw new Error("Analysis completed without access key.");
      }
    } catch (analysisErr) {
      const analysisMessage =
        analysisErr instanceof Error ? analysisErr.message : "Unknown analysis error";
      const refund = await attemptAutoRefund({
        stripe,
        sessionId,
        session,
        analysisMessage,
      });
      await safeUpdateSessionMetadata(stripe, sessionId, {
        ...(session.metadata ?? {}),
        analysisError: analysisMessage.slice(0, 200),
        resultAccessKey: "",
        analysisStatus: "failed",
        analysisOwner: "",
        analysisCompletedAt: new Date().toISOString(),
      });
      logServerError("checkout.verify.analysis_failed_after_payment", analysisMessage, {
        sessionId,
        refunded: refund.refunded,
        refundId: refund.refundId,
        refundStatus: refund.refundStatus,
        refundReason: refund.reason,
      });

      return jsonResponse(event, 500, {
        error:
          "Analysis failed after payment. Support has been notified and your refund status is included below.",
        code: "analysis_failed_after_payment",
        refunded: refund.refunded,
        refundId: refund.refundId,
        refundStatus: refund.refundStatus,
      });
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...(session.metadata ?? {}),
        resultId: String(resultId),
        resultAccessKey: "",
        analysisStatus: "complete",
        analysisOwner: "",
        analysisCompletedAt: new Date().toISOString(),
      },
    });

    return jsonResponse(event, 200, {
      resultId,
      accessKey: resultAccessKey,
      reused: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logServerError("checkout.verify_unhandled_error", message, { sessionId });
    return jsonResponse(event, 500, {
      error: "Checkout verification failed. Please retry shortly.",
      code: "checkout_verification_failed",
    });
  }
};
