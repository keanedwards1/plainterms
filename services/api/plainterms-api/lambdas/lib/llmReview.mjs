import { getLlmConfigWithOverrides } from "./llmConfig.mjs";
import { reviewRiskScore } from "./reviewScore.mjs";

/**
 * review.v1: a lawyer-style review written for one side of the contract.
 * One structured LLM call, then strict validation: every quote and every
 * redline "before" must exist in the contract text, or the item is dropped.
 */

const SOURCE_LIMIT = 24000;
const SEVERITIES = new Set(["high", "medium", "low"]);
const PRIORITIES = new Set(["must", "worth", "nice"]);
const ACTIONS = new Set(["sign", "negotiate", "do_not_sign_yet"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const DEAL_LABELS = ["Between", "The work", "Fee", "Payment", "Timing", "Ending it", "Ownership", "Disputes"];
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
// The headline always matches the action, so the verdict never reads differently from the decision.
const HEADLINES = { sign: "Looks fair to sign", negotiate: "Negotiate before you sign", do_not_sign_yet: "Don't sign this yet" };

function capFirst(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function text(value, max = 400) {
  if (typeof value !== "string") return "";
  // House style: no em or en dashes in anything the user reads.
  const v = value.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

function list(value, max) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

/** Lowercase-insensitive, quote/dash/whitespace-insensitive view of a string, with a map back to source indexes. */
function normalizeWithMap(source) {
  let out = "";
  const map = [];
  let lastWasSpace = false;
  for (let i = 0; i < source.length; i += 1) {
    let ch = source[i];
    if (/\s/.test(ch)) {
      if (lastWasSpace || out.length === 0) continue;
      ch = " ";
      lastWasSpace = true;
    } else {
      lastWasSpace = false;
      if ("‘’‛′`".includes(ch)) ch = "'";
      else if ("“”‟″".includes(ch)) ch = '"';
      else if ("‐‑‒–—−".includes(ch)) ch = "-";
    }
    out += ch.toLowerCase();
    map.push(i);
  }
  return { norm: out, map };
}

/** Returns the exact source substring matching `snippet` (ignoring quotes, dashes, spacing and case), or "". */
export function findVerbatim(source, snippet) {
  if (!source || !snippet) return "";
  const full = normalizeWithMap(snippet).norm.trim();
  // Prefer a match that keeps the snippet's closing punctuation; fall back to one without it.
  const candidates = [full, full.replace(/[\s.;,:]+$/, "")];
  const { norm, map } = normalizeWithMap(source);
  for (const needle of candidates) {
    if (needle.length < 4) continue;
    const at = norm.indexOf(needle);
    if (at < 0) continue;
    return source.slice(map[at], map[at + needle.length - 1] + 1);
  }
  return "";
}

function normalizeIssue(raw, index, source) {
  if (!raw || typeof raw !== "object") return null;
  const severity = SEVERITIES.has(raw.severity) ? raw.severity : null;
  const title = text(raw.title, 90);
  const quote = findVerbatim(source, typeof raw.quote === "string" ? raw.quote : "");
  if (!severity || !title || !quote) return null;

  let redline = null;
  if (raw.redline && typeof raw.redline === "object") {
    const before = findVerbatim(source, typeof raw.redline.before === "string" ? raw.redline.before : "");
    const after = typeof raw.redline.after === "string" ? raw.redline.after.replace(/\s+/g, " ").trim().slice(0, 1600) : "";
    if (before && after && after !== before) redline = { before, after };
  }

  const priority = PRIORITIES.has(raw.priority) ? raw.priority : severity === "high" ? "must" : severity === "medium" ? "worth" : "nice";
  return {
    id: `i${index + 1}`,
    severity,
    priority,
    section_ref: text(raw.section_ref, 12).replace(/^§\s*/, ""),
    title,
    quote,
    why: text(raw.why, 320),
    why_short: text(raw.why_short || raw.why, 140),
    usual: capFirst(text(raw.usual, 60)),
    ask_short: text(raw.ask_short, 140),
    ask_email_line: text(raw.ask_email_line || raw.ask_short, 300),
    fallback: text(raw.fallback, 160),
    walk_away_if: text(raw.walk_away_if, 110),
    they_say: text(raw.they_say, 120).replace(/^["“]|["”]$/g, ""),
    you_say: text(raw.you_say, 240),
    redline,
  };
}

/** Validates and cleans raw LLM output into a review.v1, or returns null when it isn't usable. */
export function normalizeReview(raw, sourceText, meta = {}) {
  if (!raw || typeof raw !== "object") return null;
  const source = sourceText || "";

  const p = raw.perspective && typeof raw.perspective === "object" ? raw.perspective : {};
  const perspective = {
    party: text(p.party, 120),
    role: text(p.role, 40).toLowerCase(),
    other_party: text(p.other_party, 120),
    other_role: text(p.other_role, 40).toLowerCase(),
    other_short: text(p.other_short, 30) || text(p.other_party, 30),
    parties: list(p.parties, 4)
      .map((x) => ({ name: text(x?.name, 120), role: text(x?.role, 40).toLowerCase() }))
      .filter((x) => x.name),
    confidence: CONFIDENCE.has(p.confidence) ? p.confidence : "medium",
  };
  if (!perspective.party || !perspective.other_party) return null;
  if (perspective.parties.length < 2) {
    perspective.parties = [
      { name: perspective.party, role: perspective.role },
      { name: perspective.other_party, role: perspective.other_role },
    ];
  }

  const v = raw.verdict && typeof raw.verdict === "object" ? raw.verdict : {};
  const action = ACTIONS.has(v.action) ? v.action : "negotiate";
  const verdict = { action, headline: HEADLINES[action], line: text(v.line, 220) };
  if (!verdict.line) return null;

  const seen = new Set();
  const issues = list(raw.issues, 10)
    .map((item, i) => normalizeIssue(item, i, source))
    .filter((item) => {
      if (!item) return false;
      const key = item.quote.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 8)
    .map((item, i) => ({ ...item, id: `i${i + 1}` }));

  const dealByLabel = new Map();
  for (const row of list(raw.deal, 12)) {
    const label = DEAL_LABELS.find((l) => l.toLowerCase() === String(row?.label ?? "").trim().toLowerCase());
    const value = text(row?.value, 200);
    if (label && value && !dealByLabel.has(label)) dealByLabel.set(label, { label, value, flag: text(row?.flag, 80) });
  }
  const deal = DEAL_LABELS.filter((l) => dealByLabel.has(l)).map((l) => dealByLabel.get(l));

  const risk = reviewRiskScore(issues, verdict.action);

  return {
    version: "review.v1",
    perspective,
    verdict,
    risk,
    deal,
    gaps: list(raw.gaps, 6).map((g) => text(g, 110)).filter(Boolean),
    issues,
    good: list(raw.good, 6)
      .map((g) => ({ section_ref: text(g?.section_ref, 12).replace(/^§\s*/, ""), text: text(g?.text, 200) }))
      .filter((g) => g.text),
    checklist: list(raw.checklist, 6)
      .map((c) => ({ title: text(c?.title, 60), detail: text(c?.detail, 140) }))
      .filter((c) => c.title),
    sign_as_is: list(raw.sign_as_is, 6)
      .map((s) => ({ severity: SEVERITIES.has(s?.severity) ? s.severity : "medium", text: text(s?.text, 160) }))
      .filter((s) => s.text),
    dates: list(raw.dates, 8)
      .map((d) => ({ when: text(d?.when, 40), what: text(d?.what, 110) }))
      .filter((d) => d.when && d.what),
    what_ifs: list(raw.what_ifs, 6)
      .map((w) => ({ q: text(w?.q, 60), a: text(w?.a, 320) }))
      .filter((w) => w.q && w.a),
    questions: list(raw.questions, 4).map((q) => text(q, 160)).filter(Boolean),
    generated_at: meta.generatedAt ?? new Date().toISOString(),
    ...(meta.model ? { model: meta.model } : {}),
  };
}

export function buildReviewPrompt({ extractedText, party }) {
  const who = party
    ? `You act for: ${party}. Review the contract only from this party's side.`
    : `First work out who the two parties are. You act for the party most likely to have been sent this contract to review: usually the individual, the smaller business, the vendor or freelancer receiving a client's paper, the tenant, the homeowner, or the employee. Set "confidence" to how sure you are.`;

  return `
You are an experienced contracts lawyer. Your client is about to sign the contract below and wants your honest review before they do.

${who}

How to judge
- Rank issues by real consequence for your client: money they could lose or fail to collect, liability they take on, how hard it is to get out, deadlines they could miss, and work they could be forced to do.
- Every issue must be a real problem for YOUR client. A term that favours your client goes in "good", not "issues". A restriction that is absent (for example, no non-compete) is good for your client, never a risk.
- Check what the contract relies on but leaves out: missing attachments it refers to, an undefined start date, no delivery dates, no approval process, no late fee. Put these in "gaps", and raise the serious ones as issues too.
- Keep only issues worth raising. Usually 3 to 7. Never pad the list.
- Never invent facts. Quote the contract exactly. Numbers and dates you propose may appear only in ask, fallback, you_say and redline.after.
- "usual" is what a fair, common version of the term looks like, in 3 to 7 words.
- When the contract is silent on something, say it is silent. Never claim it "says" something it doesn't.

How to write (every text field)
- Plain English for someone who is not a lawyer. Short sentences. Call your client "you". Call the other side by a short name (other_short).
- No em dashes or en dashes. No "not X but Y" phrasing. No hype, filler or exclamation marks.
- Titles state the problem from your client's side in 4 to 9 words, for example "Harbor can cancel without paying for work done".

Return ONLY this JSON object:
{
  "perspective": {
    "party": "full name of the party you act for",
    "role": "their role word in the contract, lowercase, e.g. vendor",
    "other_party": "full name of the other party",
    "other_role": "their role word, lowercase",
    "other_short": "1 or 2 word short name for the other party",
    "parties": [{"name": "...", "role": "..."}],
    "confidence": "high|medium|low"
  },
  "verdict": {
    "action": "sign|negotiate|do_not_sign_yet",
    "line": "1 or 2 short sentences giving the main reason, from your client's side"
  },
  "deal": [
    {"label": "Between|The work|Fee|Payment|Timing|Ending it|Ownership|Disputes", "value": "up to 22 words explaining the term in plain English from your client's side (don't copy the contract's wording; say so if it is silent; for Ending it, cover both sides)", "flag": "a short red-flag phrase only when something critical is wrong, else empty"}
  ],
  "gaps": ["up to 6 things the contract needs but leaves out, each up to 12 words"],
  "issues": [
    {
      "severity": "high|medium|low",
      "priority": "must|worth|nice",
      "section_ref": "clause number such as 3 or 6.2, or empty",
      "title": "4 to 9 words",
      "quote": "the exact words from the contract that cause the problem, copied character for character, 4 to 40 words",
      "why": "up to 45 words: the concrete consequence for your client",
      "why_short": "up to 18 words",
      "usual": "3 to 7 words",
      "ask_short": "the change to ask for, up to 16 words",
      "ask_email_line": "the same ask as one polite sentence your client would write in an email",
      "fallback": "what to accept if they refuse, up to 18 words",
      "walk_away_if": "only for deal-breakers, up to 12 words, else empty",
      "they_say": "the likely pushback, in their words, up to 14 words",
      "you_say": "a calm reply your client can give, up to 30 words",
      "redline": {"before": "the full contract sentence or sentences to replace, copied character for character", "after": "replacement wording in the contract's own style that fixes the issue"}
    }
  ],
  "good": [{"section_ref": "", "text": "up to 6 terms that fairly protect your client, each up to 22 words"}],
  "checklist": [{"title": "up to 7 words", "detail": "up to 16 words"}],
  "sign_as_is": [{"severity": "high|medium|low", "text": "what your client accepts by signing unchanged, up to 18 words"}],
  "dates": [{"when": "short timing label from the contract, e.g. On signing", "what": "up to 10 words"}],
  "what_ifs": [{"q": "a likely situation, up to 6 words", "a": "what the contract says happens, up to 40 words, citing the clause like (§3)"}],
  "questions": ["up to 4 questions to ask the other side before signing"]
}

Order issues most serious first. The checklist is practical things to get or check before signing, separate from the negotiation asks: missing attachments, blanks to fill in, who signs and their authority, licences or insurance to verify, copies to keep. Give 3 to 6 checklist items specific to this contract, 3 to 6 sign_as_is lines and 3 to 6 what_ifs. Use "redline": null when an issue can't be fixed by editing existing text.

Contract text:
${extractedText}
`.trim();
}

function findJsonObject(content) {
  if (!content) return null;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Generates a review.v1 for the contract. Returns { ok, review, reason }.
 * `party` pins the side; without it the model picks the likely reviewer.
 */
export async function generateContractReview({ extractedText, analysisMode, llmModel, party }) {
  const llm = await getLlmConfigWithOverrides({ analysisMode, llmModel });
  if (llm.mode !== "llm") return { ok: false, review: null, reason: "analysis_mode_not_llm" };
  if (!llm.apiKey) return { ok: false, review: null, reason: "llm_api_key_missing" };

  const source = (extractedText || "").slice(0, SOURCE_LIMIT);
  if (!source.trim()) return { ok: false, review: null, reason: "no_extracted_text" };

  const res = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${llm.apiKey}` },
    body: JSON.stringify({
      model: llm.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful contracts lawyer writing for a client who is not a lawyer. Return strict JSON only. Never include markdown.",
        },
        { role: "user", content: buildReviewPrompt({ extractedText: source, party }) },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Review request failed (${res.status}): ${detail.slice(0, 300) || res.statusText}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const raw = findJsonObject(typeof content === "string" ? content : "");
  const review = normalizeReview(raw, source, { model: llm.model });
  if (!review) return { ok: false, review: null, reason: "invalid_review" };
  return { ok: true, review, reason: "ok" };
}
