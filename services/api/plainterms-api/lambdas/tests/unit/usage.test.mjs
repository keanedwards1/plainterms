import test from "node:test";
import assert from "node:assert/strict";

import { consumePrecheckToken, currentPeriod, releaseDocument, reserveDocument } from "../../lib/usage.mjs";

process.env.USAGE_TABLE = "UsageTableTest";

function conditionalFailure() {
  const err = new Error("The conditional request failed");
  err.name = "ConditionalCheckFailedException";
  return err;
}

/**
 * Minimal stand-in for DynamoDB that evaluates the exact conditions the usage
 * module sends. Every command is applied atomically (one at a time), which is
 * the guarantee DynamoDB gives for a single-item conditional write.
 */
function fakeUsageDb() {
  const items = new Map();
  const key = (input) => `${input.Key?.user_id?.S ?? input.Item?.user_id?.S}|${input.Key?.period?.S ?? input.Item?.period?.S}`;
  return {
    items,
    async send(command) {
      // Yield so concurrent callers interleave like real network calls.
      await new Promise((resolve) => setImmediate(resolve));
      const { input } = command;
      const name = command.constructor.name;
      if (name === "UpdateItemCommand") {
        const k = key(input);
        const current = items.get(k);
        const count = Number(current?.docs_count ?? 0);
        const values = input.ExpressionAttributeValues;
        if (input.ConditionExpression.includes("docs_count < :limit")) {
          if (current && count >= Number(values[":limit"].N)) throw conditionalFailure();
          const next = { ...(current ?? {}), docs_count: count + 1 };
          items.set(k, next);
          return { Attributes: { docs_count: { N: String(next.docs_count) } } };
        }
        if (input.ConditionExpression.includes("docs_count > :zero")) {
          if (!current || count <= 0) throw conditionalFailure();
          items.set(k, { ...current, docs_count: count - 1 });
          return {};
        }
      }
      if (name === "PutItemCommand") {
        const k = key(input);
        if (items.has(k)) throw conditionalFailure();
        items.set(k, { put: true });
        return {};
      }
      throw new Error(`Unexpected command ${name}`);
    },
  };
}

test("currentPeriod is the UTC year and month", () => {
  assert.equal(currentPeriod(new Date("2026-11-30T23:59:59Z")), "2026-11");
  assert.equal(currentPeriod(new Date("2026-12-01T00:00:00Z")), "2026-12");
});

test("reserveDocument stops at the limit", async () => {
  const db = fakeUsageDb();
  const results = [];
  for (let i = 0; i < 4; i += 1) results.push(await reserveDocument("user_1", 3, { db }));
  assert.deepEqual(
    results.map((r) => r.ok),
    [true, true, true, false]
  );
  assert.equal(results[3].reason, "limit_reached");
});

test("reserveDocument never exceeds the limit under concurrent requests", async () => {
  const db = fakeUsageDb();
  const attempts = await Promise.all(
    Array.from({ length: 25 }, () => reserveDocument("user_2", 5, { db }))
  );
  assert.equal(attempts.filter((r) => r.ok).length, 5);
  assert.equal(attempts.filter((r) => !r.ok).length, 20);
});

test("releaseDocument gives a slot back", async () => {
  const db = fakeUsageDb();
  await reserveDocument("user_3", 1, { db });
  assert.equal((await reserveDocument("user_3", 1, { db })).ok, false);
  await releaseDocument("user_3", { db });
  assert.equal((await reserveDocument("user_3", 1, { db })).ok, true);
});

test("consumePrecheckToken lets each token start only one analysis", async () => {
  const db = fakeUsageDb();
  const exp = Math.floor(Date.now() / 1000) + 900;
  const [first, second] = await Promise.all([
    consumePrecheckToken("token-abc", exp, { db }),
    consumePrecheckToken("token-abc", exp, { db }),
  ]);
  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal(await consumePrecheckToken("token-other", exp, { db }), true);
});
