import { getLlmConfigWithOverrides } from "./llmConfig.mjs";
import { reviewRiskScore } from "./reviewScore.mjs";

/**
 * review.v1: a lawyer-style review written for one side of the contract.
 * Two LLM calls: a fast core (verdict, deal, issues) shown first, then the
 * negotiation extras in the background. Strict validation: every quote and
 * every redline "before" must exist in the contract text, or it is dropped.
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

function normalizeRedline(raw, source) {
  if (!raw || typeof raw !== "object") return null;
  const before = findVerbatim(source, typeof raw.before === "string" ? raw.before : "");
  const after = typeof raw.after === "string" ? raw.after.replace(/\s+/g, " ").trim().slice(0, 1600) : "";
  return before && after && after !== before ? { before, after } : null;
}

/** The per-issue negotiation fields (asks, fallbacks, call script, redline). */
function issueExtras(raw, source) {
  return {
    ask_short: text(raw?.ask_short, 140),
    ask_email_line: text(raw?.ask_email_line || raw?.ask_short, 300),
    fallback: text(raw?.fallback, 160),
    walk_away_if: text(raw?.walk_away_if, 110),
    they_say: text(raw?.they_say, 120).replace(/^["“]|["”]$/g, ""),
    you_say: text(raw?.you_say, 240),
    redline: normalizeRedline(raw?.redline, source),
  };
}

function normalizeIssue(raw, index, source) {
  if (!raw || typeof raw !== "object") return null;
  const severity = SEVERITIES.has(raw.severity) ? raw.severity : null;
  const title = text(raw.title, 90);
  const quote = findVerbatim(source, typeof raw.quote === "string" ? raw.quote : "");
  if (!severity || !title || !quote) return null;
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
    ...issueExtras(raw, source),
  };
}

/** The review-wide extras: checklist, what you accept by signing, dates, what-ifs, questions. */
function reviewExtras(raw) {
  return {
    checklist: list(raw?.checklist, 6)
      .map((c) => ({ title: text(c?.title, 60), detail: text(c?.detail, 140) }))
      .filter((c) => c.title),
    sign_as_is: list(raw?.sign_as_is, 6)
      .map((s) => ({ severity: SEVERITIES.has(s?.severity) ? s.severity : "medium", text: text(s?.text, 160) }))
      .filter((s) => s.text),
    dates: list(raw?.dates, 8)
      .map((d) => ({ when: text(d?.when, 40), what: text(d?.what, 110) }))
      .filter((d) => d.when && d.what),
    what_ifs: list(raw?.what_ifs, 6)
      .map((w) => ({ q: text(w?.q, 60), a: text(w?.a, 320) }))
      .filter((w) => w.q && w.a),
    questions: list(raw?.questions, 4).map((q) => text(q, 160)).filter(Boolean),
  };
}

/**
 * Validates and cleans raw LLM output into a review.v1, or returns null when it
 * isn't usable. With `extrasStatus: "processing"` the negotiation extras are
 * still to come (see mergeExtras).
 */
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

  return {
    version: "review.v1",
    perspective,
    verdict,
    risk: reviewRiskScore(issues, verdict.action),
    deal,
    gaps: list(raw.gaps, 6).map((g) => text(g, 110)).filter(Boolean),
    issues,
    good: list(raw.good, 6)
      .map((g) => ({ section_ref: text(g?.section_ref, 12).replace(/^§\s*/, ""), text: text(g?.text, 200) }))
      .filter((g) => g.text),
    ...reviewExtras(raw),
    extras_status: meta.extrasStatus ?? "ready",
    generated_at: meta.generatedAt ?? new Date().toISOString(),
    ...(meta.model ? { model: meta.model } : {}),
  };
}

/** Adds the negotiation extras (matched to issues by id) to a core review. */
export function mergeExtras(review, raw, sourceText) {
  const source = sourceText || "";
  const byId = new Map(list(raw?.issues, 12).map((x) => [String(x?.id ?? ""), x]));
  return {
    ...review,
    issues: review.issues.map((issue) => {
      const extra = byId.get(issue.id);
      return extra ? { ...issue, ...issueExtras(extra, source) } : issue;
    }),
    ...reviewExtras(raw),
    extras_status: "ready",
  };
}

