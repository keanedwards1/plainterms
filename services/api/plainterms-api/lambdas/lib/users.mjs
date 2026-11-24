import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { normalizePlan } from "./plans.mjs";

const defaultDb = new DynamoDBClient({});

function usersTable() {
  const name = process.env.USERS_TABLE;
  if (!name) throw new Error("Missing required env var: USERS_TABLE");
  return name;
}

function str(item, key) {
  return item?.[key]?.S ?? "";
}

function num(item, key) {
  const raw = Number(item?.[key]?.N);
  return Number.isFinite(raw) ? raw : null;
}

export function userFromItem(item) {
  if (!item) return null;
  return {
    userId: str(item, "user_id"),
    email: str(item, "email"),
    plan: normalizePlan(str(item, "plan")),
    stripeCustomerId: str(item, "stripe_customer_id") || null,
    subscriptionId: str(item, "subscription_id") || null,
    subscriptionStatus: str(item, "subscription_status") || null,
    currentPeriodEnd: num(item, "current_period_end"),
    cancelAtPeriodEnd: item?.cancel_at_period_end?.BOOL === true,
    planUpdatedAt: num(item, "plan_updated_at") ?? 0,
    createdAt: str(item, "created_at"),
  };
}

export async function getUser(userId, { db = defaultDb } = {}) {
  const res = await db.send(
    new GetItemCommand({
      TableName: usersTable(),
      Key: { user_id: { S: userId } },
      ConsistentRead: true,
    })
  );
  return userFromItem(res?.Item);
}

/**
 * Returns the user's record, creating a free-plan record the first time a user
 * is seen. The conditional put makes concurrent first requests safe: only one
 * wins, the others read the winner's record.
 */
export async function ensureUser(userId, email, { db = defaultDb } = {}) {
  const existing = await getUser(userId, { db });
  if (existing) {
    if (email && existing.email !== email) {
      try {
        await db.send(
          new UpdateItemCommand({
            TableName: usersTable(),
            Key: { user_id: { S: userId } },
            UpdateExpression: "SET email = :email",
            ConditionExpression: "attribute_exists(user_id)",
            ExpressionAttributeValues: { ":email": { S: email } },
          })
        );
        existing.email = email;
      } catch {
        // Non-fatal: the stored email is display-only.
      }
    }
    return existing;
  }

  const createdAt = new Date().toISOString();
  try {
    await db.send(
      new PutItemCommand({
        TableName: usersTable(),
        Item: {
          user_id: { S: userId },
          email: { S: email || "" },
          plan: { S: "free" },
          created_at: { S: createdAt },
          plan_updated_at: { N: "0" },
        },
        ConditionExpression: "attribute_not_exists(user_id)",
      })
    );
  } catch (err) {
    if (err?.name !== "ConditionalCheckFailedException") throw err;
  }
  return getUser(userId, { db });
}

export async function setStripeCustomerId(userId, customerId, { db = defaultDb } = {}) {
  await db.send(
    new UpdateItemCommand({
      TableName: usersTable(),
      Key: { user_id: { S: userId } },
      UpdateExpression: "SET stripe_customer_id = :c",
      ConditionExpression: "attribute_exists(user_id)",
      ExpressionAttributeValues: { ":c": { S: customerId } },
    })
  );
}

export async function findUserIdByStripeCustomer(customerId, { db = defaultDb } = {}) {
  if (!customerId) return null;
  const res = await db.send(
    new QueryCommand({
      TableName: usersTable(),
      IndexName: "stripe-customer-index",
      KeyConditionExpression: "stripe_customer_id = :c",
      ExpressionAttributeValues: { ":c": { S: customerId } },
      Limit: 1,
    })
  );
  return res?.Items?.[0]?.user_id?.S ?? null;
}

/**
 * Applies a subscription state change. Stripe can deliver events out of order,
 * so the write only lands when `eventCreated` is not older than the last
 * applied change. Returns `{ applied, previousPlan }`.
 */
export async function applySubscriptionState(
  userId,
  { plan, subscriptionId, subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd, customerId, eventCreated },
  { db = defaultDb } = {}
) {
  const names = { "#plan": "plan" };
  const values = {
    ":plan": { S: normalizePlan(plan) },
    ":status": { S: subscriptionStatus || "none" },
    ":cancel": { BOOL: cancelAtPeriodEnd === true },
    ":ts": { N: String(Math.floor(eventCreated || 0)) },
  };
  const sets = [
    "#plan = :plan",
    "subscription_status = :status",
    "cancel_at_period_end = :cancel",
    "plan_updated_at = :ts",
  ];
  if (subscriptionId) {
    sets.push("subscription_id = :sub");
    values[":sub"] = { S: subscriptionId };
  }
  if (customerId) {
    sets.push("stripe_customer_id = :cust");
    values[":cust"] = { S: customerId };
  }
  if (Number.isFinite(currentPeriodEnd) && currentPeriodEnd > 0) {
    sets.push("current_period_end = :end");
    values[":end"] = { N: String(Math.floor(currentPeriodEnd)) };
  }

  try {
    const res = await db.send(
      new UpdateItemCommand({
        TableName: usersTable(),
        Key: { user_id: { S: userId } },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ConditionExpression:
          "attribute_exists(user_id) AND (attribute_not_exists(plan_updated_at) OR plan_updated_at <= :ts)",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "UPDATED_OLD",
      })
    );
    return { applied: true, previousPlan: normalizePlan(res?.Attributes?.plan?.S) };
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return { applied: false, previousPlan: null };
    throw err;
  }
}

export async function deleteUser(userId, { db = defaultDb } = {}) {
  await db.send(
    new DeleteItemCommand({
      TableName: usersTable(),
      Key: { user_id: { S: userId } },
    })
  );
}
