import { DeleteItemCommand, DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { getStripe, getWebhookSecret, subscriptionPeriodEnd } from "./lib/billing.mjs";
import { applySubscriptionState, findUserIdByStripeCustomer } from "./lib/users.mjs";
import { setOwnerDocumentsExpiry } from "./lib/documents.mjs";
import { freeRetentionDays, planFromSubscriptionStatus } from "./lib/plans.mjs";

const EVENT_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const defaultDb = new DynamoDBClient({});

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function log(level, event, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

function header(event, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(event?.headers ?? {})) {
    if (key.toLowerCase() === wanted) return typeof value === "string" ? value : "";
  }
  return "";
}

function rawBody(event) {
  const body = event?.body ?? "";
  return event?.isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
}

function eventsTable() {
  const name = process.env.STRIPE_EVENTS_TABLE;
  if (!name) throw new Error("Missing required env var: STRIPE_EVENTS_TABLE");
  return name;
}

/** Records the event id; false means this event was already processed. */
async function claimEvent(db, eventId) {
  try {
    await db.send(
      new PutItemCommand({
        TableName: eventsTable(),
        Item: {
          event_id: { S: eventId },
          expires_at: { N: String(Math.floor(Date.now() / 1000) + EVENT_RETENTION_SECONDS) },
        },
        ConditionExpression: "attribute_not_exists(event_id)",
      })
    );
    return true;
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

async function releaseEvent(db, eventId) {
  try {
    await db.send(new DeleteItemCommand({ TableName: eventsTable(), Key: { event_id: { S: eventId } } }));
  } catch {
    // If this fails, Stripe's retry is treated as a duplicate; logged by the caller.
  }
}

function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

function idOf(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

export function createWebhookHandler(overrides = {}) {
  const deps = {
    db: defaultDb,
    getStripe,
    getWebhookSecret,
    applySubscriptionState,
    findUserIdByStripeCustomer,
    setOwnerDocumentsExpiry,
    ...overrides,
  };

  async function resolveUserId(subscription, fallbackUserId) {
    const fromMetadata = subscription?.metadata?.userId;
    if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;
    if (fallbackUserId) return fallbackUserId;
    return deps.findUserIdByStripeCustomer(idOf(subscription?.customer));
  }

  async function applySubscription(subscription, eventCreated, fallbackUserId) {
    const userId = await resolveUserId(subscription, fallbackUserId);
    if (!userId) {
      log("error", "billing.webhook_user_not_found", { subscription: subscription?.id ?? null });
      return;
    }
    const status = subscription?.status ?? "canceled";
    const plan = planFromSubscriptionStatus(status);
    const outcome = await deps.applySubscriptionState(userId, {
      plan,
      subscriptionId: subscription?.id ?? null,
      subscriptionStatus: status,
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription?.cancel_at_period_end === true,
      customerId: idOf(subscription?.customer),
      eventCreated,
    });
    if (!outcome.applied) {
      log("info", "billing.webhook_stale_event_skipped", { status });
      return;
    }
    if (outcome.previousPlan !== plan) {
      // Pro keeps documents; going back to free starts a fresh 30-day window.
      const expiry =
        plan === "pro" ? null : Math.floor(Date.now() / 1000) + freeRetentionDays() * 24 * 60 * 60;
      const count = await deps.setOwnerDocumentsExpiry(userId, expiry);
      log("info", "billing.plan_changed", { from: outcome.previousPlan, to: plan, documents: count });
    }
  }

  return async function handler(event) {
    if (event?.httpMethod && event.httpMethod !== "POST") {
      return respond(405, { error: "Method not allowed" });
    }

    const signature = header(event, "stripe-signature");
    if (!signature) return respond(400, { error: "Missing signature" });

    let stripeEvent;
    try {
      const stripe = await deps.getStripe();
      stripeEvent = stripe.webhooks.constructEvent(rawBody(event), signature, await deps.getWebhookSecret());
    } catch (err) {
      log("error", "billing.webhook_bad_signature", {
        message: err instanceof Error ? err.message : String(err),
      });
      return respond(400, { error: "Invalid signature" });
    }

    const claimed = await claimEvent(deps.db, stripeEvent.id);
    if (!claimed) return respond(200, { received: true, duplicate: true });

    try {
      const object = stripeEvent.data?.object ?? {};
      switch (stripeEvent.type) {
        case "checkout.session.completed": {
          if (object.mode !== "subscription" || !object.subscription) break;
          const stripe = await deps.getStripe();
          const subscription = await stripe.subscriptions.retrieve(idOf(object.subscription));
          // A freshly retrieved subscription is the current state, so it is
          // stamped with "now" rather than the (older) event time.
          await applySubscription(subscription, nowEpoch(), object.client_reference_id);
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await applySubscription(object, stripeEvent.created);
          break;
        case "invoice.payment_failed": {
          const subscriptionId =
            idOf(object.subscription) ?? idOf(object.parent?.subscription_details?.subscription);
          if (!subscriptionId) break;
          const stripe = await deps.getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await applySubscription(subscription, nowEpoch());
          break;
        }
        default:
          break;
      }
      return respond(200, { received: true });
    } catch (err) {
      // Un-claim so Stripe's automatic retry gets processed instead of skipped.
      await releaseEvent(deps.db, stripeEvent.id);
      log("error", "billing.webhook_failed", {
        type: stripeEvent.type,
        message: err instanceof Error ? err.message : String(err),
      });
      return respond(500, { error: "Webhook processing failed" });
    }
  };
}

export const handler = createWebhookHandler();
