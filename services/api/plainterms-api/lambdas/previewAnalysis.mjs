import { runAnalysis } from "./lib/runAnalysis.mjs";
import { parseAnalysisSelection } from "./lib/analysisSelection.mjs";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { verifyPrecheckToken } from "./lib/precheckToken.mjs";
import { validateObjectKey, validateUploadMeta } from "./lib/uploadPolicy.mjs";

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

async function runAnalysisWithTimeout(args, analysisSelection) {
  const timeoutMs = getAnalysisTimeoutMs();
  let timer = null;
  try {
    return await Promise.race([
      runAnalysis(args, analysisSelection, { selectedAddons: [] }, { deferPaidArtifacts: true }),
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
  const selectionCheck = parseAnalysisSelection({
    analysisMode: payload.analysisMode,
    llmModel: payload.llmModel,
    reportTier: "report_69",
  });

  if (!objectKey || !filename || !contentType || typeof size !== "number") {
    return jsonResponse(event, 400, {
      error: "objectKey, filename, contentType, and numeric size are required",
    }, METHODS);
  }

  if (!selectionCheck.ok) {
    return jsonResponse(event, 400, { error: selectionCheck.error }, METHODS);
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

    const analysis = await runAnalysisWithTimeout(
      {
        objectKey: objectKeyCheck.objectKey,
        filename: uploadMeta.filename,
        contentType: uploadMeta.contentType,
        size,
      },
      selectionCheck.selection
    );

    if (!analysis.resultId || !analysis.previewAccessKey) {
      throw new Error("Preview analysis completed without preview access data.");
    }

    return jsonResponse(event, 200, {
      resultId: analysis.resultId,
      previewAccessKey: analysis.previewAccessKey,
    }, METHODS);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logServerError("preview.analysis_error", message);
    return jsonResponse(event, 500, {
      error: "Preview analysis failed. Please try again.",
      code: "preview_analysis_failed",
    }, METHODS);
  }
};
