import { readParameter } from "./ssm.mjs";
let cachedSecret = null;

export async function getPrecheckTokenSecret() {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.PRECHECK_TOKEN_SECRET;
  if (fromEnv && fromEnv.trim()) {
    cachedSecret = fromEnv.trim();
    return cachedSecret;
  }

  const secretParam = process.env.PRECHECK_TOKEN_SECRET_PARAM;
  if (!secretParam) {
    throw new Error(
      "Missing precheck token secret configuration. Set PRECHECK_TOKEN_SECRET or PRECHECK_TOKEN_SECRET_PARAM."
    );
  }

  cachedSecret = await readParameter(secretParam, true);
  return cachedSecret;
}
