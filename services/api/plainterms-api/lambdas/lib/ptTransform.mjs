const UI_SECTION_KEYS = new Set([
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
  "source_map",
]);

const UI_STATUS_VALUES = new Set(["present", "unclear"]);
const UI_RISK_LABELS = new Set(["low", "medium", "high"]);
const UI_FLAG_SEVERITIES = new Set(["low", "medium", "high"]);
const UI_RECOMMENDATION_ACTIONS = new Set(["sign", "negotiate", "do_not_sign_yet"]);
const UI_REPORT_TIERS = new Set(["scan_39", "report_69", "protect_99"]);
const UI_ADDON_STATES = new Set(["not_purchased", "purchased", "processing", "ready"]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeForDedup(value) {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function collectFieldSummaries(sectionObj) {
  if (!isObject(sectionObj)) return [];

  const summaries = [];
  const seenSummaries = new Set();
  for (const [key, value] of Object.entries(sectionObj)) {
    if (key === "heading") continue;
    if (!isObject(value)) continue;

    const summary = typeof value.summary === "string" ? value.summary.trim() : "";
    const status = typeof value.status === "string" ? value.status : "";
    const quotes = asArray(value.quotes).filter((q) => typeof q === "string");

    if (!summary) continue;
    const summaryKey = normalizeForDedup(summary);
    if (seenSummaries.has(summaryKey)) continue;
    seenSummaries.add(summaryKey);
    summaries.push({ status, summary, quotes });
  }

  return summaries;
}

function toUiStatus(fieldSummaries) {
  const statuses = fieldSummaries.map((f) => f.status);
  if (statuses.includes("found")) return "present";
  if (statuses.includes("not_clearly_stated")) return "unclear";
  return null;
}

function toUiSection(key, sectionObj) {
  const fieldSummaries = collectFieldSummaries(sectionObj);
  const status = toUiStatus(fieldSummaries);

  if (!status) return null;

  const body = fieldSummaries
    .slice(0, 3)
    .map((f) => f.summary)
    .join(" ")
    .trim();

  const seenQuotes = new Set();
  const quotes = fieldSummaries
    .flatMap((f) => f.quotes)
    .filter((quote) => {
      const key = normalizeForDedup(quote);
      if (!key || seenQuotes.has(key)) return false;
      seenQuotes.add(key);
      return true;
    })
    .slice(0, 3);

  const section = {
    key,
    status,
    body: body || "Key details were not clearly stated in the provided text.",
  };

  if (quotes.length > 0) {
    section.quotes = quotes;
  }

  return section;
}

function ensureString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function ensureRiskLabel(value) {
  if (typeof value !== "string") return "medium";
  const v = value.trim().toLowerCase();
  return UI_RISK_LABELS.has(v) ? v : "medium";
}

function ensureFlagSeverity(value) {
  if (typeof value !== "string") return "medium";
  const v = value.trim().toLowerCase();
  return UI_FLAG_SEVERITIES.has(v) ? v : "medium";
}

function ensureRecommendationAction(value) {
  if (typeof value !== "string") return "negotiate";
  const v = value.trim().toLowerCase();
  return UI_RECOMMENDATION_ACTIONS.has(v) ? v : "negotiate";
}

function ensureReportTier(value) {
  if (typeof value !== "string") return "report_69";
  const v = value.trim().toLowerCase();
  return UI_REPORT_TIERS.has(v) ? v : "report_69";
}

function ensureAddonState(value) {
  if (typeof value !== "string") return "not_purchased";
  const v = value.trim().toLowerCase();
  return UI_ADDON_STATES.has(v) ? v : "not_purchased";
}

function toUiFlag(flag, idx) {
  if (!isObject(flag)) return null;
  const title = ensureString(flag.title).trim();
  const plainNote = ensureString(flag.plain_note).trim();
  if (!title || !plainNote) return null;

  return {
    id: ensureString(flag.id, `flag_${idx + 1}`),
    severity: ensureFlagSeverity(flag.severity),
    title,
    plain_note: plainNote,
    related_fields: asArray(flag.related_fields).filter((x) => typeof x === "string"),
  };
}

function toUiClause(clause) {
  if (!isObject(clause)) return null;
  const key = ensureString(clause.key).trim();
  const title = ensureString(clause.title).trim();
  const status = ensureString(clause.status).trim().toLowerCase();
  const whatItMeans = ensureString(clause.what_it_means).trim();
  const whyItMatters = ensureString(clause.why_it_matters).trim();
  const evidence = ensureString(clause.evidence).trim();
  if (!key || !title || !whatItMeans || !whyItMatters) return null;
  if (!["present", "unclear", "missing"].includes(status)) return null;

  return {
    key,
    title,
    status,
    what_it_means: whatItMeans,
    why_it_matters: whyItMatters,
    evidence,
  };
}

function toUiTeaser(teaser) {
  if (!isObject(teaser)) return null;
  const headline = ensureString(teaser.headline).trim();
  const bullets = asArray(teaser.bullets)
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!headline || bullets.length === 0) return null;

  const out = { headline, bullets };
  if (typeof teaser.recommended === "boolean") {
    out.recommended = teaser.recommended;
  }
  const reasons = asArray(teaser.reasons)
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  if (reasons.length > 0) {
    out.reasons = reasons;
  }
  return out;
}

function toUiProtectUpsell(raw) {
  if (!isObject(raw)) return null;
  return {
    should_upsell_protect: Boolean(raw.should_upsell_protect),
    high_risk_or_critical: Boolean(raw.high_risk_or_critical),
    advanced_risk_clause_set_detected: Boolean(raw.advanced_risk_clause_set_detected),
    high_severity_flags_threshold_met: Boolean(raw.high_severity_flags_threshold_met),
    high_severity_flags:
      typeof raw.high_severity_flags === "number" && Number.isFinite(raw.high_severity_flags)
        ? Math.max(0, Math.round(raw.high_severity_flags))
        : 0,
    reasons: asArray(raw.reasons)
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

function toUiProtectExtras(raw) {
  if (!isObject(raw)) return null;

  const deeperRewrites = asArray(raw.deeper_rewrites)
    .map((item, idx) => {
      if (!isObject(item)) return null;
      const issue = ensureString(item.issue).trim();
      const suggestion = ensureString(item.suggestion).trim();
      if (!issue || !suggestion) return null;
      return {
        id: ensureString(item.id, `rw_${idx + 1}`),
        issue,
        suggestion,
      };
    })
    .filter(Boolean);

  const fallbackPositions = asArray(raw.fallback_positions)
    .map((item, idx) => {
      if (!isObject(item)) return null;
      const position = ensureString(item.position).trim();
      if (!position) return null;
      return {
        id: ensureString(item.id, `fb_${idx + 1}`),
        position,
      };
    })
    .filter(Boolean);

  const negotiationPlan = asArray(raw.negotiation_plan)
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);

  const advancedClauseCoverage = asArray(raw.advanced_clause_coverage)
    .map((item) => {
      if (!isObject(item)) return null;
      const key = ensureString(item.key).trim();
      const title = ensureString(item.title).trim();
      const status = ensureString(item.status).trim().toLowerCase();
      const out = {};
      if (key) out.key = key;
      if (title) out.title = title;
      if (["present", "unclear", "missing"].includes(status)) {
        out.status = status;
      }
      return Object.keys(out).length > 0 ? out : null;
    })
    .filter(Boolean);

  return {
    deeper_rewrites: deeperRewrites,
    fallback_positions: fallbackPositions,
    negotiation_plan: negotiationPlan,
    advanced_clause_coverage: advancedClauseCoverage,
  };
}

export function assertPtV1Contract(ptV1) {
  assert(isObject(ptV1), "pt.v1 must be an object");
  assert(ptV1.schema_version === "pt.v1", "pt.v1 schema_version must be 'pt.v1'");
  assert(typeof ptV1.result_id === "string" && ptV1.result_id, "pt.v1 result_id required");
  assert(typeof ptV1.created_at === "string" && ptV1.created_at, "pt.v1 created_at required");
  assert(isObject(ptV1.sections), "pt.v1 sections must be an object");
  assert(isObject(ptV1.notices), "pt.v1 notices must be an object");
}

export function transformPtV1ToUiV1(ptV1) {
  const sections = isObject(ptV1.sections) ? ptV1.sections : {};
  const overviewSummary =
    sections?.document_overview?.plain_summary?.summary ??
    "This agreement outlines a services relationship with responsibilities, payment terms, and legal clauses.";

  const uiSections = [];

  const sectionMappings = [
    ["who_involved", sections.parties],
    ["work_included", sections.scope_of_services],
    ["timeline_termination", sections.term_and_termination],
    ["pay_invoicing", sections.payment],
    ["ownership_work", sections.intellectual_property],
    ["confidentiality", sections.confidentiality],
    ["restrictions", sections.non_solicit_non_compete],
    ["liability_responsibility", sections.liability_indemnity_insurance],
    ["disputes_governing_law", sections.dispute_resolution_and_governing_law],
    ["practical_details", sections.operational_details],
    ["questions_missing_info", sections.flags_and_clarifications],
    ["notices_disclaimers", sections.notices_and_disclaimers],
    ["source_map", sections.source_map_section],
  ];

  const summarySection = toUiSection("summary", sections.document_overview);
  if (summarySection) uiSections.push(summarySection);

  for (const [uiKey, rawSection] of sectionMappings) {
    const section = toUiSection(uiKey, rawSection);
    if (section) uiSections.push(section);
  }

  const reportObj = isObject(ptV1.report) ? ptV1.report : null;
  const reportTier = ensureReportTier(reportObj?.tier);
  const uiFlags = asArray(reportObj?.red_flags)
    .map((flag, idx) => toUiFlag(flag, idx))
    .filter(Boolean);
  const uiClauses = asArray(reportObj?.clause_breakdown)
    .map((clause) => toUiClause(clause))
    .filter(Boolean);
  const recommendation = isObject(reportObj?.recommendation)
    ? {
        action: ensureRecommendationAction(reportObj.recommendation.action),
        label:
          ensureString(reportObj.recommendation.label).trim() ||
          (ensureRecommendationAction(reportObj.recommendation.action) === "do_not_sign_yet"
            ? "Do not sign yet"
            : ensureRecommendationAction(reportObj.recommendation.action) === "sign"
              ? "Sign"
              : "Negotiate"),
        reason:
          ensureString(reportObj.recommendation.reason).trim() ||
          "Important terms should be reviewed before signing.",
      }
    : null;
  const risk = isObject(reportObj?.risk)
    ? {
        score:
          typeof reportObj.risk.score === "number" && Number.isFinite(reportObj.risk.score)
            ? Math.max(0, Math.min(100, Math.round(reportObj.risk.score)))
            : 50,
        label: ensureRiskLabel(reportObj.risk.label),
      }
    : null;
  const negotiationBulletsRaw = isObject(reportObj?.negotiation_bullets)
    ? reportObj.negotiation_bullets
    : {};
  const negotiationBullets = {
    high: asArray(negotiationBulletsRaw.high).filter((x) => typeof x === "string"),
    medium: asArray(negotiationBulletsRaw.medium).filter((x) => typeof x === "string"),
    low: asArray(negotiationBulletsRaw.low).filter((x) => typeof x === "string"),
  };
  const hasNegotiationBullets =
    negotiationBullets.high.length > 0 ||
    negotiationBullets.medium.length > 0 ||
    negotiationBullets.low.length > 0;
  const protectUpsell = toUiProtectUpsell(reportObj?.protect_upsell);
  const teaserReport69 = toUiTeaser(reportObj?.teaser_report_69);
  const teaserProtect99 = toUiTeaser(reportObj?.teaser_protect_99);
  const protectExtras = toUiProtectExtras(reportObj?.protect_extras);
  const addons = {
    rewrite_contract: {
      state: ensureAddonState(ptV1?.addons?.rewrite_contract),
    },
    update_email: {
      state: ensureAddonState(ptV1?.addons?.update_email),
    },
  };
  const documentTitle = ensureString(ptV1?.document?.title).trim();
  const documentContentType = ensureString(ptV1?.document?.content_type).trim();
  const documentWordCount =
    typeof ptV1?.document?.word_count === "number" && Number.isFinite(ptV1.document.word_count)
      ? Math.max(0, Math.round(ptV1.document.word_count))
      : undefined;
  const extractedText = ensureString(ptV1?.document?.extracted_text);
  const extractedTextTruncated = ptV1?.document?.extracted_text_truncated === true;
  const document = {
    file_name: documentTitle || "Contract document",
    ...(documentContentType ? { content_type: documentContentType } : {}),
    ...(documentWordCount !== undefined ? { word_count: documentWordCount } : {}),
    ...(extractedText ? { extracted_text: extractedText } : {}),
    ...(extractedTextTruncated ? { extracted_text_truncated: true } : {}),
  };

  const report =
    reportObj || uiFlags.length > 0 || uiClauses.length > 0
      ? {
          tier: reportTier,
          risk: risk ?? { score: 50, label: "medium" },
          recommendation:
            recommendation ?? {
              action: "negotiate",
              label: "Negotiate",
              reason: "Important terms should be reviewed before signing.",
            },
          red_flags: uiFlags,
          clause_breakdown: uiClauses,
          negotiation_bullets: hasNegotiationBullets
            ? negotiationBullets
            : { high: [], medium: [], low: [] },
          questions_to_ask: asArray(reportObj?.questions_to_ask).filter(
            (x) => typeof x === "string"
          ),
          creator_contract: Boolean(reportObj?.creator_contract),
          ...(protectUpsell ? { protect_upsell: protectUpsell } : {}),
          ...(teaserReport69 ? { teaser_report_69: teaserReport69 } : {}),
          ...(teaserProtect99 ? { teaser_protect_99: teaserProtect99 } : {}),
          ...(protectExtras ? { protect_extras: protectExtras } : {}),
        }
      : undefined;

  return {
    schema_version: "pt.ui.v1",
    result_id: ensureString(ptV1.result_id),
    created_at: ensureString(ptV1.created_at),
    headline: "Summary",
    overview: ensureString(overviewSummary).trim(),
    sections: uiSections,
    document,
    notices: {
      not_legal_advice:
        ensureString(ptV1?.notices?.not_legal_advice).trim() ||
        "This summary is for informational purposes only and is not legal advice.",
    },
    addons,
    ...(report ? { report } : {}),
  };
}

export function assertPtUiV1Contract(ptUiV1) {
  assert(isObject(ptUiV1), "pt.ui.v1 must be an object");
  assert(ptUiV1.schema_version === "pt.ui.v1", "pt.ui.v1 schema_version must be 'pt.ui.v1'");
  assert(typeof ptUiV1.result_id === "string" && ptUiV1.result_id, "pt.ui.v1 result_id required");
  assert(typeof ptUiV1.created_at === "string" && ptUiV1.created_at, "pt.ui.v1 created_at required");
  assert(typeof ptUiV1.headline === "string" && ptUiV1.headline, "pt.ui.v1 headline required");
  assert(typeof ptUiV1.overview === "string" && ptUiV1.overview, "pt.ui.v1 overview required");
  assert(Array.isArray(ptUiV1.sections), "pt.ui.v1 sections must be an array");
  assert(isObject(ptUiV1.notices), "pt.ui.v1 notices must be an object");
  assert(isObject(ptUiV1.addons), "pt.ui.v1 addons must be an object");
  assert(
    isObject(ptUiV1.addons.rewrite_contract),
    "pt.ui.v1 addons.rewrite_contract must be an object"
  );
  assert(
    isObject(ptUiV1.addons.update_email),
    "pt.ui.v1 addons.update_email must be an object"
  );
  assert(
    UI_ADDON_STATES.has(ptUiV1.addons.rewrite_contract.state),
    "pt.ui.v1 addons.rewrite_contract.state invalid"
  );
  assert(
    UI_ADDON_STATES.has(ptUiV1.addons.update_email.state),
    "pt.ui.v1 addons.update_email.state invalid"
  );
  assert(
    typeof ptUiV1.notices.not_legal_advice === "string" && ptUiV1.notices.not_legal_advice,
    "pt.ui.v1 notices.not_legal_advice required"
  );

  if (ptUiV1.document !== undefined) {
    assert(isObject(ptUiV1.document), "pt.ui.v1 document must be an object when present");
    assert(
      typeof ptUiV1.document.file_name === "string" && ptUiV1.document.file_name,
      "pt.ui.v1 document.file_name required"
    );
    if (ptUiV1.document.content_type !== undefined) {
      assert(
        typeof ptUiV1.document.content_type === "string",
        "pt.ui.v1 document.content_type must be a string when present"
      );
    }
    if (ptUiV1.document.word_count !== undefined) {
      assert(
        typeof ptUiV1.document.word_count === "number" &&
          Number.isFinite(ptUiV1.document.word_count) &&
          ptUiV1.document.word_count >= 0,
        "pt.ui.v1 document.word_count must be non-negative number when present"
      );
    }
    if (ptUiV1.document.extracted_text !== undefined) {
      assert(
        typeof ptUiV1.document.extracted_text === "string",
        "pt.ui.v1 document.extracted_text must be a string when present"
      );
    }
    if (ptUiV1.document.extracted_text_truncated !== undefined) {
      assert(
        typeof ptUiV1.document.extracted_text_truncated === "boolean",
        "pt.ui.v1 document.extracted_text_truncated must be a boolean when present"
      );
    }
  }

  for (const section of ptUiV1.sections) {
    assert(isObject(section), "Each pt.ui.v1 section must be an object");
    assert(UI_SECTION_KEYS.has(section.key), `Invalid pt.ui.v1 section key: ${section.key}`);
    assert(UI_STATUS_VALUES.has(section.status), `Invalid pt.ui.v1 section status: ${section.status}`);
    assert(typeof section.body === "string" && section.body, "pt.ui.v1 section body required");
    if (section.quotes !== undefined) {
      assert(Array.isArray(section.quotes), "pt.ui.v1 section quotes must be an array when present");
    }
  }

  if (ptUiV1.report !== undefined) {
    assert(isObject(ptUiV1.report), "pt.ui.v1 report must be an object when present");
    assert(UI_REPORT_TIERS.has(ptUiV1.report.tier), "pt.ui.v1 report.tier invalid");
    assert(isObject(ptUiV1.report.risk), "pt.ui.v1 report.risk must be an object");
    assert(
      typeof ptUiV1.report.risk.score === "number" &&
        Number.isFinite(ptUiV1.report.risk.score),
      "pt.ui.v1 report.risk.score must be numeric"
    );
    assert(
      UI_RISK_LABELS.has(ptUiV1.report.risk.label),
      "pt.ui.v1 report.risk.label invalid"
    );
    assert(
      isObject(ptUiV1.report.recommendation),
      "pt.ui.v1 report.recommendation must be an object"
    );
    assert(
      UI_RECOMMENDATION_ACTIONS.has(ptUiV1.report.recommendation.action),
      "pt.ui.v1 report.recommendation.action invalid"
    );
    assert(
      Array.isArray(ptUiV1.report.red_flags),
      "pt.ui.v1 report.red_flags must be an array"
    );
    for (const flag of ptUiV1.report.red_flags) {
      assert(isObject(flag), "pt.ui.v1 report red_flag must be an object");
      assert(
        UI_FLAG_SEVERITIES.has(flag.severity),
        "pt.ui.v1 report red_flag severity invalid"
      );
      assert(typeof flag.title === "string" && flag.title, "pt.ui.v1 report red_flag title required");
      assert(
        typeof flag.plain_note === "string" && flag.plain_note,
        "pt.ui.v1 report red_flag plain_note required"
      );
    }
    assert(
      Array.isArray(ptUiV1.report.clause_breakdown),
      "pt.ui.v1 report.clause_breakdown must be an array"
    );
    for (const clause of ptUiV1.report.clause_breakdown) {
      assert(isObject(clause), "pt.ui.v1 report clause must be an object");
      assert(
        ["present", "unclear", "missing"].includes(clause.status),
        "pt.ui.v1 report clause status invalid"
      );
      assert(typeof clause.title === "string" && clause.title, "pt.ui.v1 report clause title required");
      assert(
        typeof clause.what_it_means === "string" && clause.what_it_means,
        "pt.ui.v1 report clause what_it_means required"
      );
      assert(
        typeof clause.why_it_matters === "string" && clause.why_it_matters,
        "pt.ui.v1 report clause why_it_matters required"
      );
    }

    if (ptUiV1.report.protect_upsell !== undefined) {
      assert(
        isObject(ptUiV1.report.protect_upsell),
        "pt.ui.v1 report.protect_upsell must be an object"
      );
      assert(
        typeof ptUiV1.report.protect_upsell.should_upsell_protect === "boolean",
        "pt.ui.v1 report.protect_upsell.should_upsell_protect must be boolean"
      );
      assert(
        typeof ptUiV1.report.protect_upsell.high_risk_or_critical === "boolean",
        "pt.ui.v1 report.protect_upsell.high_risk_or_critical must be boolean"
      );
      assert(
        typeof ptUiV1.report.protect_upsell.advanced_risk_clause_set_detected === "boolean",
        "pt.ui.v1 report.protect_upsell.advanced_risk_clause_set_detected must be boolean"
      );
      assert(
        typeof ptUiV1.report.protect_upsell.high_severity_flags_threshold_met === "boolean",
        "pt.ui.v1 report.protect_upsell.high_severity_flags_threshold_met must be boolean"
      );
      assert(
        typeof ptUiV1.report.protect_upsell.high_severity_flags === "number" &&
          Number.isFinite(ptUiV1.report.protect_upsell.high_severity_flags),
        "pt.ui.v1 report.protect_upsell.high_severity_flags must be numeric"
      );
      assert(
        Array.isArray(ptUiV1.report.protect_upsell.reasons),
        "pt.ui.v1 report.protect_upsell.reasons must be an array"
      );
    }

    if (ptUiV1.report.teaser_report_69 !== undefined) {
      assert(
        isObject(ptUiV1.report.teaser_report_69),
        "pt.ui.v1 report.teaser_report_69 must be an object"
      );
      assert(
        typeof ptUiV1.report.teaser_report_69.headline === "string" &&
          ptUiV1.report.teaser_report_69.headline,
        "pt.ui.v1 report.teaser_report_69.headline required"
      );
      assert(
        Array.isArray(ptUiV1.report.teaser_report_69.bullets),
        "pt.ui.v1 report.teaser_report_69.bullets must be an array"
      );
    }

    if (ptUiV1.report.teaser_protect_99 !== undefined) {
      assert(
        isObject(ptUiV1.report.teaser_protect_99),
        "pt.ui.v1 report.teaser_protect_99 must be an object"
      );
      assert(
        typeof ptUiV1.report.teaser_protect_99.headline === "string" &&
          ptUiV1.report.teaser_protect_99.headline,
        "pt.ui.v1 report.teaser_protect_99.headline required"
      );
      assert(
        Array.isArray(ptUiV1.report.teaser_protect_99.bullets),
        "pt.ui.v1 report.teaser_protect_99.bullets must be an array"
      );
      if (ptUiV1.report.teaser_protect_99.recommended !== undefined) {
        assert(
          typeof ptUiV1.report.teaser_protect_99.recommended === "boolean",
          "pt.ui.v1 report.teaser_protect_99.recommended must be boolean when present"
        );
      }
      if (ptUiV1.report.teaser_protect_99.reasons !== undefined) {
        assert(
          Array.isArray(ptUiV1.report.teaser_protect_99.reasons),
          "pt.ui.v1 report.teaser_protect_99.reasons must be an array when present"
        );
      }
    }

    if (ptUiV1.report.protect_extras !== undefined) {
      assert(
        isObject(ptUiV1.report.protect_extras),
        "pt.ui.v1 report.protect_extras must be an object"
      );
      assert(
        Array.isArray(ptUiV1.report.protect_extras.deeper_rewrites),
        "pt.ui.v1 report.protect_extras.deeper_rewrites must be an array"
      );
      assert(
        Array.isArray(ptUiV1.report.protect_extras.fallback_positions),
        "pt.ui.v1 report.protect_extras.fallback_positions must be an array"
      );
      assert(
        Array.isArray(ptUiV1.report.protect_extras.negotiation_plan),
        "pt.ui.v1 report.protect_extras.negotiation_plan must be an array"
      );
      assert(
        Array.isArray(ptUiV1.report.protect_extras.advanced_clause_coverage),
        "pt.ui.v1 report.protect_extras.advanced_clause_coverage must be an array"
      );
    }
  }
}
