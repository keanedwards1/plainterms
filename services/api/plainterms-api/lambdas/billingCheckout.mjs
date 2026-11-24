import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { requireUser } from "./lib/auth.mjs";
import { ensureUser, setStripeCustomerId } from "./lib/users.mjs";
import { appBaseUrl, getProPriceId, getStripe, safeReturnPath } from "./lib/billing.mjs";

const METHODS = "POST,OPTIONS";

function withQuery(path, key, value) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${value}`;
}

/** POST /billing/checkout — opens Stripe Checkout for the Pro subscription. */
export const handler = async (event) => {
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;

  const auth = await requireUser(event);
  if (!auth.ok) return jsonResponse(event, auth.status, { error: auth.error }, METHODS);

  const parsed = parseJsonBody(event, METHODS);
  if (!parsed.ok) return parsed.response;
  const returnPath = safeReturnPath(parsed.payload?.returnPath);

  try {
    const user = await ensureUser(auth.user.userId, auth.user.email);
    if (user.plan === "pro" && user.subscriptionStatus !== "past_due") {
      return jsonResponse(event, 409, {
        error: "You're already on Pro.",
        code: "already_pro",
      }, METHODS);
    }

    const stripe = await getStripe();
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email || undefined,
          metadata: { userId: user.userId },
        },
        // One customer per user even if two checkout requests race.
        { idempotencyKey: `pt-customer-${user.userId}` }
      );
      customerId = customer.id;
      await setStripeCustomerId(user.userId, customerId);
    }

    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.userId,
      line_items: [{ price: await getProPriceId(), quantity: 1 }],
      subscription_data: { metadata: { userId: user.userId } },
      allow_promotion_codes: true,
      success_url: `${base}${withQuery(returnPath, "upgraded", "1")}`,
      cancel_url: `${base}${returnPath}`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return jsonResponse(event, 200, { checkoutUrl: session.url }, METHODS);
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "billing.checkout_failed",
        message: err instanceof Error ? err.message : String(err),
      })
    );
    return jsonResponse(event, 502, {
      error: "Checkout couldn't be started. Please try again.",
      code: "checkout_failed",
    }, METHODS);
  }
};
