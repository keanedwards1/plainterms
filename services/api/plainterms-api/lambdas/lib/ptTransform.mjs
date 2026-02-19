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

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectFieldSummaries(sectionObj) {
  if (!isObject(sectionObj)) return [];

  const summaries = [];
  for (const [key, value] of Object.entries(sectionObj)) {
    if (key === "heading") continue;
    if (!isObject(value)) continue;

    const summary = typeof value.summary === "string" ? value.summary.trim() : "";
    const status = typeof value.status === "string" ? value.status : "";
    const quotes = asArray(value.quotes).filter((q) => typeof q === "string");

    if (!summary) continue;
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

  const quotes = fieldSummaries.flatMap((f) => f.quotes).slice(0, 3);

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

  const report =
    reportObj || uiFlags.length > 0 || uiClauses.length > 0
      ? {
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
        }
      : undefined;

  return {
    schema_version: "pt.ui.v1",
    result_id: ensureString(ptV1.result_id),
    created_at: ensureString(ptV1.created_at),
    headline: "Summary",
    overview: ensureString(overviewSummary).trim(),
    sections: uiSections,
    notices: {
      not_legal_advice:
        ensureString(ptV1?.notices?.not_legal_advice).trim() ||
        "This summary is for informational purposes only and is not legal advice.",
    },
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
  assert(
    typeof ptUiV1.notices.not_legal_advice === "string" && ptUiV1.notices.not_legal_advice,
    "pt.ui.v1 notices.not_legal_advice required"
  );

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
  }
}