const WHO = (party) =>
  party
    ? `You act for: ${party}. Review the contract only from this party's side.`
    : `First work out who the two parties are. You act for the party most likely to have been sent this contract to review: usually the individual, the smaller business, the vendor or freelancer receiving a client's paper, the tenant, the homeowner, or the employee. Set "confidence" to how sure you are.`;

const STYLE = `How to write (every text field)
- Plain English for someone who is not a lawyer. Short sentences. Call your client "you". Call the other side by a short name (other_short).
- No em dashes or en dashes. No "not X but Y" phrasing. No hype, filler or exclamation marks.`;

/** Fast first call: who, the verdict, the deal and the issues. Enough for steps 1 and 2 of the page. */
export function buildCorePrompt({ extractedText, party }) {
  return `
You are an experienced contracts lawyer. Your client is about to sign the contract below and wants your honest review before they do.

${WHO(party)}

How to judge
- Rank issues by real consequence for your client: money they could lose or fail to collect, liability they take on, how hard it is to get out, deadlines they could miss, and work they could be forced to do.
- Every issue must be a real problem for YOUR client. A term that favours your client goes in "good", not "issues". A restriction that is absent (for example, no non-compete) is good for your client, never a risk.
- Check what the contract relies on but leaves out: missing attachments it refers to, an undefined start date, no delivery dates, no approval process, no late fee. Put these in "gaps", and raise the serious ones as issues too.
- Keep only issues worth raising. Usually 3 to 7. Never pad the list.
- Never invent facts. Quote the contract exactly.
- "usual" is what a fair, common version of the term looks like, in 3 to 7 words.
- When the contract is silent on something, say it is silent. Never claim it "says" something it doesn't.

${STYLE}
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
  "verdict": {"action": "sign|negotiate|do_not_sign_yet", "line": "1 or 2 short sentences giving the main reason, from your client's side"},
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
      "usual": "3 to 7 words"
    }
  ],
  "good": [{"section_ref": "", "text": "up to 6 terms that fairly protect your client, each up to 22 words"}]
}

Order issues most serious first.

Contract text:
${extractedText}
`.trim();
}

/** Second call, run in the background: what to ask for, fallbacks, the call script, redlines, checklist, dates and what-ifs. */
export function buildExtrasPrompt({ extractedText, review }) {
  const p = review.perspective;
  const issues = review.issues
    .map((i) => `- id ${i.id} [${i.severity}] ${i.section_ref ? `§${i.section_ref} ` : ""}${i.title}\n  quote: "${i.quote}"\n  why: ${i.why}`)
    .join("\n");
  return `
You are an experienced contracts lawyer acting for ${p.party} (the ${p.role}) in this contract with ${p.other_party} (the ${p.other_role}). Call the other side "${p.other_short}".

You have already found these issues:
${issues}

Now prepare your client to act on them.
- For each issue, by its id: the change to ask for, what to accept if they refuse, when to walk away (deal-breakers only), the pushback they'll likely give and a calm reply, and a redline.
- Numbers and dates you propose may appear only in ask, fallback, you_say and redline.after. Never invent facts about the contract itself.
- When the contract is silent on something, say it is silent.

${STYLE}

Return ONLY this JSON object:
{
  "issues": [
    {
      "id": "the issue id from the list above",
      "ask_short": "the change to ask for, up to 16 words",
      "ask_email_line": "the same ask as one polite sentence your client would write in an email",
      "fallback": "what to accept if they refuse, up to 18 words",
      "walk_away_if": "only for deal-breakers, up to 12 words, else empty",
      "they_say": "the likely pushback, in their words, up to 14 words",
      "you_say": "a calm reply your client can give, up to 30 words",
      "redline": {"before": "the full contract sentence or sentences to replace, copied character for character", "after": "replacement wording in the contract's own style that fixes the issue"}
    }
  ],
  "checklist": [{"title": "a plain action in 2 to 5 everyday words, e.g. Get the rate sheet", "detail": "one short sentence in everyday words, up to 12 words"}],
  "sign_as_is": [{"severity": "high|medium|low", "text": "what your client accepts by signing unchanged, up to 18 words"}],
  "dates": [{"when": "short timing label from the contract, e.g. On signing", "what": "up to 10 words"}],
  "what_ifs": [{"q": "a likely situation, up to 6 words", "a": "what the contract says happens, up to 40 words, citing the clause like (§3)"}],
  "questions": ["up to 4 questions to ask the other side before signing"]
}

The checklist is loose ends in THIS contract to tie up before signing, separate from the asks: blanks left unfilled, attachments it refers to that are missing, details it leaves undefined (for example where notices go). Every item must point to something specific in, or missing from, this contract. No generic admin advice (keeping records, setting up payment, reading the brief). Write the checklist for someone with no legal or business background: everyday words only, no jargon such as "acceptance criteria", "bind", "itemized", "execute" or "authority". For example, "Check who can sign for them" with "Make sure the person signing is allowed to sign for the company." Give 0 to 5 checklist items; an empty list is fine. Give 3 to 6 sign_as_is lines and 3 to 6 what_ifs. Use "redline": null when an issue can't be fixed by editing existing text.

Contract text:
${extractedText}
`.trim();
}

