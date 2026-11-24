import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

import { createWebhookHandler } from "../../billingWebhook.mjs";

process.env.STRIPE_EVENTS_TABLE = "StripeEventsTest";
const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");

function conditionalFailure() {
  const err = new Error("The conditional request failed");
  err.name = "ConditionalCheckFailedException";
  return err;
}

function fakeEventsDb() {
  const claimed = new Set();
  return {
    claimed,
    async send(command) {
      const name = command.constructor.name;
      const id = command.input.Item?.event_id?.S ?? command.input.Key?.event_id?.S;
      if (name === "PutItemCommand") {
        if (claimed.has(id)) throw conditionalFailure();
        claimed.add(id);
        return {};
      }
      if (name === "DeleteItemCommand") {
        claimed.delete(id);
        return {};
      }
      throw new Error(`Unexpected command ${name}`);
    },
  };
}

function signedEvent(payload) {
  const body = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET });
  return { httpMethod: "POST", headers: { "Stripe-Signature": signature }, body };
}

function subscriptionEvent(id, status, { created = 1_800_000_000, userId = "user_1" } = {}) {
  return {
    id,
    type: "customer.subscription.updated",
    created,
    data: {
      object: {
        id: "sub_1",
        status,
        customer: "cus_1",
        cancel_at_period_end: false,
        metadata: { userId },
        items: { data: [{ current_period_end: 1_802_000_000 }] },
      },
    },
  };
}

function makeHandler(overrides = {}) {
  const calls = { apply: [], expiry: [] };
  const handler = createWebhookHandler({
    db: fakeEventsDb(),
    getStripe: async () => stripe,
    getWebhookSecret: async () => SECRET,
    applySubscriptionState: async (userId, state) => {
      calls.apply.push({ userId, ...state });
      return { applied: true, previousPlan: "free" };
    },
    setOwnerDocumentsExpiry: async (userId, expiry) => {
      calls.expiry.push({ userId, expiry });
      return 0;
    },
    findUserIdByStripeCustomer: async () => null,
    ...overrides,
  });
  return { handler, calls };
}

test("webhook rejects a request without a valid signature", async () => {
  const { handler, calls } = makeHandler();
  const missing = await handler({ httpMethod: "POST", headers: {}, body: "{}" });
  assert.equal(missing.statusCode, 400);

  const forged = await handler({
    httpMethod: "POST",
    headers: { "stripe-signature": "t=1,v1=deadbeef" },
    body: JSON.stringify(subscriptionEvent("evt_forged", "active")),
  });
  assert.equal(forged.statusCode, 400);
  assert.equal(calls.apply.length, 0);
});

test("webhook applies an active subscription as Pro and clears document expiry", async () => {
  const { handler, calls } = makeHandler();
  const res = await handler(signedEvent(subscriptionEvent("evt_1", "active")));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.apply.length, 1);
  assert.equal(calls.apply[0].userId, "user_1");
  assert.equal(calls.apply[0].plan, "pro");
  assert.equal(calls.apply[0].currentPeriodEnd, 1_802_000_000);
  assert.deepEqual(calls.expiry, [{ userId: "user_1", expiry: null }]);
});

test("webhook processes a replayed event only once", async () => {
  const { handler, calls } = makeHandler();
  const event = signedEvent(subscriptionEvent("evt_dup", "active"));
  const first = await handler(event);
  const second = await handler(event);
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(JSON.parse(second.body).duplicate, true);
  assert.equal(calls.apply.length, 1);
});

test("a canceled subscription moves the user to free with a 30-day expiry", async () => {
  const { handler, calls } = makeHandler({
    applySubscriptionState: async (userId, state) => {
      calls.apply.push({ userId, ...state });
      return { applied: true, previousPlan: "pro" };
    },
  });
  const before = Math.floor(Date.now() / 1000);
  await handler(signedEvent(subscriptionEvent("evt_cancel", "canceled")));
  assert.equal(calls.apply[0].plan, "free");
  const expiry = calls.expiry[0].expiry;
  assert.ok(expiry >= before + 30 * 86400 - 5 && expiry <= before + 30 * 86400 + 5);
});

test("a stale event does not change document expiry", async () => {
  const { handler, calls } = makeHandler({
    applySubscriptionState: async () => ({ applied: false, previousPlan: null }),
  });
  const res = await handler(signedEvent(subscriptionEvent("evt_stale", "canceled")));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.expiry.length, 0);
});

test("a failed event is un-claimed so Stripe's retry is processed", async () => {
  let attempts = 0;
  const { handler } = makeHandler({
    applySubscriptionState: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("DynamoDB unavailable");
      return { applied: true, previousPlan: "pro" };
    },
  });
  const event = signedEvent(subscriptionEvent("evt_retry", "active"));
  assert.equal((await handler(event)).statusCode, 500);
  assert.equal((await handler(event)).statusCode, 200);
  assert.equal(attempts, 2);
});

test("webhook falls back to the customer lookup when metadata has no user", async () => {
  const { handler, calls } = makeHandler({ findUserIdByStripeCustomer: async (id) => (id === "cus_1" ? "user_9" : null) });
  await handler(signedEvent(subscriptionEvent("evt_lookup", "active", { userId: "" })));
  assert.equal(calls.apply[0].userId, "user_9");
});
