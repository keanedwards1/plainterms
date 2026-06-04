import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import crypto from "node:crypto";
import {
  assertPtUiV1Contract,
  assertPtV1Contract,
  transformPtV1ToUiV1,
} from "./ptTransform.mjs";
import { extractDocumentTextFromUpload } from "./extractDocumentText.mjs";
import { analyzeExtractedTextWithLlm } from "./llmAnalyze.mjs";
import { generateNegotiationEmailDraftWithLlm } from "./llmNegotiationEmail.mjs";
import { validateObjectKey, validateUploadMeta } from "./uploadPolicy.mjs";
import { buildReportInsights } from "./reportEngine.mjs";
import { createResultAccessKey, hashResultAccessKey } from "./resultAccessKey.mjs";
import { ADDON_OPTIONS, REPORT_TIER_OPTIONS } from "./contractOptions.mjs";

const db = new DynamoDBClient({});
const REPORT_TIERS = new Set(REPORT_TIER_OPTIONS);
const ADDON_KEYS = [...ADDON_OPTIONS];
const ADDON_KEY_SET = new Set(ADDON_KEYS);
const MAX_EXTRACTED_TEXT_CHARS = 12000;
const CRITICAL_CLAUSE_KEYS = new Set(["scope", "payment", "termination", "ip", "liability"]);
const ADVANCED_RISK_CLAUSE_KEYS = new Set([
  "liability",
  "warranty",
  "assignment_subcontracting",
  "restrictions",
  "disputes",
]);

function makeResultId() {
  return `pt_${Date.now()}_${crypto.randomUUID()}`;
}

function getRetentionDays() {
  const raw = Number(process.env.RESULT_TTL_DAYS ?? "30");
  if (!Number.isFinite(raw) || raw <= 0) return 30;
  return Math.floor(raw);
}

function normalizeReportTier(value) {
  const normalized =
    typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "report_69";
  return REPORT_TIERS.has(normalized) ? normalized : "report_69";
}

function normalizeSelectedAddons(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const selected = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized || !ADDON_KEY_SET.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    selected.push(normalized);
  }
  return selected;
}

