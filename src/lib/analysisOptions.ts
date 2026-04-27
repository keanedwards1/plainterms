import {
  ANALYSIS_MODE_OPTIONS as SHARED_ANALYSIS_MODE_OPTIONS,
  LLM_MODEL_OPTIONS as SHARED_LLM_MODEL_OPTIONS,
} from "../../shared/contractOptions.mjs";

export const ANALYSIS_MODE_OPTIONS = SHARED_ANALYSIS_MODE_OPTIONS;
export const LLM_MODEL_OPTIONS = SHARED_LLM_MODEL_OPTIONS;

export type AnalysisModeOption = (typeof ANALYSIS_MODE_OPTIONS)[number];
export type LlmModelOption = (typeof LLM_MODEL_OPTIONS)[number];

export const DEFAULT_ANALYSIS_MODE: AnalysisModeOption = "rules";
export const DEFAULT_LLM_MODEL: LlmModelOption = "gpt-4o-mini";
