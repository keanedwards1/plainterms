import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cachedSecret = null;

async function readParameter(name, withDecryption = false) {
  const cmd = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });
  const res = await ssm.send(cmd);
  const value = res?.Parameter?.Value;
  if (!value) {
    throw new Error(`SSM parameter has no value: ${name}`);
  }
  return value;
}

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
