import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

import { optionalUser, readBearerToken, requireUser, verifyAccessToken } from "../../lib/auth.mjs";

const CLIENT_ID = "client_test_123";

async function makeKeys(kid) {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };
  return { privateKey, jwk };
}

async function sign(privateKey, kid, claims = {}, { expiresIn = "5m" } = {}) {
  return new SignJWT({ sid: "session_1", ...claims })
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject(claims.sub ?? "user_abc")
    .setIssuedAt()
    .setIssuer("https://api.workos.com")
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

const trusted = await makeKeys("trusted");
const attacker = await makeKeys("attacker");
const jwks = createLocalJWKSet({ keys: [trusted.jwk] });

test("verifyAccessToken accepts a valid token and returns the subject", async () => {
  const token = await sign(trusted.privateKey, "trusted");
  const res = await verifyAccessToken(token, { clientId: CLIENT_ID, jwks });
  assert.equal(res.ok, true);
  assert.equal(res.userId, "user_abc");
  assert.equal(res.sessionId, "session_1");
});

test("verifyAccessToken rejects an expired token", async () => {
  const token = await sign(trusted.privateKey, "trusted", {}, { expiresIn: Math.floor(Date.now() / 1000) - 60 });
  const res = await verifyAccessToken(token, { clientId: CLIENT_ID, jwks });
  assert.deepEqual(res, { ok: false, error: "token_expired" });
});

test("verifyAccessToken rejects a token signed by an unknown key", async () => {
  const token = await sign(attacker.privateKey, "trusted");
  const res = await verifyAccessToken(token, { clientId: CLIENT_ID, jwks });
  assert.deepEqual(res, { ok: false, error: "invalid_token" });
});

test("verifyAccessToken enforces the issuer when one is configured", async () => {
  const token = await sign(trusted.privateKey, "trusted");
  const res = await verifyAccessToken(token, { clientId: CLIENT_ID, jwks, issuer: "https://other.example" });
  assert.equal(res.ok, false);
});

test("verifyAccessToken reports missing configuration", async () => {
  const token = await sign(trusted.privateKey, "trusted");
  const res = await verifyAccessToken(token, { clientId: "", jwks });
  assert.deepEqual(res, { ok: false, error: "auth_not_configured" });
});

test("readBearerToken is case-insensitive and ignores other schemes", () => {
  assert.equal(readBearerToken({ headers: { Authorization: "Bearer abc.def.ghi" } }), "abc.def.ghi");
  assert.equal(readBearerToken({ headers: { authorization: "bearer xyz" } }), "xyz");
  assert.equal(readBearerToken({ headers: { authorization: "Basic xyz" } }), "");
  assert.equal(readBearerToken({}), "");
});

test("requireUser returns 401 without a token and the user with one", async () => {
  const missing = await requireUser({ headers: {} }, { clientId: CLIENT_ID, jwks });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 401);

  const token = await sign(trusted.privateKey, "trusted", { sub: "user_xyz" });
  const ok = await requireUser(
    { headers: { authorization: `Bearer ${token}`, "x-pt-user-email": "Person@Example.com" } },
    { clientId: CLIENT_ID, jwks }
  );
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.user, { userId: "user_xyz", email: "person@example.com" });
});

test("requireUser ignores a malformed forwarded email", async () => {
  const token = await sign(trusted.privateKey, "trusted");
  const res = await requireUser(
    { headers: { authorization: `Bearer ${token}`, "x-pt-user-email": "not-an-email" } },
    { clientId: CLIENT_ID, jwks }
  );
  assert.equal(res.user.email, "");
});

test("optionalUser returns null for invalid tokens instead of failing", async () => {
  const token = await sign(attacker.privateKey, "trusted");
  const res = await optionalUser({ headers: { authorization: `Bearer ${token}` } }, { clientId: CLIENT_ID, jwks });
  assert.equal(res, null);
});
