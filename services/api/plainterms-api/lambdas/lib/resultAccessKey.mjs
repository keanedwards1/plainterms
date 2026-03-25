import crypto from "node:crypto";

const RESULT_ACCESS_KEY_BYTES = 32;

export function createResultAccessKey() {
  return crypto.randomBytes(RESULT_ACCESS_KEY_BYTES).toString("base64url");
}

export function hashResultAccessKey(accessKey) {
  return crypto
    .createHash("sha256")
    .update(String(accessKey), "utf8")
    .digest("base64url");
}

export function secureEqualStrings(a, b) {
  const aBuf = Buffer.from(String(a), "utf8");
  const bBuf = Buffer.from(String(b), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
