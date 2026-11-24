import Stripe from "stripe";
import { readParameter } from "./ssm.mjs";
import { getStripeSecretKey } from "./stripeConfig.mjs";

// Stripe config for the Pro subscription. Reuses the existing live/sandbox
// switch (STRIPE_MODE) and SSM-backed secret key from stripeConfig.mjs.

let cachedStripe = null;
let cachedProPriceId = null;
let cachedWebhookSecret = null;

function isSandbox() {
  const mode = String(process.env.STRIPE_MODE ?? "live").trim().toLowerCase();
  return mode === "sandbox" || mode === "test";
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export async function getStripe() {
  if (cachedStripe) return cachedStripe;
  cachedStripe = new Stripe(await getStripeSecretKey());
  return cachedStripe;
}

export async function getProPriceId() {
  if (cachedProPriceId) return cachedProPriceId;
  const param = isSandbox()
    ? requiredEnv("STRIPE_TEST_PRO_PRICE_ID_PARAM")
    : requiredEnv("STRIPE_PRO_PRICE_ID_PARAM");
  cachedProPriceId = await readParameter(param, false);
  return cachedProPriceId;
}

export async function getWebhookSecret() {
  if (cachedWebhookSecret) return cachedWebhookSecret;
  const param = isSandbox()
    ? requiredEnv("STRIPE_TEST_WEBHOOK_SECRET_PARAM")
    : requiredEnv("STRIPE_WEBHOOK_SECRET_PARAM");
  cachedWebhookSecret = await readParameter(param, true);
  return cachedWebhookSecret;
}

export function appBaseUrl() {
  return String(process.env.APP_BASE_URL ?? "https://www.plainterms.us").replace(/\/+$/, "");
}

/** Only same-site relative paths are allowed as post-checkout destinations. */
export function safeReturnPath(value, fallback = "/dashboard/billing") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return fallback;
  if (trimmed.length > 300 || /[\r\n]/.test(trimmed)) return fallback;
  return trimmed;
}

/** Period end lives on the subscription item in newer Stripe API versions. */
export function subscriptionPeriodEnd(subscription) {
  const direct = Number(subscription?.current_period_end);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fromItems = (subscription?.items?.data ?? [])
    .map((item) => Number(item?.current_period_end))
    .filter((value) => Number.isFinite(value) && value > 0);
  return fromItems.length ? Math.max(...fromItems) : null;
}
