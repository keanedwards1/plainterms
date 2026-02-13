import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cachedConfig = null;

function getEnv(name, fallback = "") {
  return process.env[name] ?? fallback;
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

export async function getLlmConfig() {
  if (cachedConfig) return cachedConfig;

  const mode = getEnv("ANALYSIS_MODE", "rules");
  const baseUrl = getEnv("LLM_BASE_URL", "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = getEnv("LLM_MODEL", "gpt-4o-mini");

  const keyParam = getEnv("LLM_API_KEY_PARAM");
  const apiKeyFromEnv = getEnv("LLM_API_KEY");

  let apiKey = apiKeyFromEnv;
  if (!apiKey && keyParam) {
    apiKey = await readParameter(keyParam, true);
  }

  cachedConfig = {
    mode,
    baseUrl,
    model,
    apiKey,
  };
  return cachedConfig;
}

