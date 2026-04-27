import { REPORT_TIER_OPTIONS as SHARED_REPORT_TIER_OPTIONS } from "../../shared/contractOptions.mjs";

export const REPORT_TIER_OPTIONS = SHARED_REPORT_TIER_OPTIONS;

export type ReportTierOption = (typeof REPORT_TIER_OPTIONS)[number];

export const DEFAULT_REPORT_TIER: ReportTierOption = "report_69";

export const REPORT_TIER_NAMES: Record<ReportTierOption, string> = {
  scan_39: "Core",
  report_69: "Report",
  protect_99: "Protect",
};

export const REPORT_TIER_PRICES: Record<ReportTierOption, string> = {
  scan_39: "$29",
  report_69: "$79",
  protect_99: "$149",
};

export const REPORT_TIER_LABELS: Record<ReportTierOption, string> = {
  scan_39: `${REPORT_TIER_NAMES.scan_39} (${REPORT_TIER_PRICES.scan_39})`,
  report_69: `${REPORT_TIER_NAMES.report_69} (${REPORT_TIER_PRICES.report_69})`,
  protect_99: `${REPORT_TIER_NAMES.protect_99} (${REPORT_TIER_PRICES.protect_99})`,
};

export const REPORT_TIER_DESCRIPTIONS: Record<ReportTierOption, string> = {
  scan_39: "Initial issue spotting summary with priority clause risks.",
  report_69: "Expanded red-flag analysis with full clause-by-clause breakdown.",
  protect_99: "Adds fallback language options, action plan, and negotiation-ready draft.",
};
