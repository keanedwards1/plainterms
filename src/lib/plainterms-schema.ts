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
  notices: z.object({
    not_legal_advice: z.string()
  })
});

export type PtResult = z.infer<typeof PtResult>;
export type PtSection = z.infer<typeof PtSection>;
