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
export const PtAddonState = z.enum(["not_purchased", "purchased", "processing", "ready"]);

export const PtAddons = z.object({
  rewrite_contract: z.object({
    state: PtAddonState,
  }),
  update_email: z.object({
    state: PtAddonState,
  }),
});

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

export const PtClauseAlternatives = z.object({
  aggressive: z.string(),
  balanced: z.string(),
  minimum: z.string(),
});

export const PtPriorityStack = z.object({
  fight_for: z.array(z.string()),
  accept_if_pushback: z.array(z.string()),
  can_concede: z.array(z.string()),
});

export const PtProtectExtras = z.object({
  deeper_rewrites: z.array(
    z.object({
      id: z.string(),
      issue: z.string(),
      suggestion: z.string(),
      alternatives: PtClauseAlternatives.optional(),
    })
  ),
  fallback_positions: z.array(
    z.object({
      id: z.string(),
      position: z.string(),
    })
  ),
  negotiation_plan: z.array(z.string()),
  priority_stack: PtPriorityStack.optional(),
  advanced_clause_coverage: z.array(
    z.object({
      key: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
    })
  ),
});

export const PtDocumentRevisionStatus = z.enum([
  "processing",
  "ready",
  "failed",
  "not_needed",
  "not_available",
]);

export const PtDocumentRevisionChange = z.object({
  before: z.string(),
  after: z.string(),
  reason: z.string(),
  severity: PtFlagSeverity.optional(),
});

export const PtDocumentRevision = z.object({
  status: PtDocumentRevisionStatus,
  revised_text: z.string().optional(),
  summary: z.string().optional(),
  changes: z.array(PtDocumentRevisionChange).optional(),
  generated_at: z.string().optional(),
  model: z.string().optional(),
  message: z.string().optional(),
  /** Set when the revised draft is a Pro feature this viewer doesn't have. */
  locked: z.boolean().optional(),
});

export const PtResultDocument = z.object({
  file_name: z.string(),
  content_type: z.string().optional(),
  word_count: z.number().int().nonnegative().optional(),
  extracted_text: z.string().optional(),
  extracted_text_truncated: z.boolean().optional(),
  revision: PtDocumentRevision.optional(),
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
  negotiation_email_draft: z.string().optional(),
  negotiation_bullets: z
    .object({
      high: z.array(z.string()),
      medium: z.array(z.string()),
      low: z.array(z.string()),
    })
    .optional(),
  questions_to_ask: z.array(z.string()).optional(),
  creator_contract: z.boolean().optional(),
  renovation_contract: z.boolean().optional(),
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

export const PtEntitlements = z.object({
  plan: z.enum(["free", "pro"]),
  rewrites: z.boolean(),
  revised_document: z.boolean(),
  history: z.boolean(),
});

export type PtEntitlements = z.infer<typeof PtEntitlements>;

/**
 * review.v1: a lawyer-style review written for one side of the contract.
 * Powers the step-by-step result page. Results without it open in the classic view.
 */
const PtReviewSeverity = z.enum(["high", "medium", "low"]);

export const PtReviewIssue = z.object({
  id: z.string(),
  severity: PtReviewSeverity,
  priority: z.enum(["must", "worth", "nice"]),
  section_ref: z.string().default(""),
  title: z.string(),
  quote: z.string(),
  why: z.string(),
  why_short: z.string(),
  usual: z.string(),
  ask_short: z.string(),
  ask_email_line: z.string(),
  fallback: z.string(),
  walk_away_if: z.string().default(""),
  they_say: z.string().default(""),
  you_say: z.string().default(""),
  redline: z.object({ before: z.string(), after: z.string() }).nullable().optional(),
});

export const PtReview = z.object({
  version: z.literal("review.v1"),
  perspective: z.object({
    party: z.string(),
    role: z.string(),
    other_party: z.string(),
    other_role: z.string(),
    other_short: z.string(),
    parties: z.array(z.object({ name: z.string(), role: z.string() })).default([]),
    confidence: z.enum(["high", "medium", "low"]).default("medium"),
  }),
  verdict: z.object({
    action: z.enum(["sign", "negotiate", "do_not_sign_yet"]),
    headline: z.string(),
    line: z.string(),
  }),
  risk: z.object({ score: z.number().min(0).max(100), label: PtReviewSeverity }),
  deal: z.array(z.object({ label: z.string(), value: z.string(), flag: z.string().default("") })).default([]),
  gaps: z.array(z.string()).default([]),
  issues: z.array(PtReviewIssue).default([]),
  good: z.array(z.object({ section_ref: z.string().default(""), text: z.string() })).default([]),
  checklist: z.array(z.object({ title: z.string(), detail: z.string() })).default([]),
  sign_as_is: z.array(z.object({ severity: PtReviewSeverity, text: z.string() })).default([]),
  dates: z.array(z.object({ when: z.string(), what: z.string() })).default([]),
  what_ifs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  questions: z.array(z.string()).default([]),
  generated_at: z.string().optional(),
  model: z.string().optional(),
});

export type PtReview = z.infer<typeof PtReview>;
export type PtReviewIssue = z.infer<typeof PtReviewIssue>;

export const PtResult = z.object({
  schema_version: z.literal("pt.ui.v1"),
  result_id: z.string(),
  created_at: z.string(), // ISO date-time
  headline: z.string(), // usually "Summary"
  overview: z.string(), // short calm overview
  gentle_notice: z.string().optional(), // Option B: gentle early notice
  sections: z.array(PtSection),
  document: PtResultDocument.optional(),
  report: PtReport.optional(),
  addons: PtAddons.optional(),
  notices: z.object({
    not_legal_advice: z.string()
  }),
  // Present on results created by a signed-in user (accounts model).
  entitlements: PtEntitlements.optional(),
  analysis_stage: z.enum(["refining", "complete"]).optional(),
  owned: z.boolean().optional(),
  expires_at: z.number().nullable().optional(),
  // A malformed review never breaks the page: it drops out and the classic view shows.
  review: PtReview.optional().catch(undefined),
});

export type PtResult = z.infer<typeof PtResult>;
export type PtSection = z.infer<typeof PtSection>;
