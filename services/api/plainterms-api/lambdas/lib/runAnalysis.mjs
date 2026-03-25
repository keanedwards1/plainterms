import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import crypto from "node:crypto";
import {
  assertPtUiV1Contract,
  assertPtV1Contract,
  transformPtV1ToUiV1,
} from "./ptTransform.mjs";
import { extractDocumentTextFromUpload } from "./extractDocumentText.mjs";
import { analyzeExtractedTextWithLlm } from "./llmAnalyze.mjs";
import { validateObjectKey, validateUploadMeta } from "./uploadPolicy.mjs";
import { buildReportInsights } from "./reportEngine.mjs";
import { createResultAccessKey, hashResultAccessKey } from "./resultAccessKey.mjs";

const db = new DynamoDBClient({});
const REPORT_TIERS = new Set(["scan_39", "report_69", "protect_99"]);
const ADDON_KEYS = ["rewrite_contract", "update_email"];
const ADDON_KEY_SET = new Set(ADDON_KEYS);
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

function applyTierToReport(baseReport, selectedTier) {
  const tier = normalizeReportTier(selectedTier);
  const report = JSON.parse(JSON.stringify(baseReport ?? {}));
  const protectUpsell = buildProtectUpsellSignals(report);

  report.tier = tier;
  report.protect_upsell = protectUpsell;
  report.teaser_report_69 = {
    headline: "Upgrade to Report ($69)",
    bullets: [
      "Unlock full clause-by-clause breakdown.",
      "Get complete negotiation bullets and clearer next-step guidance.",
      "Includes follow-up Q&A capability in the report tier workflow.",
    ],
  };
  report.teaser_protect_99 = {
    headline: "Upgrade to Protect ($99)",
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
        suggestion: `Proposed stronger rewrite: ${flag?.plain_note ?? "Clarify and narrow this clause."}`,
      })),
      fallback_positions: topFlags.map((flag, idx) => ({
        id: `fb_${idx + 1}`,
        position: `Fallback position for "${flag?.title ?? "this issue"}": request narrower scope, shorter duration, and explicit mutuality where applicable.`,
      })),
      negotiation_plan: negotiationPlan,
      advanced_clause_coverage: advancedCoverage,
    };
  }

  return report;
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
      contract_type: "independent_contractor_services_agreement",
      jurisdiction_hint: "not_found",
      page_count: 0,
      word_count: extraction.extractedText ? extraction.extractedText.split(/\s+/).length : 0,
      confidence_notes: notes,
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
      analysisMode: analysisSelection?.analysisMode ?? null,
      llmModel: analysisSelection?.llmModel ?? null,
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
  const selectedTier = normalizeReportTier(analysisSelection?.reportTier);
  const tieredReportInsights = applyTierToReport(reportInsights, selectedTier);

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
  const uiResult = transformPtV1ToUiV1(ptV1);
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
      pt_v1_result: { S: JSON.stringify(ptV1) },
      ui_result: { S: JSON.stringify(uiResult) },
    },
  });

  await db.send(cmd);
  return { resultId, accessKey: resultAccessKey };
}
