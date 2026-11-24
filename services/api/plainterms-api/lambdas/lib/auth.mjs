import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies WorkOS AuthKit access tokens forwarded by the Next.js server as
// `Authorization: Bearer <token>`. Only the `sub` claim (the WorkOS user id) is
// trusted for identity. The JWKS is cached at module scope so warm Lambda
// invocations reuse the fetched keys.

const WORKOS_API_BASE = "https://api.workos.com";

let cachedJwks = null;
let cachedJwksClientId = "";

function getRemoteJwks(clientId) {
  if (!cachedJwks || cachedJwksClientId !== clientId) {
    cachedJwks = createRemoteJWKSet(new URL(`${WORKOS_API_BASE}/sso/jwks/${clientId}`));
    cachedJwksClientId = clientId;
  }
  return cachedJwks;
}

function expectedIssuer() {
  const raw = String(process.env.WORKOS_ISSUER ?? "").trim();
  if (!raw) return undefined;
  const issuers = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return issuers.length <= 1 ? issuers[0] : issuers;
}

function getHeader(event, name) {
  const headers = event?.headers;
  if (!headers || typeof headers !== "object") return "";
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted && typeof value === "string") return value;
  }
  return "";
}

export function readBearerToken(event) {
  const raw = getHeader(event, "authorization").trim();
  const match = /^Bearer\s+(\S+)$/i.exec(raw);
  return match ? match[1] : "";
}

// Email is forwarded by the Next.js server from the WorkOS session. It is not
// part of the signed token, so it is only used for display and as the Stripe
// customer email; it never grants access.
export function readForwardedEmail(event) {
  const raw = getHeader(event, "x-pt-user-email").trim().toLowerCase();
  if (!raw || raw.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return "";
  return raw;
}

export async function verifyAccessToken(token, options = {}) {
  const clientId = options.clientId ?? String(process.env.WORKOS_CLIENT_ID ?? "").trim();
  if (!clientId) return { ok: false, error: "auth_not_configured" };
  if (typeof token !== "string" || !token) return { ok: false, error: "missing_token" };

  try {
    const issuer = options.issuer ?? expectedIssuer();
    const { payload } = await jwtVerify(
      token,
      options.jwks ?? getRemoteJwks(clientId),
      issuer ? { issuer } : undefined
    );
    const userId = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!userId) return { ok: false, error: "missing_subject" };
    return { ok: true, userId, sessionId: typeof payload.sid === "string" ? payload.sid : null };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "ERR_JWT_EXPIRED") return { ok: false, error: "token_expired" };
    return { ok: false, error: "invalid_token" };
  }
}

/**
 * Returns `{ ok: true, user }` when the request carries a valid token,
 * `{ ok: false, status, error }` otherwise.
 */
export async function requireUser(event, options = {}) {
  const token = readBearerToken(event);
  if (!token) return { ok: false, status: 401, error: "Sign in to continue." };
  const verified = await verifyAccessToken(token, options);
  if (!verified.ok) {
    if (verified.error === "auth_not_configured") {
      return { ok: false, status: 503, error: "Sign-in is unavailable right now." };
    }
    return { ok: false, status: 401, error: "Your session has expired. Sign in again." };
  }
  return {
    ok: true,
    user: { userId: verified.userId, email: readForwardedEmail(event) },
  };
}

/** Like requireUser, but a missing or invalid token yields `null` instead of an error. */
export async function optionalUser(event, options = {}) {
  const token = readBearerToken(event);
  if (!token) return null;
  const verified = await verifyAccessToken(token, options);
  if (!verified.ok) return null;
  return { userId: verified.userId, email: readForwardedEmail(event) };
}
