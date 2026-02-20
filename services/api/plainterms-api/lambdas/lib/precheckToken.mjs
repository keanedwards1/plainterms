import crypto from "node:crypto";
import { getPrecheckTokenSecret } from "./precheckSecret.mjs";

const DEFAULT_PRECHECK_TOKEN_TTL_SEC = 15 * 60;

function getTokenTtlSec() {
  const raw = Number(
    process.env.PRECHECK_TOKEN_TTL_SEC ?? DEFAULT_PRECHECK_TOKEN_TTL_SEC
  );
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PRECHECK_TOKEN_TTL_SEC;
  return Math.floor(raw);
}

function base64UrlEncodeJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function base64UrlDecodeJson(value) {
  try {
    const raw = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sign(payloadEncoded, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded, "utf8")
    .digest("base64url");
}

function secureEqual(a, b) {
  const aBuf = Buffer.from(String(a), "utf8");
  const bBuf = Buffer.from(String(b), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function getPrecheckTokenTtlSec() {
  return getTokenTtlSec();
}

export async function createPrecheckToken({
  objectKey,
  filename,
  contentType,
  size,
  scanPassed,
  textExtractionPrecheckPassed,
}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = getTokenTtlSec();
  const payload = {
    v: 1,
    iat: nowSec,
    exp: nowSec + ttlSec,
    objectKey: String(objectKey),
    filename: String(filename),
    contentType: String(contentType),
    size: Number(size),
    scanPassed: scanPassed === true,
    textExtractionPrecheckPassed: textExtractionPrecheckPassed === true,
  };

  const payloadEncoded = base64UrlEncodeJson(payload);
  const secret = await getPrecheckTokenSecret();
  const signature = sign(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export async function verifyPrecheckToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, error: "precheck_token_required" };
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, error: "precheck_token_malformed" };
  }

  const [payloadEncoded, providedSig] = parts;
  const secret = await getPrecheckTokenSecret();
  const expectedSig = sign(payloadEncoded, secret);
  if (!secureEqual(providedSig, expectedSig)) {
    return { ok: false, error: "precheck_token_signature_invalid" };
  }

  const payload = base64UrlDecodeJson(payloadEncoded);
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "precheck_token_payload_invalid" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp ?? 0);
  if (!Number.isFinite(exp) || exp <= nowSec) {
    return { ok: false, error: "precheck_token_expired" };
  }

  if (
    typeof payload.objectKey !== "string" ||
    typeof payload.filename !== "string" ||
    typeof payload.contentType !== "string" ||
    typeof payload.size !== "number" ||
    !Number.isInteger(payload.size) ||
    payload.size <= 0 ||
    typeof payload.scanPassed !== "boolean" ||
    typeof payload.textExtractionPrecheckPassed !== "boolean"
  ) {
    return { ok: false, error: "precheck_token_payload_shape_invalid" };
  }

  return {
    ok: true,
    payload: {
      objectKey: payload.objectKey,
      filename: payload.filename,
      contentType: payload.contentType,
      size: payload.size,
      scanPassed: payload.scanPassed,
      textExtractionPrecheckPassed: payload.textExtractionPrecheckPassed,
      exp,
      iat: Number(payload.iat ?? 0),
      v: Number(payload.v ?? 0),
    },
  };
}
