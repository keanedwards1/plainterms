import { verifyPrecheckToken } from "./precheckToken.mjs";
import { validateObjectKey, validateUploadMeta } from "./uploadPolicy.mjs";

/**
 * Validates an analysis request body against its precheck token: the upload
 * metadata must be valid, the token signature and expiry must check out, the
 * token must be bound to this exact upload, and both safety checks must have
 * passed. Returns `{ ok: true, upload, tokenPayload }` or
 * `{ ok: false, status, body }`.
 */
export async function checkPrecheckedUpload(payload) {
  const { objectKey, filename, contentType, size, precheckToken } = payload ?? {};

  if (!objectKey || !filename || !contentType || typeof size !== "number") {
    return {
      ok: false,
      status: 400,
      body: { error: "objectKey, filename, contentType, and numeric size are required" },
    };
  }
  if (typeof precheckToken !== "string" || !precheckToken.trim()) {
    return { ok: false, status: 400, body: { error: "precheckToken is required." } };
  }

  const uploadMeta = validateUploadMeta({ filename, contentType, size, requireSize: true });
  if (!uploadMeta.ok) {
    return {
      ok: false,
      status: uploadMeta.errorCode === "file_too_large" ? 413 : 400,
      body: { error: uploadMeta.error },
    };
  }

  const objectKeyCheck = validateObjectKey(objectKey);
  if (!objectKeyCheck.ok) {
    return { ok: false, status: 400, body: { error: objectKeyCheck.error } };
  }

  const precheck = await verifyPrecheckToken(precheckToken);
  if (!precheck.ok) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "This upload has expired. Please add your contract again.",
        code: precheck.error,
      },
    };
  }

  const tokenPayload = precheck.payload;
  const matches =
    tokenPayload.objectKey === objectKeyCheck.objectKey &&
    tokenPayload.filename === uploadMeta.filename &&
    tokenPayload.contentType === uploadMeta.contentType &&
    tokenPayload.size === size;
  if (!matches) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "This upload does not match the file that was checked. Please add your contract again.",
        code: "precheck_payload_mismatch",
      },
    };
  }

  if (tokenPayload.scanPassed !== true || tokenPayload.textExtractionPrecheckPassed !== true) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "This file did not pass the safety and readability checks. Please try another file.",
        code: "precheck_required_checks_not_passed",
      },
    };
  }

  return {
    ok: true,
    upload: {
      objectKey: objectKeyCheck.objectKey,
      filename: uploadMeta.filename,
      contentType: uploadMeta.contentType,
      size,
    },
    tokenPayload,
  };
}
