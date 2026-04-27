import { normalizeAnalysisMode, normalizeLlmModel } from "./analysisSelection.mjs";
import { readParameter } from "./ssm.mjs";

let cachedApiKey = null;
let cachedApiKeyParamName = null;

function getEnv(name, fallback = "") {
  return process.env[name] ?? fallback;
}

export async function getLlmConfig() {
  const envMode = normalizeAnalysisMode(getEnv("ANALYSIS_MODE", "rules")) ?? "rules";
  const baseUrl = getEnv("LLM_BASE_URL", "https://api.openai.com/v1").replace(/\/+$/, "");
  const envModel = normalizeLlmModel(getEnv("LLM_MODEL", "gpt-4o-mini")) ?? "gpt-4o-mini";

  const keyParam = getEnv("LLM_API_KEY_PARAM");
  const apiKeyFromEnv = getEnv("LLM_API_KEY");

  let apiKey = apiKeyFromEnv;
  if (!apiKey && keyParam) {
    if (!cachedApiKey || cachedApiKeyParamName !== keyParam) {
      cachedApiKey = await readParameter(keyParam, true);
      cachedApiKeyParamName = keyParam;
    }
    apiKey = cachedApiKey;
  }

  return {
    mode: envMode,
    baseUrl,
    model: envModel,
    apiKey,
  };
}

export async function getLlmConfigWithOverrides(selection = {}) {
  const config = await getLlmConfig();
  const overrideMode = normalizeAnalysisMode(selection.analysisMode);
  const overrideModel = normalizeLlmModel(selection.llmModel);

  let mode = overrideMode ?? config.mode;
  if (!overrideMode && overrideModel) {
    mode = "llm";
  }

  return {
    mode,
    baseUrl: config.baseUrl,
    model: overrideModel ?? config.model,
    apiKey: config.apiKey,
  };
}
