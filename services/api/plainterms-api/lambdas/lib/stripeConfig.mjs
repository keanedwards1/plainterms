import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cachedConfig = null;

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

export async function getStripeConfig() {
  if (cachedConfig) return cachedConfig;

  const secretParam = getRequiredEnv("STRIPE_SECRET_KEY_PARAM");
  const priceParam = process.env.STRIPE_PRICE_ID_PARAM;

  const stripeSecretKey = await readParameter(secretParam, true);
  const stripePriceId = priceParam ? await readParameter(priceParam, false) : undefined;

  cachedConfig = { stripeSecretKey, stripePriceId };
  return cachedConfig;
}
