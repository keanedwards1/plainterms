/* /src/lib/plainterms-schema.ts */

import { z } from "zod";

/**
 * PlainTerms v1 — Result Page Output Contract (UI-focused)
 * - Sections are optional (hide if empty) by simply not including them.
 * - If included, status is either:
 *   - "present" (clearly stated)
 *   - "unclear" (mentioned but key details not clearly stated)
 * - Quotes are optional, max 3.
 * - soft_note is optional and should be VERY soft ("less common..." etc.)
 */

export const PtSectionStatus = z.enum(["present", "unclear"]);

export const PtSection = z.object({
  key: z.enum([
    "summary",
    "who_involved",
    "work_included",
    "timeline_termination",
    "pay_invoicing",
    "ownership_work",
    "confidentiality",
    "restrictions",
    "liability_responsibility",
    "disputes_governing_law",
    "practical_details",
    "questions_missing_info",
    "notices_disclaimers",
    "source_map"
  ]),
  status: PtSectionStatus,
  body: z.string(),
  quotes: z.array(z.string()).max(3).optional(),
  soft_note: z.string().optional()
});

export const PtRiskLabel = z.enum(["low", "medium", "high"]);
export const PtRecommendationAction = z.enum(["sign", "negotiate", "do_not_sign_yet"]);
export const PtFlagSeverity = z.enum(["low", "medium", "high"]);
export const PtClauseStatus = z.enum(["present", "unclear", "missing"]);
export const PtReportTier = z.enum(["scan_39", "report_69", "protect_99"]);

export const PtReportFlag = z.object({
  id: z.string(),
  severity: PtFlagSeverity,
  title: z.string(),
  plain_note: z.string(),
  related_fields: z.array(z.string()).optional(),
});

export const PtReportClause = z.object({
  key: z.string(),
  title: z.string(),
  status: PtClauseStatus,
  what_it_means: z.string(),
  why_it_matters: z.string(),
  evidence: z.string().optional(),
});

export const PtTierTeaser = z.object({
  headline: z.string(),
  bullets: z.array(z.string()),
  recommended: z.boolean().optional(),
  reasons: z.array(z.string()).optional(),
});

export const PtProtectUpsell = z.object({
  should_upsell_protect: z.boolean(),
  high_risk_or_critical: z.boolean(),
  advanced_risk_clause_set_detected: z.boolean(),
  high_severity_flags_threshold_met: z.boolean(),
  high_severity_flags: z.number().int().nonnegative(),
  reasons: z.array(z.string()),
});

export const PtProtectExtras = z.object({
  deeper_rewrites: z.array(
    z.object({
      id: z.string(),
      issue: z.string(),
      suggestion: z.string(),
    })
  ),
  fallback_positions: z.array(
    z.object({
      id: z.string(),
      position: z.string(),
    })
  ),
  negotiation_plan: z.array(z.string()),
  advanced_clause_coverage: z.array(
    z.object({
      key: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
    })
  ),
});

export const PtReport = z.object({
  tier: PtReportTier.optional(),
  risk: z.object({
    score: z.number().min(0).max(100),
    label: PtRiskLabel,
  }),
  recommendation: z.object({
    action: PtRecommendationAction,
    label: z.string(),
    reason: z.string(),
  }),
  red_flags: z.array(PtReportFlag),
  clause_breakdown: z.array(PtReportClause),
  negotiation_bullets: z
    .object({
      high: z.array(z.string()),
      medium: z.array(z.string()),
      low: z.array(z.string()),
    })
    .optional(),
  questions_to_ask: z.array(z.string()).optional(),
  creator_contract: z.boolean().optional(),
  protect_upsell: PtProtectUpsell.optional(),
  teaser_report_69: PtTierTeaser.optional(),
  teaser_protect_99: PtTierTeaser.optional(),
  protect_extras: PtProtectExtras.optional(),
});

export const SECTION_TITLES: Record<z.infer<typeof PtSection>["key"], string> = {
  summary: "Summary",
  who_involved: "Who’s Involved",
  work_included: "What Work Is Included",
  timeline_termination: "Timeline & Ending the Agreement",
  pay_invoicing: "Pay & Invoicing",
  ownership_work: "Ownership of Work",
  confidentiality: "Confidentiality",
  restrictions: "Restrictions",
  liability_responsibility: "Liability & Responsibility",
  disputes_governing_law: "Disputes & Governing Law",
  practical_details: "Practical Details",
  questions_missing_info: "Questions & Missing Info",
  notices_disclaimers: "Notices & Disclaimers",
  source_map: "Source Map"
};

export const PtResult = z.object({
  schema_version: z.literal("pt.ui.v1"),
  result_id: z.string(),
  created_at: z.string(), // ISO date-time
  headline: z.string(), // usually "Summary"
  overview: z.string(), // short calm overview
  gentle_notice: z.string().optional(), // Option B: gentle early notice
  sections: z.array(PtSection),
  report: PtReport.optional(),
  notices: z.object({
    not_legal_advice: z.string()
  })
});

export type PtResult = z.infer<typeof PtResult>;
export type PtSection = z.infer<typeof PtSection>;
