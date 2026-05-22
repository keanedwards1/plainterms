import { getLlmConfigWithOverrides } from "./llmConfig.mjs";

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

function cleanLine(value, max = 240) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanParagraph(value, max = 2200) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

function buildPrompt({ tier, report }) {
  const redFlags = Array.isArray(report?.red_flags) ? report.red_flags : [];
  const questions = Array.isArray(report?.questions_to_ask) ? report.questions_to_ask : [];
  const bullets = {
    high: Array.isArray(report?.negotiation_bullets?.high) ? report.negotiation_bullets.high : [],
    medium: Array.isArray(report?.negotiation_bullets?.medium) ? report.negotiation_bullets.medium : [],
    low: Array.isArray(report?.negotiation_bullets?.low) ? report.negotiation_bullets.low : [],
  };

  const context = {
    tier,
    recommendation: {
      label: cleanLine(report?.recommendation?.label, 80),
      reason: cleanLine(report?.recommendation?.reason, 320),
    },
    risk: {
      score: typeof report?.risk?.score === "number" ? report.risk.score : null,
      label: cleanLine(report?.risk?.label, 20),
    },
    red_flags: redFlags.slice(0, 6).map((flag) => ({
      severity: cleanLine(flag?.severity, 20),
      title: cleanLine(flag?.title, 140),
      note: cleanLine(flag?.plain_note, 260),
    })),
    questions_to_ask: questions.slice(0, 4).map((q) => cleanLine(q, 220)),
    negotiation_bullets: {
      high: bullets.high.slice(0, 4).map((item) => cleanLine(item, 220)),
      medium: bullets.medium.slice(0, 4).map((item) => cleanLine(item, 220)),
    },
  };

  return `
You draft professional negotiation emails about contract updates.
Return ONLY valid JSON in this exact shape:
{
  "subject": "string",
  "body": "string"
}

Rules:
- Keep tone professional, calm, and collaborative.
- Be specific and actionable.
- Do not include legal advice disclaimers.
- Write in natural email prose with short paragraphs.
- Avoid rigid section headers (for example "Key updates requested" or "Questions to confirm").
- You may use at most 2 bullet points if it improves readability; otherwise keep it plain paragraphs.
- Do not use markdown or code blocks.
- Body must include:
  1) greeting line to "[Name]"
  2) concise statement requesting revisions before signing
  3) top requested updates grounded in the provided risk context
  4) clear next step asking for revised draft
  5) closing with "[Your Name]"
- Keep total body length under 1800 characters.

Context:
${JSON.stringify(context)}
`.trim();
}

function formatDraft(subject, body) {
  const cleanSubject = cleanLine(subject, 180);
  const cleanBody = cleanParagraph(body, 2200);
  if (!cleanSubject || !cleanBody) return "";

  const prefixedSubject = cleanSubject.toLowerCase().startsWith("subject:")
    ? cleanSubject
    : `Subject: ${cleanSubject}`;

  return `${prefixedSubject}\n\n${cleanBody}`.trim();
}

export async function generateNegotiationEmailDraftWithLlm({ report, tier, analysisSelection }) {
  const llm = await getLlmConfigWithOverrides({
    analysisMode: "llm",
    llmModel: analysisSelection?.llmModel ?? null,
  });

  if (!llm.apiKey) {
    return { ok: false, reason: "llm_api_key_missing" };
  }

  const prompt = buildPrompt({ tier, report });
  const res = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write concise, business-appropriate negotiation emails. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Negotiation email LLM request failed (${res.status}): ${detail || res.statusText}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const parsed = findJsonObject(typeof content === "string" ? content : "");
  if (!parsed) {
    return { ok: false, reason: "invalid_json_content" };
  }

  const draft = formatDraft(parsed.subject, parsed.body);
  if (!draft || draft.length < 80) {
    return { ok: false, reason: "draft_too_short_or_empty" };
  }

  return {
    ok: true,
    draft,
    model: llm.model,
  };
}
