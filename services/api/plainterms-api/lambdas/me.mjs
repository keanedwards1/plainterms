import { jsonResponse, optionsResponse } from "./lib/http.mjs";
import { requireUser } from "./lib/auth.mjs";
import { deleteUser, ensureUser, getUser } from "./lib/users.mjs";
import { deleteUsageForUser, getMonthlyCount } from "./lib/usage.mjs";
import { deleteResultAndUpload, getResultItem, listAllOwnerResultKeys } from "./lib/documents.mjs";
import { entitlementsForPlan } from "./lib/plans.mjs";

const METHODS = "GET,DELETE,OPTIONS";

function log(level, event, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

function serializeUser(user, monthlyCount) {
  return {
    userId: user.userId,
    email: user.email,
    plan: user.plan,
    entitlements: entitlementsForPlan(user.plan),
    subscription: {
      status: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      hasBillingAccount: Boolean(user.stripeCustomerId),
    },
    usage: { documentsThisMonth: monthlyCount },
    createdAt: user.createdAt,
  };
}

async function deleteAccount(userId) {
  const user = await getUser(userId);

  // Stop billing first so a failure later never leaves a paying, deleted user.
  if (user?.subscriptionId && user.subscriptionStatus !== "canceled") {
    // Loaded only here, so GET /me doesn't pay the Stripe SDK's startup cost.
    const { getStripe } = await import("./lib/billing.mjs");
    const stripe = await getStripe();
    try {
      await stripe.subscriptions.cancel(user.subscriptionId);
    } catch (err) {
      if (err?.code !== "resource_missing") throw err;
    }
  }

  const ids = await listAllOwnerResultKeys(userId);
  for (const id of ids) {
    const item = await getResultItem(id);
    if (item) await deleteResultAndUpload(item);
  }
  await deleteUsageForUser(userId);
  await deleteUser(userId);
  return ids.length;
}

/** GET /me — account summary. DELETE /me — delete the account and every document. */
export const handler = async (event) => {
  if (event?.httpMethod === "OPTIONS") return optionsResponse(event, METHODS);
  if (event?.httpMethod !== "GET" && event?.httpMethod !== "DELETE") {
    return jsonResponse(event, 405, { error: "Method not allowed" }, METHODS);
  }

  const auth = await requireUser(event);
  if (!auth.ok) return jsonResponse(event, auth.status, { error: auth.error }, METHODS);

  try {
    if (event.httpMethod === "DELETE") {
      const deleted = await deleteAccount(auth.user.userId);
      log("info", "account.deleted", { documents: deleted });
      return jsonResponse(event, 200, { deleted: true }, METHODS);
    }

    const [user, monthlyCount] = await Promise.all([
      ensureUser(auth.user.userId, auth.user.email),
      getMonthlyCount(auth.user.userId),
    ]);
    return jsonResponse(event, 200, serializeUser(user, monthlyCount), METHODS);
  } catch (err) {
    log("error", "account.request_failed", {
      method: event.httpMethod,
      message: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(event, 502, { error: "Your account couldn't be loaded. Please try again." }, METHODS);
  }
};
