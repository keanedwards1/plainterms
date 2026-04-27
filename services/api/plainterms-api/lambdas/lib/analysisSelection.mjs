import {
  ANALYSIS_MODE_OPTIONS,
  LLM_MODEL_OPTIONS,
  REPORT_TIER_OPTIONS,
} from "./contractOptions.mjs";
import {
  hasNonEmptyString,
  normalizeLowerTrimmedString,
} from "./stringNormalize.mjs";

export const ALLOWED_ANALYSIS_MODES = [...ANALYSIS_MODE_OPTIONS];
export const ALLOWED_LLM_MODELS = [...LLM_MODEL_OPTIONS];
export const ALLOWED_REPORT_TIERS = [...REPORT_TIER_OPTIONS];

const analysisModeSet = new Set(ALLOWED_ANALYSIS_MODES);
const llmModelSet = new Set(ALLOWED_LLM_MODELS);
const reportTierSet = new Set(ALLOWED_REPORT_TIERS);

export function normalizeAnalysisMode(value) {
  const normalized = normalizeLowerTrimmedString(value);
  if (!normalized) return null;
  return analysisModeSet.has(normalized) ? normalized : null;
}

export function normalizeLlmModel(value) {
  const normalized = normalizeLowerTrimmedString(value);
  if (!normalized) return null;
  return llmModelSet.has(normalized) ? normalized : null;
}

export function normalizeReportTier(value) {
  const normalized = normalizeLowerTrimmedString(value);
  if (!normalized) return null;
  return reportTierSet.has(normalized) ? normalized : null;
}

export function parseAnalysisSelection(input = {}) {
  const analysisModeProvided = hasNonEmptyString(input.analysisMode);
  const llmModelProvided = hasNonEmptyString(input.llmModel);
  const reportTierProvided = hasNonEmptyString(input.reportTier);

  const analysisMode = normalizeAnalysisMode(input.analysisMode);
  const llmModel = normalizeLlmModel(input.llmModel);
  const reportTier = normalizeReportTier(input.reportTier);

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

  if (reportTierProvided && !reportTier) {
    return {
      ok: false,
      error: `reportTier must be one of: ${ALLOWED_REPORT_TIERS.join(", ")}`,
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
      reportTier: reportTier ?? "report_69",
    },
  };
}
