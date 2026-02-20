export const REPORT_TIER_OPTIONS = ["scan_39", "report_69", "protect_99"] as const;

export type ReportTierOption = (typeof REPORT_TIER_OPTIONS)[number];

export const DEFAULT_REPORT_TIER: ReportTierOption = "report_69";

export const REPORT_TIER_LABELS: Record<ReportTierOption, string> = {
  scan_39: "Scan ($39)",
  report_69: "Report ($69)",
  protect_99: "Protect ($99)",
};