function buildAddonStates(selectedAddons) {
  const selected = new Set(normalizeSelectedAddons(selectedAddons));
  return {
    rewrite_contract: selected.has("rewrite_contract") ? "purchased" : "not_purchased",
    update_email: selected.has("update_email") ? "purchased" : "not_purchased",
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasMeaningfulRevisionTargets(uiResult) {
  const flags = asArray(uiResult?.report?.red_flags);
  const clauses = asArray(uiResult?.report?.clause_breakdown);
  const hasPriorityFlags = flags.some((flag) => flag?.severity === "high" || flag?.severity === "medium");
  const hasUnclearClauses = clauses.some(
    (clause) => clause?.status === "missing" || clause?.status === "unclear"
  );
  return hasPriorityFlags || hasUnclearClauses;
}

function withDocumentRevision(uiResult, revision) {
  return {
    ...uiResult,
    document: {
      ...(uiResult?.document ?? {}),
      revision,
    },
  };
}

function buildInitialDocumentRevision(uiResult) {
  const tier = typeof uiResult?.report?.tier === "string" ? uiResult.report.tier : "report_69";
  if (tier === "scan_39") {
    return {
      status: "not_available",
      message: "Document review is available in Report and Protect tiers.",
    };
  }
  const extracted =
    typeof uiResult?.document?.extracted_text === "string" ? uiResult.document.extracted_text : "";
  if (!extracted.trim()) {
    return {
      status: "not_available",
      message: "Document text was not available for revision generation.",
    };
  }
  if (!hasMeaningfulRevisionTargets(uiResult)) {
    return {
      status: "not_needed",
      message: "No material wording risks were identified for automated revision.",
    };
  }
  return {
    status: "processing",
    message: "Generating revised wording in the background.",
  };
}

function revisionWorkerNameFromEnv() {
  return (
    process.env.DOCUMENT_REVISION_FUNCTION_NAME ||
    process.env.DOCUMENT_REVISION_FUNCTION_ARN ||
    ""
  ).trim();
}

async function queueDocumentRevisionJob(resultId) {
  const workerName = revisionWorkerNameFromEnv();
  if (!workerName) return false;

  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  const lambda = new LambdaClient({});
  const cmd = new InvokeCommand({
    FunctionName: workerName,
    InvocationType: "Event",
    Payload: Buffer.from(JSON.stringify({ resultId })),
  });
  await lambda.send(cmd);
  return true;
}

function buildProtectUpsellSignals(report) {
  const clauses = asArray(report?.clause_breakdown);
  const flags = asArray(report?.red_flags);
  const riskScore = Number(report?.risk?.score ?? 0);
  const highSeverityFlags = flags.filter((flag) => flag?.severity === "high").length;

  const criticalClauseDetected = clauses.some(
    (clause) =>
      CRITICAL_CLAUSE_KEYS.has(String(clause?.key ?? "")) && clause?.status !== "present"
  );
  const advancedRiskClauseDetected = clauses.some(
    (clause) =>
      ADVANCED_RISK_CLAUSE_KEYS.has(String(clause?.key ?? "")) && clause?.status !== "present"
  );

  const highRiskOrCritical = riskScore >= 70 || criticalClauseDetected;
  const highSeverityThresholdMet = highSeverityFlags >= 4;
  const shouldUpsellProtect =
    highRiskOrCritical || advancedRiskClauseDetected || highSeverityThresholdMet;

  const reasons = [];
  if (highRiskOrCritical) reasons.push("High-risk score or critical clause issue detected.");
  if (advancedRiskClauseDetected) reasons.push("Advanced-risk clause set detected.");
  if (highSeverityThresholdMet) reasons.push("Multiple high-severity flags detected.");

  return {
    should_upsell_protect: shouldUpsellProtect,
    high_risk_or_critical: highRiskOrCritical,
    advanced_risk_clause_set_detected: advancedRiskClauseDetected,
    high_severity_flags_threshold_met: highSeverityThresholdMet,
    high_severity_flags: highSeverityFlags,
    reasons,
  };
}

function buildAlternatives(flag) {
  const title = String(flag?.title ?? "").toLowerCase();

  if (/indemn/.test(title)) {
    return {
      aggressive: "Request mutual indemnity, capped at the total fees paid under this agreement, covering only each party's own actions.",
      balanced: "Accept one-sided indemnity but cap your exposure at the total contract value with a carve-out for gross negligence.",
      minimum: "Confirm the indemnity scope is limited to third-party claims and does not cover the other party's own negligence.",
    };
  }
  if (/ip|intellectual property|ownership|usage rights/.test(title)) {
    return {
      aggressive: "Request that all IP created remains yours, with a limited, revocable license granted to the client for the agreed purpose only.",
      balanced: "Accept work-for-hire for final deliverables but retain rights to underlying tools, methods, and any pre-existing work.",
      minimum: "Ensure the license is scoped to the specific campaign or project with no sublicensing or paid media reuse without additional compensation.",
    };
  }
  if (/payment|fee|compensation|invoice/.test(title)) {
    return {
      aggressive: "Request 50% upfront with the balance due within 15 days of delivery, plus a 1.5%/month late fee.",
      balanced: "Accept net-30 terms but add a late fee clause and a kill fee equal to work completed if the client cancels.",
      minimum: "Confirm a clear payment due date and that disputing part of an invoice does not excuse late payment on undisputed amounts.",
    };
  }
  if (/scope|deliverable/.test(title)) {
    return {
      aggressive: "Request a fully detailed scope attachment with explicit revision limits, milestone sign-offs, and a written change order process.",
      balanced: "Accept a general scope but add a clause capping revisions at two rounds and requiring written approval for scope additions.",
      minimum: "Confirm the deliverables list is attached and signed, not just referenced by name.",
    };
  }
  if (/exclusiv|non.?compete|restrict/.test(title)) {
    return {
      aggressive: "Request removal of all exclusivity and post-term restrictions entirely.",
      balanced: "Accept narrow exclusivity limited to a specific competitor category, capped at the contract term only.",
      minimum: "Ensure the restriction has a defined end date and does not apply to existing client relationships.",
    };
  }
  if (/liability|cap/.test(title)) {
    return {
      aggressive: "Request a mutual liability cap equal to total fees paid, with carve-outs only for willful misconduct or fraud.",
      balanced: "Accept a one-sided cap but ensure the dollar amount is stated explicitly and is proportionate to contract value.",
      minimum: "Confirm the cap is stated in dollar terms rather than left open-ended, regardless of which party it applies to.",
    };
  }
  if (/terminat|term\b/.test(title)) {
    return {
      aggressive: "Request mutual termination for convenience with 14-day notice and a kill fee equal to all work completed to date.",
      balanced: "Accept the other side's termination rights if a defined kill fee is included for completed work.",
      minimum: "Ensure there is a defined notice period and that termination does not forfeit fees already earned.",
    };
  }
  if (/governing law|jurisdiction|venue/.test(title)) {
    return {
      aggressive: "Request governing law and venue in your home state.",
      balanced: "Accept the other party's jurisdiction if the contract value is low enough that litigation is unlikely in practice.",
      minimum: "Confirm that any mandatory arbitration clause is mutual and not buried in the jurisdiction section.",
    };
  }
  if (/approval/.test(title)) {
    return {
      aggressive: "Request final approval rights over all content before any posting, with a defined turnaround window and deemed-approval clause.",
      balanced: "Accept a review window (e.g. 48 hours) after which silence equals approval, with one round of edits included.",
      minimum: "Ensure you have the right to review and flag concerns before content goes live, even if approval is not guaranteed.",
    };
  }
  return {
    aggressive: "Push for full removal or complete revision of this clause in your favor.",
    balanced: "Negotiate this clause to be mutual, capped in scope and duration, with both parties' obligations stated clearly.",
    minimum: "At minimum, confirm the clause boundaries are explicit and measurable, not left to one party's sole discretion.",
  };
}

function buildPriorityStack(flags) {
  const toLabel = (flag) =>
    String(flag?.title ?? "")
      .replace(/\s+is not clearly stated$/i, "")
      .replace(/\s+appears unclear$/i, "")
      .trim();

  const fightFor = flags.filter((f) => f?.severity === "high").slice(0, 3).map(toLabel).filter(Boolean);
  const acceptIfPushback = flags.filter((f) => f?.severity === "medium").slice(0, 3).map(toLabel).filter(Boolean);
  const canConcede = flags.filter((f) => f?.severity === "low").slice(0, 2).map(toLabel).filter(Boolean);

  return { fight_for: fightFor, accept_if_pushback: acceptIfPushback, can_concede: canConcede };
}

function applyTierToReport(baseReport, selectedTier) {
  const tier = normalizeReportTier(selectedTier);
  const report = JSON.parse(JSON.stringify(baseReport ?? {}));
  const protectUpsell = buildProtectUpsellSignals(report);

  report.tier = tier;
  report.protect_upsell = protectUpsell;
  report.teaser_report_69 = {
    headline: "Upgrade to Report ($79)",
    bullets: [
      "Unlock full clause-by-clause breakdown.",
      "Get complete negotiation bullets and clearer next-step guidance.",
      "Includes follow-up Q&A capability in the report tier workflow.",
    ],
  };
  report.teaser_protect_99 = {
    headline: "Upgrade to Protect ($149)",
    bullets: [
      "Deeper rewrite suggestions with fallback positions.",
      "Advanced clause coverage and stronger negotiation plan.",
      "Best for high-risk or complex agreements.",
    ],
    recommended: protectUpsell.should_upsell_protect,
    reasons: protectUpsell.reasons,
  };

  if (tier === "scan_39") {
    report.red_flags = asArray(report.red_flags).slice(0, 3);
    report.clause_breakdown = asArray(report.clause_breakdown)
      .filter((clause) => clause?.status === "present")
      .slice(0, 4);
    report.negotiation_bullets = { high: [], medium: [], low: [] };
    report.questions_to_ask = [];
    report.recommendation = {
      action: "negotiate",
      label: "Review required",
      reason:
        "This is a quick scan preview. Upgrade for full clause coverage, negotiation bullets, and follow-up guidance.",
    };
  }

  if (tier === "protect_99") {
    const topFlags = asArray(report.red_flags).slice(0, 6);
    const allFlags = asArray(report.red_flags);
    const advancedCoverage = asArray(report.clause_breakdown)
      .filter((clause) => ADVANCED_RISK_CLAUSE_KEYS.has(String(clause?.key ?? "")))
      .map((clause) => ({
        key: clause?.key,
        title: clause?.title,
        status: clause?.status,
      }));
    const negotiationPlan = [
      ...asArray(report?.negotiation_bullets?.high),
      ...asArray(report?.negotiation_bullets?.medium),
    ].slice(0, 10);

    report.protect_extras = {
      deeper_rewrites: topFlags.map((flag, idx) => ({
        id: `rw_${idx + 1}`,
        issue: flag?.title ?? "Risk issue",
        suggestion: flag?.plain_note ?? "Clarify and narrow this clause.",
        alternatives: buildAlternatives(flag),
      })),
      fallback_positions: topFlags.map((flag, idx) => ({
        id: `fb_${idx + 1}`,
        position: `Fallback for "${String(flag?.title ?? "this issue").replace(/\s+is not clearly stated$/i, "").replace(/\s+appears unclear$/i, "").trim()}": request narrower scope, shorter duration, and explicit mutuality where applicable.`,
      })),
      negotiation_plan: negotiationPlan,
      priority_stack: buildPriorityStack(allFlags),
      advanced_clause_coverage: advancedCoverage,
    };
  }

  report.negotiation_email_draft = buildNegotiationEmailDraft({
    report,
    tier,
  });

  return report;
}

function buildNegotiationEmailDraft({ report, tier }) {
  const recommendationLabel = typeof report?.recommendation?.label === "string"
    ? report.recommendation.label.trim()
    : "";
  const recommendationReason = typeof report?.recommendation?.reason === "string"
    ? report.recommendation.reason.trim()
    : "";
  const flags = Array.isArray(report?.red_flags) ? report.red_flags : [];
  const questions = Array.isArray(report?.questions_to_ask) ? report.questions_to_ask : [];

  const topFlags = flags
    .filter((flag) => typeof flag?.title === "string" && typeof flag?.plain_note === "string")
    .slice(0, 4);
  const topQuestions = questions
    .filter((item) => typeof item === "string" && item.trim())
    .slice(0, 3);

  const lines = [
    "Subject: Requested updates to agreement terms",
    "",
    "Hi [Name],",
    "",
    "Thanks again for sharing the agreement. I reviewed the current draft and would like to request a few updates before signing.",
    "",
  ];

  if (topFlags.length > 0) {
    lines.push("Key updates requested:");
    const revisionRequests = [
      "Please tighten this clause so responsibilities and risk are explicit for both sides.",
      "Please clarify the boundaries and obligations in this section before signature.",
      "Please revise this language so the commercial and legal expectations are unambiguous.",
    ];
    topFlags.forEach((flag, idx) => {
      const cleanedTitle = String(flag.title)
        .replace(/\s+is not clearly stated$/i, "")
        .replace(/\s+appears unclear$/i, "")
        .trim();
      const titleText = cleanedTitle || "Contract clause";
      lines.push(`- ${titleText}: ${revisionRequests[idx % revisionRequests.length]}`);
    });
    lines.push("");
  } else {
    lines.push("I have a few clarification requests to confirm expectations for both sides.");
    lines.push("");
  }

  if (topQuestions.length > 0) {
    lines.push("Questions to confirm as you revise:");
    topQuestions.forEach((question) => {
      lines.push(`- ${question}`);
    });
    lines.push("");
  }

  if (recommendationLabel || recommendationReason) {
    lines.push(
      `Current review recommendation: ${recommendationLabel || "Negotiate"}${
        recommendationReason ? `. ${recommendationReason}` : "."
      }`
    );
    lines.push("");
  }

  if (tier === "scan_39") {
    lines.push("This request is based on the quick scan summary, and I may add a few details after deeper review.");
    lines.push("");
  }

  lines.push("If you can share a revised draft reflecting these points, I can review it quickly.");
  lines.push("");
  lines.push("Thank you,");
  lines.push("[Your Name]");

  return lines.join("\n");
}

function statusFromClauseStatus(status) {
  if (status === "present") return "found";
  if (status === "missing") return "not_found";
  return "not_clearly_stated";
}

function fallbackField(summary) {
  return {
    status: "not_clearly_stated",
    summary,
    quotes: [],
    sources: [],
  };
}

function makeFieldFromClause(clause, fallbackSummary) {
  if (!clause) return fallbackField(fallbackSummary);
  const quote = typeof clause.evidence === "string" ? clause.evidence.trim() : "";
  return {
    status: statusFromClauseStatus(clause.status),
    summary: clause.what_it_means || fallbackSummary,
    quotes: quote ? [quote] : [],
    sources: [],
  };
}

function clauseByKey(report, key) {
  const list = Array.isArray(report?.clause_breakdown) ? report.clause_breakdown : [];
  return list.find((item) => item?.key === key);
}

function makeOverviewFallback({ report }) {
  const risk = report?.risk?.label ?? "medium";
  const flagCount = Array.isArray(report?.red_flags) ? report.red_flags.length : 0;
  const creator = Boolean(report?.creator_contract);

  if (creator) {
    return `This appears to be a creator/model-focused services agreement with a ${risk} risk profile and ${flagCount} identified risk ${
      flagCount === 1 ? "flag" : "flags"
    }.`;
  }

  return `This appears to be a professional services agreement with a ${risk} risk profile and ${flagCount} identified risk ${
    flagCount === 1 ? "flag" : "flags"
  }.`;
}

function makePtV1({ resultId, createdAt, payload, extraction, analysis, report, selectedAddons }) {
  const filename = typeof payload.filename === "string" ? payload.filename : "Contract document";
  const extractedTextRaw = typeof extraction.extractedText === "string" ? extraction.extractedText : "";
  const extractedTextPreview = extractedTextRaw.slice(0, MAX_EXTRACTED_TEXT_CHARS);
  const extractedTextTruncated = extractedTextRaw.length > extractedTextPreview.length;
  const llmFields = analysis?.fields;
  const notes = [...extraction.extraction.notes];
  if (analysis?.usedLlm) {
    notes.push("analysis_mode:llm");
    if (analysis?.model) notes.push(`llm_model:${analysis.model}`);
  } else {
    notes.push(`analysis_mode:rules (${analysis?.reason || "unknown"})`);
  }

  const overviewField =
    llmFields?.overview ??
    {
      status: "found",
      summary: makeOverviewFallback({ report }),
      quotes: [],
      sources: [],
    };
  const purposeField =
    llmFields?.contractPurpose ??
    {
      status: "found",
      summary: "The contract sets practical terms for services, payment, and responsibilities between the parties.",
      quotes: [],
      sources: [],
    };
  const clientField =
    llmFields?.partiesClient ??
    {
      status: "not_clearly_stated",
      summary: "Client identity may be present but is not clearly extracted yet.",
      quotes: [],
      sources: [],
    };
  const contractorField =
    llmFields?.partiesContractor ??
    {
      status: "not_clearly_stated",
      summary: "Contractor identity may be present but is not clearly extracted yet.",
      quotes: [],
      sources: [],
    };
  const scopeField =
    llmFields?.scopeServices ??
    {
      status: "not_clearly_stated",
      summary: "Service details may rely on attachments or sections that were not clearly extracted.",
      quotes: [],
      sources: [],
    };
  const termField =
    llmFields?.termTermination ??
    {
      status: "not_clearly_stated",
      summary: "Term and termination rights were not clearly extracted.",
      quotes: [],
      sources: [],
    };
  const paymentField =
    llmFields?.payment ??
    {
      status: "not_clearly_stated",
      summary: "Payment structure may be present but was not fully extracted.",
      quotes: [],
      sources: [],
    };
  const confidentialityField =
    llmFields?.confidentiality ??
    {
      status: "not_clearly_stated",
      summary: "Confidentiality terms may be present but were not fully extracted.",
      quotes: [],
      sources: [],
    };

  const ipField = makeFieldFromClause(
    clauseByKey(report, "ip"),
    "IP ownership and license terms were not clearly extracted."
  );
  const creatorUsageField = makeFieldFromClause(
    clauseByKey(report, "creator_usage"),
    "Creator/model usage rights were not clearly extracted."
  );
  const restrictionField = makeFieldFromClause(
    clauseByKey(report, "restrictions"),
    "Restrictive covenant terms were not clearly extracted."
  );
  const liabilityField = makeFieldFromClause(
    clauseByKey(report, "liability"),
    "Liability and indemnity terms were not clearly extracted."
  );
  const disputesField = makeFieldFromClause(
    clauseByKey(report, "disputes"),
    "Dispute resolution and governing law terms were not clearly extracted."
  );
  const assignmentField = makeFieldFromClause(
    clauseByKey(report, "assignment_subcontracting"),
    "Assignment and subcontracting terms were not clearly extracted."
  );

  const redFlags = Array.isArray(report?.red_flags) ? report.red_flags : [];
  const flagSummaryText =
    redFlags.length > 0
      ? `Detected ${redFlags.length} potential risk flags. Highest severity items should be reviewed before signing.`
      : "No high-priority flags were detected from the extracted text, but clarification may still be useful.";

  return {
    schema_version: "pt.v1",
    result_id: resultId,
    created_at: createdAt,
    document: {
      title: filename,
      content_type: payload.contentType,
      contract_type: "independent_contractor_services_agreement",
      jurisdiction_hint: "not_found",
      page_count: 0,
      word_count: extraction.extractedText ? extraction.extractedText.split(/\s+/).length : 0,
      confidence_notes: notes,
      extracted_text: extractedTextPreview,
      extracted_text_truncated: extractedTextTruncated,
    },
    sections: {
      document_overview: {
        heading: "Document Overview",
        plain_summary: overviewField,
        contract_purpose: purposeField,
      },
      parties: {
        heading: "Parties",
        client: clientField,
        contractor: contractorField,
      },
      scope_of_services: {
        heading: "Scope of Services",
        services_description: scopeField,
      },
      term_and_termination: {
        heading: "Term & Termination",
        termination_for_convenience: termField,
      },
      payment: {
        heading: "Payment",
        fee_structure: paymentField,
      },
      confidentiality: {
        heading: "Confidentiality",
        confidentiality_info: confidentialityField,
      },
      intellectual_property: {
        heading: "Intellectual Property",
        work_product_ownership: ipField,
        license_grants: creatorUsageField,
      },
      non_solicit_non_compete: {
        heading: "Non-Solicitation / Non-Competition",
        non_compete: restrictionField,
      },
      liability_indemnity_insurance: {
        heading: "Liability, Indemnity & Insurance",
        limitation_of_liability: liabilityField,
        indemnification: liabilityField,
      },
      dispute_resolution_and_governing_law: {
        heading: "Dispute Resolution & Governing Law",
        governing_law: disputesField,
      },
      operational_details: {
        heading: "Operational Details",
        assignment: assignmentField,
      },
      flags_and_clarifications: {
        heading: "Flags & Clarifications",
        flags_overview: {
          status: redFlags.length > 0 ? "found" : "not_found",
          summary: flagSummaryText,
          quotes: [],
          sources: [],
        },
        high_priority: report?.flags_section?.high_priority ?? [],
        all_flags_summary: report?.flags_section?.all_flags_summary ?? [],
      },
      notices_and_disclaimers: {
        heading: "Notices & Disclaimers",
        notice_summary: {
          status: "found",
          summary:
            "This output is informational and should be used as preparation for negotiation or attorney review.",
          quotes: [],
          sources: [],
        },
      },
      source_map_section: {
        heading: "Source Map",
        source_summary: {
          status: "found",
          summary:
            "Risk findings are based on extracted text snippets and may require original-document validation.",
          quotes: [],
          sources: [],
        },
      },
    },
    flags: redFlags,
    notices: {
      not_legal_advice: "This summary is for informational purposes only and is not legal advice.",
      limits: [],
      tone_policy: [],
    },
    addons: buildAddonStates(selectedAddons),
    report: {
      ...report,
    },
    source_map: { items: [] },
  };
}

function resolveFinalAnalysisSelection(analysisSelection, reportTier) {
  // Explicit llm override from internal settings — respect it for manual testing.
  if (analysisSelection.analysisMode === "llm" && analysisSelection.llmModel) {
    return { analysisMode: "llm", llmModel: analysisSelection.llmModel, abVariant: "override" };
  }

  // Protect tier always uses gpt-5.5, no A/B test.
  if (reportTier === "protect_99") {
    return { analysisMode: "llm", llmModel: "gpt-5.5", abVariant: "protect" };
  }

  // Core and Report tiers: 50/50 between rules (variant_a) and gpt-5.2 (variant_b).
  const abVariant = Math.random() < 0.5 ? "a_rules" : "b_gpt52";
  if (abVariant === "b_gpt52") {
    return { analysisMode: "llm", llmModel: "gpt-5.2", abVariant };
  }
  return { analysisMode: "rules", llmModel: null, abVariant };
}

export async function runAnalysis(payload, analysisSelection = {}, addonSelection = {}) {
  const objectKeyCheck = validateObjectKey(payload?.objectKey);
  if (!objectKeyCheck.ok) {
    throw new Error(objectKeyCheck.error);
  }

  const metaCheck = validateUploadMeta({
    filename: payload?.filename,
    contentType: payload?.contentType,
    size: payload?.size,
    requireSize: true,
  });
  if (!metaCheck.ok) {
    throw new Error(metaCheck.error);
  }

  const normalizedPayload = {
    objectKey: objectKeyCheck.objectKey,
    filename: metaCheck.filename,
    contentType: metaCheck.contentType,
    size: metaCheck.size,
  };

  const resultId = makeResultId();
  const resultAccessKey = createResultAccessKey();
  const resultAccessKeyHash = hashResultAccessKey(resultAccessKey);
  const createdAt = new Date().toISOString();
  const expiresAtEpoch = Math.floor(Date.now() / 1000) + getRetentionDays() * 24 * 60 * 60;

  const selectedTier = normalizeReportTier(analysisSelection?.reportTier);
  const finalSelection = resolveFinalAnalysisSelection(analysisSelection, selectedTier);

  const bucket = process.env.UPLOAD_BUCKET;
  const extraction = await extractDocumentTextFromUpload({
    bucket,
    objectKey: normalizedPayload.objectKey,
    filename: normalizedPayload.filename,
    contentType: normalizedPayload.contentType,
  });

  let llmAnalysis = { usedLlm: false, reason: "not_attempted", fields: null };
  try {
    llmAnalysis = await analyzeExtractedTextWithLlm({
      filename: normalizedPayload.filename,
      contentType: normalizedPayload.contentType,
      extractedText: extraction.extractedText,
      analysisMode: finalSelection.analysisMode,
      llmModel: finalSelection.llmModel,
    });
  } catch (err) {
    llmAnalysis = {
      usedLlm: false,
      reason: `llm_error:${err instanceof Error ? err.message : String(err)}`,
      fields: null,
    };
  }

  const reportInsights = buildReportInsights({
    extractedText: extraction.extractedText,
    llmFields: llmAnalysis?.fields,
  });
  const tieredReportInsights = applyTierToReport(reportInsights, selectedTier);
  try {
    const llmEmailDraft = await generateNegotiationEmailDraftWithLlm({
      report: tieredReportInsights,
      tier: selectedTier,
      analysisSelection: finalSelection,
    });
    if (llmEmailDraft?.ok && llmEmailDraft.draft) {
      tieredReportInsights.negotiation_email_draft = llmEmailDraft.draft;
    }
  } catch {
    // Keep deterministic fallback draft when LLM email generation fails.
  }

  const ptV1 = makePtV1({
    resultId,
    createdAt,
    payload: normalizedPayload,
    extraction,
    analysis: llmAnalysis,
    report: tieredReportInsights,
    selectedAddons: addonSelection?.selectedAddons,
  });
  assertPtV1Contract(ptV1);
  let uiResult = transformPtV1ToUiV1(ptV1);
  const initialRevision = buildInitialDocumentRevision(uiResult);
  uiResult = withDocumentRevision(uiResult, initialRevision);
  assertPtUiV1Contract(uiResult);

  const cmd = new PutItemCommand({
    TableName: process.env.RESULTS_TABLE,
    Item: {
      result_id: { S: resultId },
      created_at: { S: createdAt },
      expires_at: { N: String(expiresAtEpoch) },
      object_key: { S: normalizedPayload.objectKey },
      access_key_hash: { S: resultAccessKeyHash },
      status: { S: "complete" },
      ab_variant: { S: finalSelection.abVariant },
      pt_v1_result: { S: JSON.stringify(ptV1) },
      ui_result: { S: JSON.stringify(uiResult) },
    },
  });

  await db.send(cmd);
  if (initialRevision.status === "processing") {
    try {
      await queueDocumentRevisionJob(resultId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Revision generation could not be started.";
      const failedUiResult = withDocumentRevision(uiResult, {
        status: "failed",
        message: `Background revision start failed: ${String(message).slice(0, 240)}`,
      });
      await db.send(
        new UpdateItemCommand({
          TableName: process.env.RESULTS_TABLE,
          Key: {
            result_id: { S: resultId },
          },
          UpdateExpression: "SET ui_result = :ui",
          ExpressionAttributeValues: {
            ":ui": { S: JSON.stringify(failedUiResult) },
          },
        })
      );
    }
  }
  return { resultId, accessKey: resultAccessKey };
}
