import { getLlmConfigWithOverrides } from "./llmConfig.mjs";

const STATUS_VALUES = new Set(["found", "not_found", "not_clearly_stated"]);

function trim(value, max = 500) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return v.length > max ? `${v.slice(0, max)}...` : v;
}

function normalizeStatus(value) {
  if (typeof value !== "string") return "not_clearly_stated";
  const status = value.trim().toLowerCase();
  if (STATUS_VALUES.has(status)) return status;
  return "not_clearly_stated";
}

function ensureQuotes(quotes, sourceText) {
  const items = Array.isArray(quotes) ? quotes : [];
  const normalizedSource = sourceText || "";
  const kept = [];

  for (const q of items) {
    const quote = trim(q, 220);
    if (!quote) continue;
    if (normalizedSource && !normalizedSource.includes(quote)) continue;
    kept.push(quote);
    if (kept.length >= 3) break;
  }

  return kept;
}

function safeField(value, sourceText, fallbackSummary) {
  const obj = typeof value === "object" && value !== null ? value : {};
  const status = normalizeStatus(obj.status);
  const summary = trim(obj.summary, 500) || fallbackSummary;
  const quotes = ensureQuotes(obj.quotes, sourceText);

  return {
    status,
    summary,
    quotes,
    sources: [],
  };
}

function findJsonObject(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildPrompt({ filename, contentType, extractedText }) {
  return `
You are a contract analyzer that helps a homeowner understand a renovation,
remodeling, or construction agreement before they sign it (the same structure
also covers general services agreements). Read from the homeowner's side: the
"client" is the property owner and the "contractor" is the builder/tradesperson.
Return ONLY valid JSON with this exact top-level object shape:
{
  "overview": {"status":"found|not_found|not_clearly_stated","summary":"...","quotes":["..."]},
  "contractPurpose": {"status":"...","summary":"...","quotes":["..."]},
  "partiesClient": {"status":"...","summary":"...","quotes":["..."]},
  "partiesContractor": {"status":"...","summary":"...","quotes":["..."]},
  "scopeServices": {"status":"...","summary":"...","quotes":["..."]},
  "termTermination": {"status":"...","summary":"...","quotes":["..."]},
  "payment": {"status":"...","summary":"...","quotes":["..."]},
  "confidentiality": {"status":"...","summary":"...","quotes":["..."]}
}

Rules:
- Be neutral, cautious, and non-prescriptive.
- If unclear, use status "not_clearly_stated".
- If absent, use status "not_found".
- Keep summaries concise.
- Quotes must be short exact excerpts from the source text.

Document metadata:
- filename: ${filename || "unknown"}
- contentType: ${contentType || "unknown"}

Document text:
${extractedText}
  `.trim();
}

export async function analyzeExtractedTextWithLlm({
  filename,
  contentType,
  extractedText,
  analysisMode,
  llmModel,
}) {
  const llm = await getLlmConfigWithOverrides({ analysisMode, llmModel });
  if (llm.mode !== "llm") {
    return {
      usedLlm: false,
      reason: "analysis_mode_not_llm",
      mode: llm.mode,
      model: llm.model,
      fields: null,
    };
  }

  if (!llm.apiKey) {
    return {
      usedLlm: false,
      reason: "llm_api_key_missing",
      mode: llm.mode,
      model: llm.model,
      fields: null,
    };
  }

  const sourceText = (extractedText || "").slice(0, 18000);
  if (!sourceText.trim()) {
    return {
      usedLlm: false,
      reason: "no_extracted_text",
      mode: llm.mode,
      model: llm.model,
      fields: null,
    };
  }

  const prompt = buildPrompt({
    filename,
    contentType,
    extractedText: sourceText,
  });

  const res = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured contract facts. Return strict JSON only. Never include markdown.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${detail || res.statusText}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const parsed = findJsonObject(typeof content === "string" ? content : "");
  if (!parsed) throw new Error("LLM response did not include valid JSON object content.");

  return {
    usedLlm: true,
    reason: "ok",
    mode: llm.mode,
    model: llm.model,
    fields: {
      overview: safeField(
        parsed.overview,
        sourceText,
        "The document appears to define a services relationship, but details are limited."
      ),
      contractPurpose: safeField(
        parsed.contractPurpose,
        sourceText,
        "The agreement appears to set terms for services and payment."
      ),
      partiesClient: safeField(
        parsed.partiesClient,
        sourceText,
        "Client identity was not clearly stated in the extracted text."
      ),
      partiesContractor: safeField(
        parsed.partiesContractor,
        sourceText,
        "Contractor identity was not clearly stated in the extracted text."
      ),
      scopeServices: safeField(
        parsed.scopeServices,
        sourceText,
        "Service scope was not clearly stated in the extracted text."
      ),
      termTermination: safeField(
        parsed.termTermination,
        sourceText,
        "Term and termination details were not clearly stated in the extracted text."
      ),
      payment: safeField(
        parsed.payment,
        sourceText,
        "Payment details were not clearly stated in the extracted text."
      ),
      confidentiality: safeField(
        parsed.confidentiality,
        sourceText,
        "Confidentiality details were not clearly stated in the extracted text."
      ),
    },
  };
}