/** Kept for scripts: both prompts' rules in one request. */
export function buildReviewPrompt({ extractedText, party }) {
  return buildCorePrompt({ extractedText, party });
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

async function chatJson(llm, prompt, reasoning) {
  const res = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${llm.apiKey}` },
    body: JSON.stringify({
      model: llm.model,
      // gpt-5 models think before answering; a lower effort answers much sooner.
      ...(reasoning && /^gpt-5/.test(llm.model) ? { reasoning_effort: reasoning } : {}),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a careful contracts lawyer writing for a client who is not a lawyer. Return strict JSON only. Never include markdown.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Review request failed (${res.status}): ${detail.slice(0, 300) || res.statusText}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  return findJsonObject(typeof content === "string" ? content : "");
}

async function llmFor({ analysisMode, llmModel }) {
  const llm = await getLlmConfigWithOverrides({ analysisMode, llmModel });
  if (llm.mode !== "llm") return { llm, reason: "analysis_mode_not_llm" };
  if (!llm.apiKey) return { llm, reason: "llm_api_key_missing" };
  return { llm, reason: null };
}

/**
 * The fast first review: steps 1 and 2 of the page. Returns { ok, review, reason }.
 * The review comes back with extras_status "processing"; generateReviewExtras fills the rest.
 */
export async function generateCoreReview({ extractedText, analysisMode, llmModel, party, reasoning = "low" }) {
  const { llm, reason } = await llmFor({ analysisMode, llmModel });
  if (reason) return { ok: false, review: null, reason };
  const source = (extractedText || "").slice(0, SOURCE_LIMIT);
  if (!source.trim()) return { ok: false, review: null, reason: "no_extracted_text" };
  const raw = await chatJson(llm, buildCorePrompt({ extractedText: source, party }), reasoning);
  const review = normalizeReview(raw, source, { model: llm.model, extrasStatus: "processing" });
  return review ? { ok: true, review, reason: "ok" } : { ok: false, review: null, reason: "invalid_review" };
}

/** The background half: asks, fallbacks, call script, redlines, checklist, dates, what-ifs. */
export async function generateReviewExtras({ extractedText, review, analysisMode = "llm", llmModel, reasoning = "low" }) {
  const { llm, reason } = await llmFor({ analysisMode, llmModel });
  if (reason) return { ok: false, review, reason };
  const source = (extractedText || "").slice(0, SOURCE_LIMIT);
  const raw = await chatJson(llm, buildExtrasPrompt({ extractedText: source, review }), reasoning);
  if (!raw) return { ok: false, review, reason: "invalid_extras" };
  return { ok: true, review: mergeExtras(review, raw, source), reason: "ok" };
}

/** Both halves in sequence (used by scripts). */
export async function generateContractReview(args) {
  const core = await generateCoreReview(args);
  if (!core.ok) return core;
  return generateReviewExtras({ ...args, review: core.review });
}
