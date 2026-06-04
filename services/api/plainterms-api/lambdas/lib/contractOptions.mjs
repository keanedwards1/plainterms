// Lambda-local copy of contract options.
// Keep this file in sync with /shared/contractOptions.mjs because Lambda
// deployment package (CodeUri: lambdas/) cannot import files outside lambdas/.
export const ANALYSIS_MODE_OPTIONS = ["rules", "llm"];
export const LLM_MODEL_OPTIONS = ["gpt-4o-mini", "gpt-5-mini", "gpt-5", "gpt-5.2", "gpt-5.5"];
export const REPORT_TIER_OPTIONS = ["scan_39", "report_69", "protect_99"];
export const ADDON_OPTIONS = ["rewrite_contract", "update_email"];
