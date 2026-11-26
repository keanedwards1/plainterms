import test from "node:test";
import assert from "node:assert/strict";

import { partyFallbackFor } from "../../precheckUpload.mjs";
import { reserveDaily } from "../../lib/usage.mjs";

const MODEL_PARTIES = [
  { name: "Bright Paint Co", role: "contractor" },
  { name: "Sam Ortiz", role: "client" },
];

test("signed-out visitors never trigger the AI fallback", async () => {
  let modelCalls = 0;
  const fallback = partyFallbackFor({}, {
    optionalUser: async () => null,
    detectPartiesWithModel: async () => {
      modelCalls += 1;
      return MODEL_PARTIES;
    },
  });
  assert.deepEqual(await fallback("text"), []);
  assert.equal(modelCalls, 0);
});

test("signed-in users get the AI fallback until their daily cap", async () => {
  let allowed = true;
  const fallback = partyFallbackFor({}, {
    optionalUser: async () => ({ userId: "u1" }),
    reserveDaily: async (userId, feature) => {
      assert.equal(userId, "u1");
      assert.equal(feature, "party-ai");
      return { ok: allowed };
    },
    detectPartiesWithModel: async () => MODEL_PARTIES,
  });
  assert.equal((await fallback("text")).length, 2);
  allowed = false;
  assert.deepEqual(await fallback("text"), []);
});

test("reserveDaily counts per user and day and refuses past the limit", async () => {
  process.env.USAGE_TABLE = "usage";
  const counts = new Map();
  const db = {
    async send(cmd) {
      const key = `${cmd.input.Key.user_id.S}|${cmd.input.Key.period.S}`;
      const limit = Number(cmd.input.ExpressionAttributeValues[":limit"].N);
      const n = counts.get(key) ?? 0;
      if (n >= limit) {
        const err = new Error("limit");
        err.name = "ConditionalCheckFailedException";
        throw err;
      }
      counts.set(key, n + 1);
      return {};
    },
  };
  const now = new Date("2026-11-26T10:00:00Z");
  assert.equal((await reserveDaily("u1", "party-ai", 2, { db, now })).ok, true);
  assert.equal((await reserveDaily("u1", "party-ai", 2, { db, now })).ok, true);
  assert.equal((await reserveDaily("u1", "party-ai", 2, { db, now })).ok, false);
  assert.equal((await reserveDaily("u1", "party-ai", 2, { db, now: new Date("2026-11-27T10:00:00Z") })).ok, true);
  assert.ok(counts.has("u1|party-ai:2026-11-26"));
});
