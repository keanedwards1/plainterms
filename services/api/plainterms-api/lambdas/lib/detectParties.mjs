import { getLlmConfigWithOverrides } from "./llmConfig.mjs";
import { logLlmUsage } from "./llmUsage.mjs";

/**
 * Finds the parties to a contract so the user can say which one they are
 * before the analysis runs. Rules first (most contracts name the parties in the
 * opening line); a tiny model call only when the rules can't find two.
 */

const HEAD_CHARS = 3000;
const ROLE_WORDS =
  "client|customer|vendor|supplier|contractor|subcontractor|consultant|freelancer|company|owner|homeowner|landlord|lessor|tenant|lessee|employer|employee|buyer|seller|purchaser|licensor|licensee|provider|agency|studio|talent|creator|brand|borrower|lender|discloser|recipient|party";

function cleanName(raw) {
  let name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    // Drop descriptions that follow the name: ", a Delaware corporation", ", with offices at ..."
    .replace(/,\s+(?:a|an|the|with|whose|located|having|of)\b.*$/i, "")
    .replace(/^(?:by\s+and\s+)?between\s+/i, "")
    .replace(/^(?:and|the)\s+/i, "")
    .replace(/[,;:\s]+$/, "")
    .trim();
  if (name.length > 120) name = name.slice(0, 120).trim();
  return name;
}

function cleanRole(raw) {
  return String(raw ?? "")
    .replace(/["“”'‘’]/g, "")
    .replace(/^the\s+/i, "")
    .trim()
    .toLowerCase()
    .slice(0, 40);
}

function uniqueParties(parties) {
  const seen = new Set();
  return parties.filter((p) => {
    const key = p.name.toLowerCase();
    if (!p.name || p.name.length < 2 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Rules only: `between X ("Client") and Y ("Vendor")` and close variants. */
export function detectPartiesByRules(text) {
  const head = String(text ?? "").slice(0, HEAD_CHARS).replace(/\s+/g, " ");
  const role = `\\(\\s*(?:hereinafter\\s+(?:referred\\s+to\\s+as\\s+|called\\s+)?)?(?:the\\s+)?["“”'‘’]?([A-Za-z][A-Za-z -]{1,30}?)["“”'‘’]?\\s*\\)`;
  const pair = new RegExp(`between\\s+(.{2,160}?)\\s*${role}\\s*,?\\s*and\\s+(.{2,160}?)\\s*${role}`, "i");
  const m = head.match(pair);
  if (m) {
    const parties = uniqueParties([
      { name: cleanName(m[1]), role: cleanRole(m[2]) },
      { name: cleanName(m[3]), role: cleanRole(m[4]) },
    ]);
    if (parties.length === 2) return parties;
  }

  // `X ("Landlord") and Y ("Tenant")` without "between".
  const loose = new RegExp(`([A-Z][\\w.,&' -]{2,120}?)\\s*${role}\\s*,?\\s*and\\s+([A-Z][\\w.,&' -]{2,120}?)\\s*${role}`);
  const n = head.match(loose);
  if (n && new RegExp(`^(${ROLE_WORDS})$`, "i").test(cleanRole(n[2]))) {
    const parties = uniqueParties([
      // The match can start inside a heading ("LEASE. Maple Street LLC"); keep the last sentence.
      { name: cleanName(n[1]).split(/[.:]\s+(?=[A-Z])/).pop(), role: cleanRole(n[2]) },
      { name: cleanName(n[3]), role: cleanRole(n[4]) },
    ]);
    if (parties.length === 2) return parties;
  }
  return [];
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

/** Keeps only parties whose name really appears in the contract. */
export function normalizeDetectedParties(raw, text) {
  const lower = String(text ?? "").toLowerCase().replace(/\s+/g, " ");
  const list = Array.isArray(raw?.parties) ? raw.parties : [];
  return uniqueParties(
    list
      .slice(0, 4)
      .map((p) => ({ name: cleanName(p?.name), role: cleanRole(p?.role) }))
      .filter((p) => p.name && lower.includes(p.name.toLowerCase()))
  );
}

export async function detectPartiesWithModel(text, { timeoutMs = 8000 } = {}) {
  const llm = await getLlmConfigWithOverrides({ analysisMode: "llm", llmModel: "gpt-5-mini" });
  if (!llm.apiKey) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${llm.apiKey}` },
      body: JSON.stringify({
        model: llm.model,
        reasoning_effort: "minimal",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You list the parties to a contract. Return strict JSON only." },
          {
            role: "user",
            content: `Who are the parties to this contract? Return {"parties":[{"name":"exact name as written","role":"their role word, e.g. client, vendor, landlord, tenant"}]} with 2 to 4 parties. Use an empty list if you can't tell.\n\nContract opening:\n${String(text).slice(0, HEAD_CHARS)}`,
          },
        ],
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    logLlmUsage("precheck.parties", llm.model, json);
    return normalizeDetectedParties(findJsonObject(json?.choices?.[0]?.message?.content ?? ""), text);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Returns [{ name, role }] for the contract's parties, or [] when they can't be found. */
export async function detectParties(text, deps = {}) {
  const byRules = detectPartiesByRules(text);
  if (byRules.length >= 2) return byRules;
  const viaModel = await (deps.detectWithModel ?? detectPartiesWithModel)(text);
  return viaModel.length >= 2 ? viaModel : [];
}
