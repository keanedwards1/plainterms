const FLAG_SEVERITY_ORDER = Object.freeze({
  high: 3,
  medium: 2,
  low: 1,
});

const FLAG_TYPE_BY_SEVERITY = Object.freeze({
  high: "one_sided",
  medium: "missing_detail",
  low: "ambiguous",
});

const CLAUSE_DEFINITIONS = Object.freeze([
  {
    key: "scope",
    title: "Scope and Deliverables",
    patterns: [
      /\b(scope|services?|deliverables?|statement of work|sow|milestones?)\b/i,
    ],
    llmField: "scopeServices",
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This clause defines what work is included, what deliverables are expected, and how scope changes are handled.",
    whyItMatters:
      "Unclear scope often leads to extra unpaid work and disputes about whether work is complete.",
    relatedField: "sections.scope_of_services.services_description",
  },
  {
    key: "payment",
    title: "Payment Terms",
    patterns: [
      /\b(payment|fees?|compensation|invoice|invoic(?:e|ing)|net\s+\d+|paid?)\b/i,
    ],
    llmField: "payment",
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This clause explains how much is paid, when invoices are sent, and when payment is due.",
    whyItMatters:
      "Weak payment language can cause late payments, underpayment, and limited enforcement options.",
    relatedField: "sections.payment.fee_structure",
  },
  {
    key: "termination",
    title: "Term and Termination",
    patterns: [
      /\b(term|terminate|termination|notice period|for cause|for convenience)\b/i,
    ],
    llmField: "termTermination",
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This clause describes how long the agreement runs and how either side can end it.",
    whyItMatters:
      "Termination rights affect revenue predictability, exit risk, and obligations after the relationship ends.",
    relatedField: "sections.term_and_termination.termination_for_convenience",
  },
  {
    key: "ip",
    title: "Intellectual Property and Usage Rights",
    patterns: [
      /\b(intellectual property|ip|work products?|ownership|copyright|usage rights|in perpetuity|royalt(?:y|ies))\b/i,
      /\b(?:license|licensed|licensing)\b.{0,80}\b(?:work product|intellectual property|copyright|content|materials?|use|sublicens)\b/i,
      /\b(?:work product|intellectual property|copyright|content|materials?)\b.{0,80}\b(?:license|licensed|licensing|use|sublicens)\b/i,
    ],
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This clause determines who owns created work and what rights each side has to use content.",
    whyItMatters:
      "IP and licensing terms can permanently affect your ability to reuse work or control your content.",
    relatedField: "sections.intellectual_property.work_product_ownership",
    skipForRenovation: true,
  },
  {
    key: "confidentiality",
    title: "Confidentiality",
    patterns: [/\b(confidential|confidentiality|non[- ]disclosure|nda)\b/i],
    llmField: "confidentiality",
    missingSeverity: "medium",
    unclearSeverity: "low",
    meaning:
      "This clause controls how sensitive information can be used and disclosed.",
    whyItMatters:
      "Undefined confidentiality boundaries can create compliance and reputation risk for both sides.",
    relatedField: "sections.confidentiality.confidential_info",
    skipForRenovation: true,
  },
  {
    key: "liability",
    title: "Liability and Indemnity",
    patterns: [
      /\b(liability|indemnif(?:y|ication)|hold harmless|damages?|limitation of liability)\b/i,
    ],
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This clause allocates financial responsibility if something goes wrong.",
    whyItMatters:
      "One-sided or uncapped liability can create outsized downside compared with contract value.",
    relatedField: "sections.liability_indemnity_insurance.indemnification",
  },
  {
    key: "disputes",
    title: "Disputes and Governing Law",
    patterns: [
      /\b(governing law|jurisdiction|venue|arbitration|mediation|dispute resolution)\b/i,
    ],
    missingSeverity: "medium",
    unclearSeverity: "low",
    meaning:
      "This clause sets where and how legal disputes are handled.",
    whyItMatters:
      "Unfavorable venue or procedure can increase legal cost and reduce practical leverage.",
    relatedField: "sections.dispute_resolution_and_governing_law.governing_law",
  },
  {
    key: "restrictions",
    title: "Restrictions (Non-compete/Non-solicit/Exclusivity)",
    patterns: [
      /\b(non[- ]compete|non[- ]solicit|exclusivity|morality clause|non[- ]disparagement)\b/i,
      /\bexclusive\s+(?:services|relationship|arrangement|rights?|territory|category|provider|vendor|contractor|consultant)\b/i,
    ],
    missingSeverity: "low",
    unclearSeverity: "medium",
    meaning:
      "These clauses limit what other work or business relationships are allowed during or after the agreement.",
    whyItMatters:
      "Overbroad restrictions can limit earning options and future opportunities.",
    relatedField: "sections.non_solicit_non_compete.non_compete",
  },
  {
    key: "assignment_subcontracting",
    title: "Assignment and Subcontracting",
    patterns: [/\b(assign(?:ment)?|subcontract(?:or|ing)?|delegate)\b/i],
    missingSeverity: "low",
    unclearSeverity: "low",
    meaning:
      "This clause controls whether rights or obligations can be transferred to another party.",
    whyItMatters:
      "Transfer rights can change who you are effectively dealing with under the contract.",
    relatedField: "sections.operational_details.assignment",
  },
  {
    key: "warranty",
    title: "Warranties and Disclaimers",
    patterns: [
      /\b(warrant(?:y|ies)|disclaimer|as is|merchantability|fitness for a particular purpose)\b/i,
    ],
    missingSeverity: "low",
    unclearSeverity: "low",
    meaning:
      "This clause sets what promises are made about quality and what liabilities are disclaimed.",
    whyItMatters:
      "Warranty language affects remedy rights and exposure if deliverables are challenged.",
    relatedField: "sections.liability_indemnity_insurance.warranties_disclaimers",
  },
  {
    key: "creator_usage",
    title: "Creator/Model Usage Rights",
    patterns: [
      /\b(influencer|creator|model|brand|campaign|social media|reels|stories|likeness|whitelisting|paid media)\b/i,
    ],
    missingSeverity: "low",
    unclearSeverity: "medium",
    meaning:
      "For creator/model contracts, this clause should define usage channels, duration, edits, and approval rights.",
    whyItMatters:
      "Unclear usage terms can lead to unexpected perpetual use, paid media reuse, or reputation issues.",
    relatedField: "sections.intellectual_property.license_grants",
    creatorFocused: true,
  },
  {
    key: "deposit_draw_schedule",
    title: "Deposit and Payment Schedule",
    patterns: [
      /\b(deposit|down ?payment|draw(?:\s+schedule)?|progress payments?|installments?|retainage|retention|mobilization fee|final payment)\b/i,
    ],
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This sets how much you pay upfront and how the remaining payments are released as the work progresses.",
    whyItMatters:
      "Large deposits or payments that run ahead of completed work put your money at risk if the job stalls or is abandoned.",
    relatedField: "sections.payment.payment_timing",
    renovationFocused: true,
  },
  {
    key: "liens",
    title: "Mechanics Liens and Lien Waivers",
    patterns: [
      /\b(lien|mechanic'?s lien|lien waiver|lien release|waiver of lien|preliminary notice|notice of intent)\b/i,
    ],
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "Mechanics liens let a contractor, subcontractor, or supplier make a legal claim against your home if they are not paid. Lien waivers are how you protect against that.",
    whyItMatters:
      "Without lien waivers, you can pay your contractor in full and still face liens from unpaid subcontractors or suppliers.",
    relatedField: "sections.liability_indemnity_insurance.indemnification",
    renovationFocused: true,
  },
  {
    key: "change_orders",
    title: "Change Orders",
    patterns: [
      /\b(change order|change directive|extra work|additional work|scope change)\b/i,
    ],
    missingSeverity: "medium",
    unclearSeverity: "medium",
    meaning:
      "This defines how changes to the work are priced, documented, and approved once the project is underway.",
    whyItMatters:
      "Vague change-order terms let costs grow mid-project without your written sign-off.",
    relatedField: "sections.scope_of_services.services_description",
    renovationFocused: true,
  },
  {
    key: "workmanship_warranty",
    title: "Workmanship Warranty",
    patterns: [
      /\b(workmanship|punch ?list|defects?|callback|warrant(?:y|ies)\s+period|guarantee)\b/i,
    ],
    missingSeverity: "medium",
    unclearSeverity: "low",
    meaning:
      "This sets how long the contractor stands behind the work and how defects found after completion are fixed.",
    whyItMatters:
      "A short or missing workmanship warranty leaves you paying to fix defects that should be the contractor's responsibility.",
    relatedField: "sections.liability_indemnity_insurance.warranties_disclaimers",
    renovationFocused: true,
  },
  {
    key: "permits",
    title: "Permits and Inspections",
    patterns: [
      /\b(permits?|building permit|inspections?|certificate of occupancy|code compliance|zoning)\b/i,
    ],
    missingSeverity: "medium",
    unclearSeverity: "low",
    meaning:
      "This sets who is responsible for pulling permits and passing required inspections.",
    whyItMatters:
      "If you are made responsible for permits, you can be left liable for code violations and unpermitted work.",
    relatedField: "sections.operational_details.communications_and_reporting",
    renovationFocused: true,
  },
  {
    key: "timeline",
    title: "Completion Timeline and Delays",
    patterns: [
      /\b(substantial completion|completion date|commencement|start date|schedule|timeline|delays?|time is of the essence|liquidated damages)\b/i,
    ],
    missingSeverity: "high",
    unclearSeverity: "medium",
    meaning:
      "This sets when work starts, when it must be finished, and what happens if the project runs late.",
    whyItMatters:
      "With no completion date or remedy for delay, a contractor can stretch your project out indefinitely.",
    relatedField: "sections.term_and_termination.termination_for_convenience",
    renovationFocused: true,
  },
]);

const RISKY_PATTERN_RULES = Object.freeze([
  {
    id: "sow_missing",
    when: ({ text }) =>
      /\b(exhibit|appendix|schedule|statement of work|sow)\b/i.test(text) &&
      /\b(not attached|not provided|incorporated by reference)\b/i.test(text),
    severity: "high",
    type: "requires_attachment",
    title: "Critical attachment appears referenced but may be missing",
    note:
      "The contract references a separate attachment/SOW for key terms. If that attachment is unavailable or incomplete, core obligations may be unclear.",
    relatedFields: [
      "sections.scope_of_services.services_description",
      "sections.scope_of_services.deliverables",
    ],
    quotePatterns: [/\b(statement of work|sow|exhibit|appendix|schedule)\b/i],
  },
  {
    id: "one_sided_indemnity",
    when: ({ text }) =>
      /\b(contractor|vendor|talent)\b.{0,45}\bindemnif/i.test(text) &&
      !/\b(company|client|brand)\b.{0,45}\bindemnif/i.test(text),
    severity: "high",
    type: "one_sided",
    title: "Indemnity appears one-directional",
    note:
      "Indemnity language appears to run mainly in one direction, which can create asymmetric risk.",
    relatedFields: ["sections.liability_indemnity_insurance.indemnification"],
    quotePatterns: [/\bindemnif(?:y|ication)\b/i],
  },
  {
    id: "no_liability_cap",
    when: ({ text }) =>
      /\bindemnif/i.test(text) &&
      !/\b(limitation of liability|liability cap|cap(?:ped)? at)\b/i.test(text),
    severity: "high",
    type: "one_sided",
    title: "Potential uncapped liability exposure",
    note:
      "The contract appears to include liability triggers without clear cap language, which may increase downside risk.",
    relatedFields: ["sections.liability_indemnity_insurance.limitation_of_liability"],
    quotePatterns: [/\b(liability|indemnif(?:y|ication))\b/i],
  },
  {
    id: "broad_perpetual_license",
    when: ({ text }) =>
      /\b(perpetual|in perpetuity)\b/i.test(text) &&
      /\b(irrevocable|worldwide|all media)\b/i.test(text),
    severity: "medium",
    type: "unusual",
    title: "License terms may be broad and perpetual",
    note:
      "The license appears broad (for example perpetual and/or all-media wording), which may reduce future control of the licensed work or rights.",
    relatedFields: ["sections.intellectual_property.license_grants"],
    quotePatterns: [/\b(perpetual|in perpetuity|all media|irrevocable)\b/i],
  },
  {
    id: "broad_exclusivity",
    when: ({ text }) =>
      /\bexclusive|exclusivity\b/i.test(text) &&
      !/\b(category|territory|term|duration)\b/i.test(text),
    severity: "medium",
    type: "ambiguous",
    title: "Exclusivity may be broad or undefined",
    note:
      "Exclusivity language appears present but scope boundaries (category/territory/duration) may not be explicit.",
    relatedFields: ["sections.non_solicit_non_compete.non_compete"],
    quotePatterns: [/\bexclusive|exclusivity\b/i],
  },
  {
    id: "late_payment_long",
    when: ({ paymentDays }) => Number.isFinite(paymentDays) && paymentDays > 45,
    severity: "medium",
    type: "unusual",
    title: "Payment cycle appears longer than common contractor/vendor terms",
    note:
      "A longer net payment cycle can increase cash-flow pressure and collection risk.",
    relatedFields: ["sections.payment.payment_timing"],
    quotePatterns: [/\b(net|within)\s+\d{1,3}\s+(?:business\s*)?days?\b/i],
  },
  {
    id: "unilateral_changes",
    when: ({ text }) => hasUnilateralModificationLanguage(text),
    severity: "high",
    type: "one_sided",
    title: "Unilateral modification rights detected",
    note:
      "Language suggests one party may modify terms with limited mutual consent, which can reduce predictability.",
    relatedFields: ["sections.operational_details.communications_and_reporting"],
    quotePatterns: [/\b(sole discretion|without notice|modify|amend)\b/i],
  },
  {
    id: "missing_governing_law",
    when: ({ text }) =>
      !/\b(governing law|laws of|jurisdiction|venue)\b/i.test(text),
    severity: "medium",
    type: "missing_detail",
    title: "Governing law and venue may be missing",
    note:
      "The agreement may not clearly state governing law or venue, which can create uncertainty in a dispute.",
    relatedFields: ["sections.dispute_resolution_and_governing_law.governing_law"],
    quotePatterns: [/\b(dispute|arbitration|governing law|venue)\b/i],
  },
  {
    id: "no_approval_rights",
    when: ({ text, isCreatorContract }) =>
      isCreatorContract &&
      /\b(brand|campaign|content|deliverables?)\b/i.test(text) &&
      !/\b(approval|approve|pre-approve|consent)\b/i.test(text),
    severity: "medium",
    type: "missing_detail",
    title: "Creator approval rights are not clearly stated",
    note:
      "For creator/model deals, approval rights for edits and final posting can materially affect brand and reputation control.",
    relatedFields: ["sections.intellectual_property.license_grants"],
    quotePatterns: [/\b(content|campaign|deliverables?)\b/i],
  },
  {
    id: "morality_clause",
    when: ({ text }) => /\b(morality clause|morals clause)\b/i.test(text),
    severity: "medium",
    type: "unusual",
    title: "Morality clause detected",
    note:
      "Morality clauses can allow suspension or termination based on broad conduct standards and should be reviewed carefully.",
    relatedFields: ["sections.non_solicit_non_compete.non_disparagement"],
    quotePatterns: [/\b(morality clause|morals clause)\b/i],
  },
  {
    id: "large_deposit",
    when: ({ isRenovationContract, depositPercent }) =>
      isRenovationContract && Number.isFinite(depositPercent) && depositPercent >= 33,
    severity: "high",
    type: "unusual",
    title: "Upfront deposit appears large",
    note:
      "The deposit or down payment appears to be a large share of the total price. Many states cap or discourage big upfront payments, and paying well ahead of completed work increases your risk if the job stalls.",
    relatedFields: ["sections.payment.payment_timing"],
    quotePatterns: [
      /\b(?:deposit|down ?payment)\b[^.]{0,40}\d{1,3}\s*%/i,
      /\d{1,3}\s*%[^.]{0,40}(?:deposit|down ?payment)/i,
      /\b(deposit|down ?payment)\b/i,
    ],
  },
  {
    id: "no_lien_waiver",
    when: ({ text, isRenovationContract }) =>
      isRenovationContract &&
      /\b(subcontractor|supplier|materialmen|material supplier)\b/i.test(text) &&
      !/\b(lien waiver|lien release|waiver of lien|unconditional waiver|conditional waiver)\b/i.test(text),
    severity: "high",
    type: "missing_detail",
    title: "No lien-waiver protection found",
    note:
      "The contract relies on subcontractors or suppliers but does not appear to require lien waivers. Without them, you could pay your contractor in full and still face liens from parties they failed to pay.",
    relatedFields: ["sections.liability_indemnity_insurance.indemnification"],
    quotePatterns: [/\b(subcontractor|supplier|lien)\b/i],
  },
  {
    id: "change_order_no_written_approval",
    when: ({ text, isRenovationContract }) =>
      isRenovationContract &&
      /\bchange orders?\b/i.test(text) &&
      !/\bchange orders?\b[^.]{0,120}\b(written|in writing|signed|approv|consent|authoriz)\b/i.test(text),
    severity: "medium",
    type: "missing_detail",
    title: "Change orders may not require your written approval",
    note:
      "Change-order language appears present but may not clearly require your written approval before extra work and cost are added.",
    relatedFields: ["sections.scope_of_services.services_description"],
    quotePatterns: [/\bchange orders?\b/i],
  },
  {
    id: "missing_completion_date",
    when: ({ text, isRenovationContract }) =>
      isRenovationContract &&
      !/\b(substantial completion|completion date|complete[d]? (?:the work |all work )?by|finish(?:ed)? by|shall be completed|date of completion)\b/i.test(text),
    severity: "high",
    type: "missing_detail",
    title: "No clear completion date",
    note:
      "The agreement does not appear to state a firm completion or substantial-completion date. Without one, there is little to hold the contractor to a schedule.",
    relatedFields: ["sections.term_and_termination.termination_for_convenience"],
    quotePatterns: [/\b(completion|schedule|timeline|commencement)\b/i],
  },
  {
    id: "homeowner_pulls_permits",
    when: ({ text, isRenovationContract }) =>
      isRenovationContract &&
      /\b(owner|homeowner|client)\b[^.]{0,40}\b(obtain|responsible for|pull|secure|provide)\b[^.]{0,30}\bpermits?\b/i.test(text),
    severity: "medium",
    type: "one_sided",
    title: "You may be responsible for permits",
    note:
      "The contract appears to put responsibility for permits on you rather than the contractor. That can leave you exposed to code-violation and unpermitted-work liability.",
    relatedFields: ["sections.operational_details.communications_and_reporting"],
    quotePatterns: [/\bpermits?\b/i],
  },
  {
    id: "uncapped_allowance",
    when: ({ text, isRenovationContract }) =>
      isRenovationContract &&
      /\ballowances?\b/i.test(text) &&
      !/\ballowances?\b[^.]{0,120}\b(cap|capped|not to exceed|maximum|max\.)\b/i.test(text),
    severity: "medium",
    type: "unusual",
    title: "Allowance overruns may be passed to you without a cap",
    note:
      "The contract uses allowances (budget placeholders for items like fixtures or flooring) but does not appear to cap overruns. If actual costs exceed the allowance, you may owe the difference with no ceiling.",
    relatedFields: ["sections.payment.fee_structure"],
    quotePatterns: [/\ballowances?\b/i],
  },
  {
    id: "mandatory_arbitration",
    when: ({ text }) =>
      /\b(binding arbitration|mandatory arbitration|waiv\w*\s+(?:the\s+)?(?:right\s+to\s+a\s+)?jury)\b/i.test(text),
    severity: "medium",
    type: "unusual",
    title: "Mandatory arbitration or jury-trial waiver",
    note:
      "The contract appears to require arbitration or waive the right to a jury trial. That limits how you can pursue a dispute and can be costly, so review it carefully.",
    relatedFields: ["sections.dispute_resolution_and_governing_law.governing_law"],
    quotePatterns: [/\b(arbitration|jury)\b/i],
  },
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?;])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function hasMutualModificationProtection(text) {
  return /\b(?:amend|amended|amendment|modify|modified|modification|change|changed)\b.{0,120}\b(?:mutual|both parties|written agreement of the parties|signed by (?:both|each) parties)\b/i.test(text) ||
    /\b(?:mutual|both parties|written agreement of the parties|signed by (?:both|each) parties)\b.{0,120}\b(?:amend|amended|amendment|modify|modified|modification|change|changed)\b/i.test(text);
}

function hasUnilateralModificationLanguage(text) {
  const sentences = splitSentences(text);

  return sentences.some((sentence, idx) => {
    const windowText = [sentences[idx - 1], sentence, sentences[idx + 1]]
      .filter(Boolean)
      .join(" ");

    if (!/\b(?:amend|amended|amendment|modify|modified|modification|change|changed)\b/i.test(windowText)) {
      return false;
    }
    if (!/\b(?:sole discretion|unilateral(?:ly)?|without (?:prior )?(?:notice|consent)|at any time)\b/i.test(windowText)) {
      return false;
    }
    return !hasMutualModificationProtection(windowText);
  });
}

function execPattern(text, pattern) {
  if (!text) return null;
  if (pattern instanceof RegExp) {
    const flags = pattern.flags.replace(/g/g, "");
    const regex = new RegExp(pattern.source, flags);
    return regex.exec(text);
  }
  const regex = new RegExp(String(pattern), "i");
  return regex.exec(text);
}

function firstMatch(text, patterns = []) {
  for (const pattern of patterns) {
    const match = execPattern(text, pattern);
    if (match) return match;
  }
  return null;
}

function isLowQualitySnippet(snippet) {
  if (!snippet) return true;
  const tokens = snippet.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return true;

  const oneCharTokens = tokens.filter(
    (token) => token.length === 1 && /[a-z]/i.test(token)
  ).length;
  if (oneCharTokens / tokens.length > 0.2) return true;

  const shortTokens = tokens.filter((token) => token.length <= 2).length;
  if (shortTokens / tokens.length > 0.45) return true;

  const longTokenCount = tokens.filter((token) => token.length >= 4).length;
  if (longTokenCount < 2) return true;

  return false;
}

function normalizeSnippetText(value) {
  return String(value || "")
    .replace(/_{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSnippetStart(value) {
  let text = String(value || "").trim();
  if (!text) return "";

  text = text.replace(/^[^A-Za-z0-9("“]+/, "");
  if (!text) return "";

  const firstTokenMatch = text.match(/^([A-Za-z]+)/);
  const firstToken = firstTokenMatch?.[1] ?? "";
  if (/^[a-z]{4,}$/.test(firstToken) && text.split(/\s+/).length > 2) {
    text = text.slice(firstToken.length).trimStart();
  }

  if (/^[a-z]/.test(text)) {
    const sentenceRestart = text.match(/[.!?]\s+([A-Z("“])/);
    if (sentenceRestart?.index !== undefined) {
      const boundary = sentenceRestart.index + sentenceRestart[0].length - 1;
      text = text.slice(boundary).trimStart();
    }
  }

  if (/^[a-z]/.test(text)) {
    const firstCapital = text.search(/[A-Z]/);
    if (firstCapital >= 10) {
      text = text.slice(firstCapital);
    }
  }

  return text.trim();
}

function isWordChar(char) {
  return /[A-Za-z0-9]/.test(char || "");
}

function rewindToWordBoundary(text, index, maxSteps = 64) {
  let i = Math.max(0, Math.min(text.length, index));
  let steps = 0;
  while (i > 0 && steps < maxSteps && isWordChar(text[i - 1])) {
    i -= 1;
    steps += 1;
  }
  return i;
}

function advanceToWordBoundary(text, index, maxSteps = 64) {
  let i = Math.max(0, Math.min(text.length, index));
  let steps = 0;
  while (i < text.length && steps < maxSteps && isWordChar(text[i])) {
    i += 1;
    steps += 1;
  }
  return i;
}

function findLeftSentenceBoundary(text, pivot, maxLookback = 280) {
  const min = Math.max(0, pivot - maxLookback);
  for (let i = pivot; i > min; i -= 1) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      return i + 1;
    }
  }
  return min;
}

function findRightSentenceBoundary(text, pivot, maxLookahead = 320) {
  const max = Math.min(text.length - 1, pivot + maxLookahead);
  for (let i = pivot; i < max; i += 1) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      return i + 1;
    }
  }
  return max + 1;
}

function trimSnippetToLimit(text, limit = 220) {
  const sectionMarker = /\s\d+\.\s+[A-Z]/.exec(text);
  if (sectionMarker?.index !== undefined && sectionMarker.index >= 45) {
    const beforeMarker = text.slice(0, sectionMarker.index).trim();
    if (beforeMarker.length >= 42) {
      return `${beforeMarker}...`;
    }
  }

  if (text.length <= limit) return text;

  const slice = text.slice(0, limit + 1);
  const punct = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?"),
    slice.lastIndexOf(";"),
    slice.lastIndexOf(",")
  );
  if (punct >= Math.floor(limit * 0.6)) {
    return `${slice.slice(0, punct + 1).trim()}...`;
  }

  const space = slice.lastIndexOf(" ");
  if (space >= Math.floor(limit * 0.6)) {
    return `${slice.slice(0, space).trim()}...`;
  }

  return `${slice.slice(0, limit).trim()}...`;
}

function getSnippetAround(text, startIdx, matchLength = 20) {
  if (!text || startIdx < 0) return "";
  const anchorStart = Math.max(0, startIdx);
  const anchorEnd = Math.min(text.length, startIdx + matchLength);

  let start = findLeftSentenceBoundary(text, anchorStart);
  let end = findRightSentenceBoundary(text, anchorEnd);
  start = rewindToWordBoundary(text, start);
  end = advanceToWordBoundary(text, end);
  let candidate = cleanSnippetStart(normalizeSnippetText(text.slice(start, end)));

  if (!candidate || candidate.length < 48) {
    const fallbackWindow = 95;
    start = Math.max(0, anchorStart - fallbackWindow);
    end = Math.min(text.length, anchorEnd + fallbackWindow);
    start = rewindToWordBoundary(text, start);
    end = advanceToWordBoundary(text, end);
    candidate = cleanSnippetStart(normalizeSnippetText(text.slice(start, end)));
  }

  if (!candidate || isLowQualitySnippet(candidate)) return "";
  const trimmed = trimSnippetToLimit(candidate, 220);
  return cleanSnippetStart(trimmed);
}

function sourcePointerFromPatterns(text, patterns) {
  const match = firstMatch(text, patterns);
  if (!match) return [];
  const start = Math.max(0, Number(match.index ?? 0));
  const end = start + String(match[0]).length;
  return [
    {
      source_id: "src_main",
      page: 1,
      start_char: start,
      end_char: end,
    },
  ];
}

function detectCreatorContract(text) {
  const roleSignal = /\b(influencer|creator|content creator|talent|model)\b/i.test(text);
  const dealSignal = /\b(brand deal|sponsored|sponsorship|ugc|user generated content|campaign)\b/i.test(text);
  const platformSignal = /\b(instagram|tiktok|youtube|reels|stories|shorts|social media)\b/i.test(text);
  const likenessSignal = /\b(likeness|image rights|name and likeness|whitelisting|paid media)\b/i.test(text);

  return roleSignal && (dealSignal || platformSignal || likenessSignal);
}

function detectRenovationContract(text) {
  // Construction/work signal is required so that ordinary "independent
  // contractor" service agreements (which merely use the word "contractor")
  // don't misfire as renovation contracts.
  const workSignal =
    /\b(renovat\w*|remodel\w*|construction|build(?:ing|er)?|addition|adu|demolition|demo|installation|install|repair|roofing|plumbing|electrical|hvac|drywall|framing|concrete|masonry|landscap\w*|kitchen|bathroom)\b/i.test(
      text
    );
  const roleSignal =
    /\b(general contractor|gc|subcontractor|remodeler|home ?owner|tradesperson|tradesman)\b/i.test(text);
  const domainSignal =
    /\b(lien|change order|draw schedule|punch ?list|retainage|substantial completion|building permit|certificate of occupancy|allowance|scope of work|workmanship)\b/i.test(
      text
    );

  return workSignal && (roleSignal || domainSignal);
}

// Best-effort extraction of an upfront-deposit percentage so we can flag
// unusually large deposits. Returns NaN when no clear figure is present.
function extractDepositPercent(text) {
  const match =
    /\b(?:deposit|down ?payment|upfront|up front)\b[^.]{0,60}?(\d{1,3})\s*%/i.exec(text) ||
    /(\d{1,3})\s*%[^.]{0,40}?\b(?:deposit|down ?payment|upfront|up front)\b/i.exec(text);
  if (!match) return NaN;
  const pct = Number(match[1]);
  return Number.isFinite(pct) ? pct : NaN;
}

function llmStatus(llmFields, key) {
  const status = llmFields?.[key]?.status;
  if (status === "found" || status === "not_found" || status === "not_clearly_stated") {
    return status;
  }
  return null;
}

function buildClauseStatus({ def, llmFields, text, isCreatorContract, isRenovationContract }) {
  if (def.creatorFocused && !isCreatorContract) {
    return null;
  }
  if (def.renovationFocused && !isRenovationContract) {
    return null;
  }
  if (def.skipForRenovation && isRenovationContract) {
    return null;
  }

  const match = firstMatch(text, def.patterns);
  const llm = def.llmField ? llmStatus(llmFields, def.llmField) : null;

  let status = "missing";
  if (llm === "found" || match) status = "present";
  if (llm === "not_clearly_stated") status = "unclear";
  if (!match && llm === "not_found") status = "missing";

  const evidence = match ? getSnippetAround(text, match.index ?? 0, String(match[0]).length) : "";

  return {
    key: def.key,
    title: def.title,
    status,
    what_it_means:
      status === "present"
        ? `In plain English: ${def.meaning} Based on the extracted text, this clause appears to be present.`
        : status === "unclear"
          ? `In plain English: ${def.meaning} The clause appears partially stated or ambiguous in the extracted text.`
          : `In plain English: ${def.meaning} This clause was not clearly found in the extracted text.`,
    why_it_matters: def.whyItMatters,
    evidence,
    related_fields: [def.relatedField],
  };
}

function addFlag(flags, flag) {
  if (!flag) return;
  if (flags.some((f) => f.title === flag.title)) return;
  flags.push(flag);
}

function severityScore(severity) {
  if (severity === "high") return 12;
  if (severity === "medium") return 7;
  return 3;
}

function riskLabel(score) {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function recommendationFromRisk({ score, highFlags, mediumFlags }) {
  if (score >= 70 || highFlags >= 4) {
    return {
      action: "do_not_sign_yet",
      label: "Do not sign yet",
      reason:
        "Multiple high-impact issues were detected. Resolve key terms before signing.",
    };
  }

  if (score >= 35 || highFlags > 0 || mediumFlags > 0) {
    return {
      action: "negotiate",
      label: "Negotiate",
      reason:
        "Important terms need clarification or balancing before signing.",
    };
  }

  return {
    action: "sign",
    label: "Sign",
    reason:
      "No major blockers were detected in the extracted text, but final review is still recommended.",
  };
}

function priorityFromSeverity(severity) {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function negotiationFromFlag(flag) {
  const title = flag.title.toLowerCase();
  if (title.includes("deposit") || title.includes("payment schedule")) {
    return "Request a smaller upfront deposit and tie remaining payments to completed, inspected milestones.";
  }
  if (title.includes("lien")) {
    return "Request lien waivers from the contractor and every subcontractor and supplier before releasing each payment.";
  }
  if (title.includes("change order")) {
    return "Request that no change order is binding without your written, signed approval of the added scope and price.";
  }
  if (title.includes("completion") || title.includes("timeline") || title.includes("delay")) {
    return "Request a firm substantial-completion date with a reasonable remedy if the contractor runs late.";
  }
  if (title.includes("permit")) {
    return "Request that the contractor obtains all required permits and schedules the inspections.";
  }
  if (title.includes("allowance")) {
    return "Request written allowance amounts, with your approval required before any overage is charged to you.";
  }
  if (title.includes("workmanship") || title.includes("warranty")) {
    return "Request a written workmanship warranty of at least one year and a clear punch-list process at completion.";
  }
  if (title.includes("arbitration") || title.includes("jury")) {
    return "Ask whether mandatory arbitration can be removed or made optional, and confirm a practical local venue.";
  }
  if (title.includes("payment")) {
    return "Request clear invoice timing and a defined payment deadline with late-fee language.";
  }
  if (title.includes("scope")) {
    return "Request a detailed scope and deliverables list, including milestone and revision limits.";
  }
  if (title.includes("indemn")) {
    return "Request reciprocal indemnity or a narrower indemnity scope tied to each party’s own misconduct.";
  }
  if (title.includes("license") || title.includes("usage")) {
    return "Request limits on license duration, scope, territory, media channels, and transfer or sublicensing rights.";
  }
  if (title.includes("liability")) {
    return "Request a liability cap aligned with contract value and clear exclusions.";
  }
  if (title.includes("exclus")) {
    return "Request exclusivity narrowed by category, territory, and duration.";
  }
  if (title.includes("approval")) {
    return "Request explicit approval rights for edits and final published content.";
  }
  if (title.includes("governing law") || title.includes("venue")) {
    return "Request governing law and venue that are practical for your business location.";
  }
  return "Request clearer, balanced wording for this clause with defined limits and fallback language.";
}

function bucketNegotiationBullets(flags) {
  const buckets = {
    high: [],
    medium: [],
    low: [],
  };

  for (const flag of flags) {
    const priority = priorityFromSeverity(flag.severity);
    const bullet = negotiationFromFlag(flag);
    if (!buckets[priority].includes(bullet)) {
      buckets[priority].push(bullet);
    }
  }

  const cap = 15;
  let total =
    buckets.high.length + buckets.medium.length + buckets.low.length;
  if (total > cap) {
    const overflow = total - cap;
    buckets.low = buckets.low.slice(0, Math.max(0, buckets.low.length - overflow));
    total =
      buckets.high.length + buckets.medium.length + buckets.low.length;
    if (total > cap) {
      const extra = total - cap;
      buckets.medium = buckets.medium.slice(
        0,
        Math.max(0, buckets.medium.length - extra)
      );
    }
  }

  return buckets;
}

function buildQuestionsToAsk(clauses, flags) {
  const questions = [];

  for (const clause of clauses) {
    if (clause.status === "missing" || clause.status === "unclear") {
      questions.push(`Can we clarify the ${clause.title.toLowerCase()} clause in writing?`);
    }
  }

  for (const flag of flags) {
    if (flag.severity === "high") {
      questions.push(`Can we resolve this before signing: ${flag.title}?`);
    }
  }

  return [...new Set(questions)].slice(0, 12);
}

function summarizeFromFlags(flags) {
  return flags
    .slice(0, 10)
    .map((flag) => `${flag.title}: ${flag.plain_note}`);
}

function scoreRisk({ flags, clauses }) {
  let score = 12;

  for (const flag of flags) {
    score += severityScore(flag.severity);
  }

  for (const clause of clauses) {
    if (clause.status === "missing") {
      score += 6;
    } else if (clause.status === "unclear") {
      score += 3;
    } else {
      score -= 1;
    }
  }

  return clamp(Math.round(score), 0, 100);
}

function sortFlags(flags) {
  return [...flags].sort((a, b) => {
    const bySeverity =
      (FLAG_SEVERITY_ORDER[b.severity] ?? 0) -
      (FLAG_SEVERITY_ORDER[a.severity] ?? 0);
    if (bySeverity !== 0) return bySeverity;
    return a.title.localeCompare(b.title);
  });
}

export function buildReportInsights({ extractedText, llmFields }) {
  const text = normalizeText(extractedText);
  const isCreatorContract = detectCreatorContract(text);
  const isRenovationContract = detectRenovationContract(text);
  const depositPercent = extractDepositPercent(text);
  const paymentMatch = firstMatch(text, [
    /\b(net|within)\s+(\d{1,3})\s+(?:business\s*)?days?\b/i,
  ]);
  const paymentDays = paymentMatch ? Number(paymentMatch[2]) : NaN;

  const clauses = [];
  for (const def of CLAUSE_DEFINITIONS) {
    const clause = buildClauseStatus({
      def,
      llmFields,
      text,
      isCreatorContract,
      isRenovationContract,
    });
    if (!clause) continue;
    clauses.push(clause);
  }

  const flags = [];

  for (const clause of clauses) {
    const def = CLAUSE_DEFINITIONS.find((item) => item.key === clause.key);
    if (!def) continue;

    if (clause.status === "missing") {
      addFlag(flags, {
        id: `flag_${flags.length + 1}`,
        type: "missing_detail",
        severity: def.missingSeverity ?? "medium",
        title: `${def.title} is not clearly stated`,
        plain_note: `The extracted text does not clearly show this clause. ${def.whyItMatters}`,
        related_fields: [def.relatedField],
        sources: sourcePointerFromPatterns(text, def.patterns),
      });
    } else if (clause.status === "unclear") {
      const severity = def.unclearSeverity ?? "low";
      addFlag(flags, {
        id: `flag_${flags.length + 1}`,
        type: FLAG_TYPE_BY_SEVERITY[severity],
        severity,
        title: `${def.title} appears unclear`,
        plain_note: `The clause appears partially stated or ambiguous. ${def.whyItMatters}`,
        related_fields: [def.relatedField],
        sources: sourcePointerFromPatterns(text, def.patterns),
      });
    }
  }

  for (const rule of RISKY_PATTERN_RULES) {
    if (!rule.when({ text, paymentDays, isCreatorContract, isRenovationContract, depositPercent })) continue;
    addFlag(flags, {
      id: `flag_${flags.length + 1}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.title,
      plain_note: rule.note,
      related_fields: rule.relatedFields,
      sources: sourcePointerFromPatterns(text, rule.quotePatterns),
    });
  }

  const sortedFlags = sortFlags(flags)
    .map((flag, idx) => ({
      ...flag,
      id: `flag_${String(idx + 1).padStart(3, "0")}`,
    }))
    .slice(0, 15);

  const score = scoreRisk({ flags: sortedFlags, clauses });
  const label = riskLabel(score);
  const highFlags = sortedFlags.filter((f) => f.severity === "high").length;
  const mediumFlags = sortedFlags.filter((f) => f.severity === "medium").length;

  const recommendation = recommendationFromRisk({
    score,
    highFlags,
    mediumFlags,
  });

  const negotiationBullets = bucketNegotiationBullets(sortedFlags);
  const questionsToAsk = buildQuestionsToAsk(clauses, sortedFlags);

  return {
    risk: {
      score,
      label,
      high_flag_count: highFlags,
      medium_flag_count: mediumFlags,
      low_flag_count: sortedFlags.filter((f) => f.severity === "low").length,
    },
    recommendation,
    creator_contract: isCreatorContract,
    renovation_contract: isRenovationContract,
    red_flags: sortedFlags,
    clause_breakdown: clauses,
    negotiation_bullets: negotiationBullets,
    questions_to_ask: questionsToAsk,
    flags_section: {
      heading: "Flags & Clarifications",
      high_priority: sortedFlags.slice(0, 5),
      all_flags_summary: summarizeFromFlags(sortedFlags),
    },
  };
}
