import test from "node:test";
import assert from "node:assert/strict";

import { handler } from "../../billingSubscription.mjs";

function setup({ user = { userId: "user_1", plan: "pro", subscriptionId: "sub_1" } } = {}) {
  const calls = { updates: [], applied: [] };
  const deps = {
    requireUser: async () => ({ ok: true, user: { userId: "user_1", email: "" } }),
    getUser: async () => user,
    getStripe: async () => ({
      subscriptions: {
        update: async (id, params) => {
          calls.updates.push({ id, params });
          return {
            id,
            status: "active",
            cancel_at_period_end: params.cancel_at_period_end,
            items: { data: [{ current_period_end: 1_900_000_000 }] },
          };
        },
      },
    }),
    applySubscriptionState: async (userId, state) => {
      calls.applied.push({ userId, ...state });
      return { applied: true, previousPlan: "pro" };
    },
  };
  return { deps, calls };
}

function post(path, body = {}) {
  return { httpMethod: "POST", resource: path, headers: {}, body: JSON.stringify(body) };
}

test("cancel schedules the end of the period and records feedback", async () => {
  const { deps, calls } = setup();
  const res = await handler(post("/billing/cancel", { feedback: "too_expensive", comment: " Too much " }), {}, deps);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.updates[0], {
    id: "sub_1",
    params: { cancel_at_period_end: true, cancellation_details: { feedback: "too_expensive", comment: "Too much" } },
  });
  assert.equal(calls.applied[0].cancelAtPeriodEnd, true);
  assert.equal(calls.applied[0].plan, "pro", "Pro stays until the period ends");
  assert.equal(JSON.parse(res.body).currentPeriodEnd, 1_900_000_000);
});

test("unknown feedback values are not sent to Stripe", async () => {
  const { deps, calls } = setup();
  await handler(post("/billing/cancel", { feedback: "made-up" }), {}, deps);
  assert.deepEqual(calls.updates[0].params, { cancel_at_period_end: true });
});

test("resume clears a pending cancellation", async () => {
  const { deps, calls } = setup();
  const res = await handler(post("/billing/resume"), {}, deps);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.updates[0].params.cancel_at_period_end, false);
  assert.equal(JSON.parse(res.body).cancelAtPeriodEnd, false);
});

test("free accounts have nothing to cancel", async () => {
  const { deps, calls } = setup({ user: { userId: "user_1", plan: "free", subscriptionId: null } });
  const res = await handler(post("/billing/cancel"), {}, deps);
  assert.equal(res.statusCode, 409);
  assert.equal(calls.updates.length, 0);
});

test("requires sign-in", async () => {
  const res = await handler(post("/billing/cancel"));
  assert.equal(res.statusCode, 401);
});
