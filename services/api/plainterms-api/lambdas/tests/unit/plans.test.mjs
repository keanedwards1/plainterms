import test from "node:test";
import assert from "node:assert/strict";

import {
  entitlementsForPlan,
  isLockedRevision,
  lockedRevision,
  monthlyDocumentLimit,
  planFromSubscriptionStatus,
  retentionDaysForPlan,
  stripProOnlyContent,
} from "../../lib/plans.mjs";
import { handler as analyzeHandler } from "../../analyze.mjs";

test("free results never carry Pro-only rewrite content", () => {
  const report = {
    protect_extras: {
      deeper_rewrites: [{ id: "rw_1" }],
      fallback_positions: [{ id: "fb_1" }],
      priority_stack: { fight_for: ["a"] },
    },
  };
  const stripped = stripProOnlyContent(report);
  assert.deepEqual(stripped.protect_extras.deeper_rewrites, []);
  assert.deepEqual(stripped.protect_extras.fallback_positions, []);
  assert.deepEqual(stripped.protect_extras.priority_stack, { fight_for: ["a"] });
  assert.equal(report.protect_extras.deeper_rewrites.length, 1, "input is not mutated");
});

test("entitlements and retention follow the plan", () => {
  assert.equal(entitlementsForPlan("free").revised_document, false);
  assert.equal(entitlementsForPlan("pro").revised_document, true);
  assert.equal(entitlementsForPlan("anything").plan, "free");
  assert.equal(retentionDaysForPlan("free"), 30);
  assert.equal(retentionDaysForPlan("pro"), null);
});

test("monthly limits come from the environment with safe fallbacks", () => {
  process.env.FREE_MONTHLY_DOC_LIMIT = "7";
  assert.equal(monthlyDocumentLimit("free"), 7);
  process.env.FREE_MONTHLY_DOC_LIMIT = "nonsense";
  assert.equal(monthlyDocumentLimit("free"), 30);
  delete process.env.FREE_MONTHLY_DOC_LIMIT;
  assert.ok(monthlyDocumentLimit("pro") > monthlyDocumentLimit("free"));
});

test("past-due subscriptions keep Pro during Stripe's retry window", () => {
  assert.equal(planFromSubscriptionStatus("active"), "pro");
  assert.equal(planFromSubscriptionStatus("past_due"), "pro");
  assert.equal(planFromSubscriptionStatus("canceled"), "free");
  assert.equal(planFromSubscriptionStatus("incomplete"), "free");
});

test("locked revisions are recognised", () => {
  assert.equal(isLockedRevision(lockedRevision()), true);
  assert.equal(isLockedRevision({ status: "not_available" }), false);
});

test("POST /analyze requires sign-in", async () => {
  const res = await analyzeHandler({ httpMethod: "POST", headers: {}, body: "{}" });
  assert.equal(res.statusCode, 401);
});

test("POST /analyze rejects other methods", async () => {
  const res = await analyzeHandler({ httpMethod: "GET", headers: {} });
  assert.equal(res.statusCode, 405);
});
