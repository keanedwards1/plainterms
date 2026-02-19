export const ALLOWED_ANALYSIS_MODES = ["rules", "llm"];
export const ALLOWED_LLM_MODELS = ["gpt-4o-mini", "gpt-5-mini", "gpt-5", "gpt-5.2"];

const analysisModeSet = new Set(ALLOWED_ANALYSIS_MODES);
const llmModelSet = new Set(ALLOWED_LLM_MODELS);

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function normalizeAnalysisMode(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return analysisModeSet.has(normalized) ? normalized : null;
}

export function normalizeLlmModel(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return llmModelSet.has(normalized) ? normalized : null;
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseAnalysisSelection(input = {}) {
  const analysisModeProvided = hasNonEmptyString(input.analysisMode);
  const llmModelProvided = hasNonEmptyString(input.llmModel);

  const analysisMode = normalizeAnalysisMode(input.analysisMode);
  const llmModel = normalizeLlmModel(input.llmModel);

  if (analysisModeProvided && !analysisMode) {
    return {
      ok: false,
      error: `analysisMode must be one of: ${ALLOWED_ANALYSIS_MODES.join(", ")}`,
    };
  }

  if (llmModelProvided && !llmModel) {
    return {
      ok: false,
      error: `llmModel must be one of: ${ALLOWED_LLM_MODELS.join(", ")}`,
    };
  }

  let selectedMode = analysisMode;
  if (!selectedMode && llmModel) selectedMode = "llm";

  let selectedModel = llmModel;
  if (selectedMode === "rules") {
    selectedModel = null;
  }

  return {
    ok: true,
    selection: {
      analysisMode: selectedMode,
      llmModel: selectedModel,
    },
  };
}
