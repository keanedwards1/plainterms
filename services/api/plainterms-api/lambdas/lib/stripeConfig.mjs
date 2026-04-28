import { maybeReadParameter, readParameter } from "./ssm.mjs";
let cachedConfig = null;
let cachedSecretKey = null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function normalizeStripeMode(value) {
  const normalized = String(value ?? "live").trim().toLowerCase();
  if (normalized === "sandbox") return "sandbox";
  if (normalized === "test") return "sandbox";
  return "live";
}

export async function getStripeConfig() {
  if (cachedConfig) return cachedConfig;

  const stripeMode = normalizeStripeMode(process.env.STRIPE_MODE);
  const stripeSecretKey = await getStripeSecretKey();
  const useSandboxParams = stripeMode === "sandbox";

  const reportPriceParam = useSandboxParams
    ? process.env.STRIPE_TEST_PRICE_ID_REPORT_PARAM
    : process.env.STRIPE_PRICE_ID_REPORT_PARAM ?? process.env.STRIPE_PRICE_ID_PARAM;
  const scanPriceParam = useSandboxParams
    ? process.env.STRIPE_TEST_PRICE_ID_SCAN_PARAM
    : process.env.STRIPE_PRICE_ID_SCAN_PARAM;
  const protectPriceParam = useSandboxParams
    ? process.env.STRIPE_TEST_PRICE_ID_PROTECT_PARAM
    : process.env.STRIPE_PRICE_ID_PROTECT_PARAM;
  const rewriteAddonPriceParam = useSandboxParams
    ? process.env.STRIPE_TEST_ADDON_REWRITE_PRICE_PARAM
    : process.env.STRIPE_ADDON_REWRITE_PRICE_PARAM;
  const updateEmailAddonPriceParam = useSandboxParams
    ? process.env.STRIPE_TEST_ADDON_UPDATE_EMAIL_PRICE_PARAM
    : process.env.STRIPE_ADDON_UPDATE_EMAIL_PRICE_PARAM;

  const reportPriceId = await maybeReadParameter(reportPriceParam, false);
  const scanPriceId = await maybeReadParameter(scanPriceParam, false);
  const protectPriceId = await maybeReadParameter(protectPriceParam, false);
  const rewriteAddonPriceId = await maybeReadParameter(rewriteAddonPriceParam, false);
  const updateEmailAddonPriceId = await maybeReadParameter(updateEmailAddonPriceParam, false);

  if (!reportPriceId) {
    throw new Error(
      useSandboxParams
        ? "Missing Stripe sandbox report tier price configuration (STRIPE_TEST_PRICE_ID_REPORT_PARAM)."
        : "Missing Stripe report tier price configuration (STRIPE_PRICE_ID_REPORT_PARAM or STRIPE_PRICE_ID_PARAM)."
    );
  }
  if (!scanPriceId) {
    throw new Error(
      useSandboxParams
        ? "Missing Stripe sandbox scan tier price configuration (STRIPE_TEST_PRICE_ID_SCAN_PARAM)."
        : "Missing Stripe scan tier price configuration (STRIPE_PRICE_ID_SCAN_PARAM)."
    );
  }
  if (!protectPriceId) {
    throw new Error(
      useSandboxParams
        ? "Missing Stripe sandbox protect tier price configuration (STRIPE_TEST_PRICE_ID_PROTECT_PARAM)."
        : "Missing Stripe protect tier price configuration (STRIPE_PRICE_ID_PROTECT_PARAM)."
    );
  }

  cachedConfig = {
    stripeSecretKey,
    stripeMode,
    stripePriceIds: {
      scan_39: scanPriceId,
      report_69: reportPriceId,
      protect_99: protectPriceId,
    },
    stripeAddonPriceIds: {
      rewrite_contract: rewriteAddonPriceId,
      update_email: updateEmailAddonPriceId,
    },
  };
  return cachedConfig;
}

export async function getStripeSecretKey() {
  if (cachedSecretKey) return cachedSecretKey;
  if (cachedConfig?.stripeSecretKey) return cachedConfig.stripeSecretKey;

  const stripeMode = normalizeStripeMode(process.env.STRIPE_MODE);
  const secretParam =
    stripeMode === "sandbox"
      ? getRequiredEnv("STRIPE_TEST_SECRET_KEY_PARAM")
      : getRequiredEnv("STRIPE_SECRET_KEY_PARAM");
  const stripeSecretKey = await readParameter(secretParam, true);
  cachedSecretKey = stripeSecretKey;
  return stripeSecretKey;
}
