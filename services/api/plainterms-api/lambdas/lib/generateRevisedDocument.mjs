import { getLlmConfig } from "./llmConfig.mjs";

const MAX_SOURCE_CHARS = 22000;

function trim(value, max = 1200) {
  if (typeof value !== "string") return "";
  const next = value.trim();
  if (!next) return "";
  return next.length > max ? `${next.slice(0, max)}...` : next;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function findJsonObject(text) {
  if (!text || typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeChanges(rawChanges) {
  return asArray(rawChanges)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const before = trim(item.before, 240);
      const after = trim(item.after, 260);
      const reason = trim(item.reason, 260);
      const severityRaw = trim(item.severity, 32).toLowerCase();
      const severity = ["high", "medium", "low"].includes(severityRaw) ? severityRaw : undefined;
      if (!before || !after || !reason) return null;
      return {
        before,
        after,
        reason,
        ...(severity ? { severity } : {}),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function buildPrompt({ filename, extractedText, flags, clauses, creatorContract }) {
  const flagLines = flags.length
    ? flags
        .map((flag, idx) => `${idx + 1}. [${flag.severity}] ${flag.title} — ${flag.plain_note}`)
        .join("\n")
    : "None";

  const clauseLines = clauses.length
    ? clauses
        .map(
          (clause, idx) =>
            `${idx + 1}. [${clause.status}] ${clause.title} — ${clause.why_it_matters}`
        )
        .join("\n")
    : "None";

  return `
You are a contracts attorney specializing in creator, influencer, and independent contractor agreements.
Your job is to rewrite the document to protect the talent/creator's interests while remaining professionally fair and negotiation-ready for both parties.

Return ONLY valid JSON in this exact shape:
{
  "revised_text": "full revised document text",
  "summary": "1-3 sentence summary of what was improved",
  "changes": [
    {
      "before": "verbatim excerpt copied exactly from the original document — do not paraphrase or describe",
      "after": "the revised replacement text",
      "reason": "why this change reduces risk or ambiguity",
      "severity": "high|medium|low"
    }
  ]
}

Editing rules — apply ALL that are relevant, do not skip:

INDEMNIFICATION: One-sided indemnification must always be made mutual. Both parties should indemnify each other for their own acts, omissions, and breaches. Never leave indemnification running in one direction only.

MORALITY / TERMINATION FOR CAUSE: "Sole discretion" termination clauses are always high-risk. Replace with: (a) a reasonable person standard, (b) written notice specifying the conduct, (c) a minimum 5-business-day cure period before termination is permitted.

UNILATERAL CHANGES: Any clause allowing one party to change requirements, specifications, or terms unilaterally must be replaced with mutual written consent.

PAYMENT TERMS: Net 60 or longer must be shortened to Net 30. Add a late payment provision (interest at 1.5% per month or the maximum permitted by law).

SCOPE / SOW: If deliverables reference a future Schedule or SOW, add a 30-day deadline for the other party to provide it and state that no additional work is owed until it is delivered.

MISSING CLAUSES: If governing law, assignment restrictions, or dispute resolution are absent, add balanced versions: neutral governing law with mutual consent to jurisdiction, no assignment without written consent from both parties.
${creatorContract ? `
CREATOR-SPECIFIC RULES (apply because this is a creator/influencer/talent agreement):

LICENSE SCOPE: Irrevocable, perpetual, worldwide licenses must be narrowed to: revocable, limited to the Agreement term, non-exclusive where possible. Remove or limit waivers of approval, attribution, and removal rights — the creator should retain meaningful approval rights over how their likeness and content are used.

EXCLUSIVITY: Exclusivity clauses must: define the competing category specifically, state the exact duration, and include either a minimum guaranteed payment or a creator right to terminate if no paid work is assigned within 30 days.

WARRANTY: In a creator services agreement, broad "as is" disclaimers that shift all quality risk to the creator are one-sided. Rewrite so the creator warrants professional-quality work meeting industry standards, and remove brand-favoring "as is" language that is not appropriate in this context.
` : `
NON-CREATOR CONTRACT RULES (apply because this is not a creator/influencer agreement):

LICENSE / IP OWNERSHIP: Work-for-hire and full IP assignment clauses are standard and should not be narrowed unless the scope is unreasonably broad beyond the stated project. Flag only if the assignment extends to pre-existing IP or work outside the contract scope.

WARRANTY: Industry-standard "as is" disclaimers in technology, SaaS, or professional services agreements are appropriate and should not be removed. Flag only if warranties are completely absent or create unreasonable obligations for one party.
`}
GENERAL: Keep parties, dates, amounts, and core business intent intact. Preserve document structure and numbering. Do not mention AI, models, or internal process. Keep revised_text professional and negotiation-ready.

Document metadata:
- file_name: ${filename || "Contract document"}

Detected risk flags:
${flagLines}

Detected unclear/missing clauses:
${clauseLines}

Original document text:
${extractedText}
`.trim();
}

export async function generateRevisedDocumentWithLlm({
  filename,
  extractedText,
  redFlags,
  clauseBreakdown,
  creatorContract = false,
}) {
  const sourceText = trim(extractedText, MAX_SOURCE_CHARS);
  if (!sourceText) {
    throw new Error("No extracted text is available for revision.");
  }

  const llm = await getLlmConfig();
  if (!llm?.apiKey) {
    throw new Error("LLM API key is not configured for revision generation.");
  }

  const flags = asArray(redFlags)
    .map((item) => ({
      title: trim(item?.title, 200),
      plain_note: trim(item?.plain_note, 260),
      severity: trim(item?.severity, 24).toLowerCase() || "medium",
    }))
    .filter((item) => item.title && item.plain_note)
    .slice(0, 10);

  const clauses = asArray(clauseBreakdown)
    .map((item) => ({
      title: trim(item?.title, 160),
      status: trim(item?.status, 32).toLowerCase(),
      why_it_matters: trim(item?.why_it_matters, 260),
    }))
    .filter((item) => item.title && item.why_it_matters && item.status && item.status !== "present")
    .slice(0, 12);

  const prompt = buildPrompt({
    filename,
    extractedText: sourceText,
    flags,
    clauses,
    creatorContract,
  });

  const response = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a contracts attorney specializing in creator and independent contractor agreements. Your priority is to protect the talent's interests while keeping the contract professionally fair. Apply every applicable editing rule. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Revision LLM request failed (${response.status}): ${detail || response.statusText}`);
  }

  const raw = await response.json();
  const content = raw?.choices?.[0]?.message?.content;
  const parsed = findJsonObject(typeof content === "string" ? content : "");
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Revision response did not include a valid JSON object.");
  }

  const revisedText = trim(parsed.revised_text, 32000);
  if (!revisedText || revisedText.length < 40) {
    throw new Error("Revision response did not include usable revised_text.");
  }

  const summary = trim(parsed.summary, 600);
  const changes = sanitizeChanges(parsed.changes);

  return {
    revised_text: revisedText,
    summary:
      summary ||
      "Updated language to reduce legal ambiguity and align high-risk clauses with clearer, balanced terms.",
    changes,
    model: llm.model,
  };
}
