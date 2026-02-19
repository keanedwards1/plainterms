export const ANALYSIS_MODE_OPTIONS = ["rules", "llm"] as const;
export const LLM_MODEL_OPTIONS = ["gpt-4o-mini", "gpt-5-mini", "gpt-5", "gpt-5.2"] as const;

export type AnalysisModeOption = (typeof ANALYSIS_MODE_OPTIONS)[number];
export type LlmModelOption = (typeof LLM_MODEL_OPTIONS)[number];

export const DEFAULT_ANALYSIS_MODE: AnalysisModeOption = "rules";
export const DEFAULT_LLM_MODEL: LlmModelOption = "gpt-4o-mini";
