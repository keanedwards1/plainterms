import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cachedConfig = null;
let cachedSecretKey = null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function readParameter(name, withDecryption = false) {
  const cmd = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });
  const res = await ssm.send(cmd);
  const value = res?.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter has no value: ${name}`);
  return value;
}

async function maybeReadParameter(name, withDecryption = false) {
  if (!name) return undefined;
  return readParameter(name, withDecryption);
}

export async function getStripeConfig() {
  if (cachedConfig) return cachedConfig;

  const stripeSecretKey = await getStripeSecretKey();
  const reportPriceParam =
    process.env.STRIPE_PRICE_ID_REPORT_PARAM ?? process.env.STRIPE_PRICE_ID_PARAM;
  const scanPriceParam = process.env.STRIPE_PRICE_ID_SCAN_PARAM;
  const protectPriceParam = process.env.STRIPE_PRICE_ID_PROTECT_PARAM;

  const reportPriceId = await maybeReadParameter(reportPriceParam, false);
  const scanPriceId = await maybeReadParameter(scanPriceParam, false);
  const protectPriceId = await maybeReadParameter(protectPriceParam, false);

  if (!reportPriceId) {
    throw new Error(
      "Missing Stripe report tier price configuration (STRIPE_PRICE_ID_REPORT_PARAM or STRIPE_PRICE_ID_PARAM)."
    );
  }

  cachedConfig = {
    stripeSecretKey,
    stripePriceIds: {
      scan_39: scanPriceId ?? reportPriceId,
      report_69: reportPriceId,
      protect_99: protectPriceId ?? reportPriceId,
    },
  };
  return cachedConfig;
}

export async function getStripeSecretKey() {
  if (cachedSecretKey) return cachedSecretKey;
  if (cachedConfig?.stripeSecretKey) return cachedConfig.stripeSecretKey;

  const secretParam = getRequiredEnv("STRIPE_SECRET_KEY_PARAM");
  const stripeSecretKey = await readParameter(secretParam, true);
  cachedSecretKey = stripeSecretKey;
  return stripeSecretKey;
}
