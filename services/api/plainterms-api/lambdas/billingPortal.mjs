import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { requireUser } from "./lib/auth.mjs";
import { getUser } from "./lib/users.mjs";
import { appBaseUrl, getStripe, safeReturnPath } from "./lib/billing.mjs";

const METHODS = "POST,OPTIONS";

/** POST /billing/portal — opens the Stripe customer portal (card, invoices, cancel). */
export const handler = async (event) => {
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;

  const auth = await requireUser(event);
  if (!auth.ok) return jsonResponse(event, auth.status, { error: auth.error }, METHODS);

  const parsed = parseJsonBody(event, METHODS);
  if (!parsed.ok) return parsed.response;

  try {
    const user = await getUser(auth.user.userId);
    if (!user?.stripeCustomerId) {
      return jsonResponse(event, 404, {
        error: "There's no billing account yet.",
        code: "no_billing_account",
      }, METHODS);
    }
    const stripe = await getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appBaseUrl()}${safeReturnPath(parsed.payload?.returnPath)}`,
    });
    return jsonResponse(event, 200, { portalUrl: session.url }, METHODS);
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "billing.portal_failed",
        message: err instanceof Error ? err.message : String(err),
      })
    );
    return jsonResponse(event, 502, {
      error: "Billing couldn't be opened. Please try again.",
      code: "portal_failed",
    }, METHODS);
  }
};
