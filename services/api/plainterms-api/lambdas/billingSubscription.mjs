import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { requireUser } from "./lib/auth.mjs";
import { applySubscriptionState, getUser } from "./lib/users.mjs";
import { getStripe, subscriptionPeriodEnd } from "./lib/billing.mjs";
import { planFromSubscriptionStatus } from "./lib/plans.mjs";

const METHODS = "POST,OPTIONS";

// Stripe's cancellation feedback values.
const FEEDBACK = new Set([
  "customer_service",
  "low_quality",
  "missing_features",
  "other",
  "switched_service",
  "too_complex",
  "too_expensive",
  "unused",
]);

function log(level, event, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

/**
 * POST /billing/cancel  { feedback?, comment? } — cancel at the end of the paid period.
 * POST /billing/resume                          — undo a pending cancellation.
 *
 * The user keeps Pro until the period ends either way. The account record is
 * updated from Stripe's response straight away so the page reflects it
 * immediately; the webhook confirms the same state moments later.
 */
export const handler = async (event, _context, deps = {}) => {
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;

  const auth = await (deps.requireUser ?? requireUser)(event);
  if (!auth.ok) return jsonResponse(event, auth.status, { error: auth.error }, METHODS);

  const parsed = parseJsonBody(event, METHODS);
  if (!parsed.ok) return parsed.response;

  const path = String(event.resource ?? event.path ?? "");
  const action = path.endsWith("/resume") ? "resume" : path.endsWith("/cancel") ? "cancel" : null;
  if (!action) return jsonResponse(event, 404, { error: "Not found" }, METHODS);

  try {
    const user = await (deps.getUser ?? getUser)(auth.user.userId);
    if (!user?.subscriptionId || user.plan !== "pro") {
      return jsonResponse(event, 409, {
        error: "There's no active Pro subscription on this account.",
        code: "no_subscription",
      }, METHODS);
    }

    const update = { cancel_at_period_end: action === "cancel" };
    if (action === "cancel") {
      const feedback = parsed.payload?.feedback;
      const comment = typeof parsed.payload?.comment === "string" ? parsed.payload.comment.trim().slice(0, 500) : "";
      const details = {};
      if (typeof feedback === "string" && FEEDBACK.has(feedback)) details.feedback = feedback;
      if (comment) details.comment = comment;
      if (Object.keys(details).length) update.cancellation_details = details;
    }

    const stripe = await (deps.getStripe ?? getStripe)();
    const subscription = await stripe.subscriptions.update(user.subscriptionId, update);

    await (deps.applySubscriptionState ?? applySubscriptionState)(user.userId, {
      plan: planFromSubscriptionStatus(subscription.status),
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      eventCreated: Math.floor(Date.now() / 1000),
    });

    log("info", `billing.subscription_${action}`, { feedback: update.cancellation_details?.feedback ?? null });
    return jsonResponse(event, 200, {
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
    }, METHODS);
  } catch (err) {
    log("error", `billing.subscription_${action}_failed`, {
      message: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(event, 502, {
      error:
        action === "cancel"
          ? "Your subscription couldn't be cancelled. Please try again."
          : "Your subscription couldn't be resumed. Please try again.",
      code: `${action}_failed`,
    }, METHODS);
  }
};
