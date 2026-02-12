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
}
