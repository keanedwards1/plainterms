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
      // Keep the full excerpt: the UI matches `before` verbatim against the
      // document to render tracked changes, so truncating it (with an appended
      // ellipsis) makes longer clauses fail to match and silently drop. The UI
      // clamps these for display.
      const before = trim(item.before, 1400);
      const after = trim(item.after, 1400);
      const reason = trim(item.reason, 280);
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
    .slice(0, 20);
}

function buildPrompt({ filename, extractedText, flags, clauses, creatorContract, renovationContract }) {
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
You are a contracts attorney who reviews agreements on behalf of the person about to sign them — most often a homeowner reviewing a home renovation, remodeling, or construction contract, but also independent contractor and creator agreements. Protect the interests of the party you represent (for a renovation contract, that is the homeowner/property owner).
Your job is to fix clauses that are risky, vague, or missing — and leave everything else exactly as written.

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

MANDATORY WORK LIST (highest priority): At the bottom of this prompt you will find a list of detected risk flags and missing/unclear clauses. You MUST address every single item on that list in revised_text — do not skip any. Each item is a confirmed problem. If a general editing rule below does not apply to this document but an item on the work list requires it, the work list wins.

REWRITE — DO NOT DESCRIBE (critical): revised_text must contain the ACTUAL revised contract language, fully written out as it would appear in the signed agreement. You are drafting the contract, not giving the user instructions. NEVER write a meta-instruction that describes a change — for example, never output "[INSERT: change this clause to require...]", "Change this clause to...", "Add a clause that...", or any bracketed note that paraphrases the editing rules. Instead, write the finished clause itself. The same applies to the "after" field of each change: it must hold the real replacement clause text, not a description of it.
WRONG: "4. Change Orders\n[INSERT: Change this clause to require written, signed change orders before work begins.]"
RIGHT: "4. Change Orders\nNo change order is binding unless it is in writing and signed by the Owner before the extra work begins, specifying the added scope, the price, and any impact on the schedule. The Contractor may not perform or bill for additional work without the Owner's prior written approval."

MISSING USER-SPECIFIC FACTS ONLY: The single exception to the rule above is when fully writing a clause requires a fact only the user can supply and that is genuinely absent from the document — e.g. the governing state, a specific dollar figure, a party's address, or a calendar date. In that narrow case, still write the complete clause and place a short inline marker ONLY where the missing value goes, using this exact format:
[ACTION REQUIRED: what to fill in — e.g. "your governing state, such as California"]
For example: "This Agreement is governed by the laws of the State of [ACTION REQUIRED: your state, e.g. California]." Do NOT use this marker as a stand-in for a clause you are able to write yourself (change orders, warranties, lien waivers, indemnity, termination, permits, etc. — you know the correct language, so write it). Each ACTION REQUIRED marker must also appear as an entry in the "changes" array with severity "high".

PRESERVATION RULE: Do NOT rewrite, rephrase, or tighten language that is already clear and balanced. If a clause already says what it needs to say, copy it into revised_text unchanged. Only include an entry in "changes" when you made a substantive fix. Cosmetic rewrites (e.g. changing "will" to "shall", removing adjectives, condensing sentences) are forbidden unless the original is genuinely ambiguous or risky.

Editing rules — apply ONLY when the issue is actually present in the document, do not invent problems:

INDEMNIFICATION: One-sided indemnification must be made mutual. Both parties should indemnify each other for their own acts, omissions, and breaches. Never leave indemnification running in one direction only.

MORALITY / TERMINATION FOR CAUSE: "Sole discretion" termination clauses are always high-risk. Replace with: (a) a reasonable person standard, (b) written notice specifying the conduct, (c) a minimum 5-business-day cure period before termination is permitted.

UNILATERAL CHANGES: Any clause allowing one party to change requirements, specifications, or terms unilaterally must be replaced with mutual written consent.

PAYMENT TERMS: Net 60 or longer must be shortened to Net 30. If no payment due date exists, add Net 30 from invoice receipt. Add a late payment provision (interest at 1.5% per month or the maximum permitted by law) if absent. Do not change payment terms that are already Net 30 or shorter and already include a late payment provision.

SCOPE / SOW: If deliverables reference a future Schedule or SOW with no deadline, add a 30-day deadline for the other party to provide it and state that no additional work is owed until it is delivered.

CONFIDENTIALITY: If a confidentiality clause is present but vague (no definition of confidential information, no duration, no carve-outs), strengthen it to include: (a) a definition of "Confidential Information" covering non-public business information, (b) a duration equal to the contract term plus two years, (c) standard carve-outs for publicly known information, independently developed information, and disclosures required by law.

LIMITATION OF LIABILITY: If no limitation of liability clause exists, add a mutual cap limiting each party's liability to the total fees paid or payable in the three months preceding the claim, excluding liability for fraud or willful misconduct.

INCOMPLETE PLACEHOLDERS: Any unfilled placeholder such as [insert state], [insert jurisdiction], or [insert date] must be replaced inline in revised_text with an [ACTION REQUIRED: ...] instruction explaining exactly what the user needs to fill in. Include in "changes" as high severity. Do not invent values.

VAGUE RATES / PAYMENT AMOUNTS: If payment rates are described only as "to be agreed" or "to be determined" with no fallback mechanism, add language requiring the parties to agree on rates in writing within 30 days of the contract start date, with no services owed until rates are confirmed.

MISSING CLAUSES: If governing law, assignment restrictions, or dispute resolution are entirely absent, add balanced versions: neutral governing law with mutual consent to jurisdiction, no assignment without written consent from both parties, and good-faith negotiation followed by binding arbitration for dispute resolution.
${creatorContract ? `
CREATOR-SPECIFIC RULES (apply because this is a creator/influencer/talent agreement):

LICENSE SCOPE: Irrevocable, perpetual, worldwide licenses must be narrowed to: revocable, limited to the Agreement term, non-exclusive where possible. Remove or limit waivers of approval, attribution, and removal rights — the creator should retain meaningful approval rights over how their likeness and content are used.

EXCLUSIVITY: Exclusivity clauses must: define the competing category specifically, state the exact duration, and include either a minimum guaranteed payment or a creator right to terminate if no paid work is assigned within 30 days.

WARRANTY: In a creator services agreement, broad "as is" disclaimers that shift all quality risk to the creator are one-sided. Rewrite so the creator warrants professional-quality work meeting industry standards, and remove brand-favoring "as is" language that is not appropriate in this context.
` : renovationContract ? `
RENOVATION-SPECIFIC RULES (apply because this is a home renovation / construction / remodeling contract; protect the homeowner):

DEPOSIT & PAYMENT SCHEDULE: An upfront deposit larger than roughly one-third of the contract price is high-risk for the homeowner (many states cap it lower). Reduce an oversized deposit to a reasonable amount and tie all remaining payments to a draw schedule keyed to completed, inspected milestones — never to a calendar alone. A final retainage of around 10% should be withheld until punch-list completion.

MECHANICS LIENS: If the contractor uses any subcontractors or suppliers, require signed lien waivers (conditional on progress payments, unconditional on final payment) from the contractor and every subcontractor and supplier before each payment is released. If lien-waiver language is absent, add it.

CHANGE ORDERS: No change order may be binding unless it is in writing and signed by the homeowner, specifying the added scope, the price, and any schedule impact, BEFORE the extra work begins. Replace any clause that lets the contractor add cost without written homeowner approval.

COMPLETION & DELAY: Add a firm substantial-completion date if none exists. Add a reasonable remedy for unexcused delay (for example a modest per-day credit), while allowing fair extensions for weather, permitting, and homeowner-requested changes.

WORKMANSHIP WARRANTY: Ensure a written workmanship warranty of at least one year and a clear punch-list process at substantial completion. Remove broad "as is" disclaimers that shift all quality risk onto the homeowner.

PERMITS: The contractor (not the homeowner) should obtain required building permits and schedule inspections, unless the homeowner has knowingly chosen to act as their own general contractor.

ALLOWANCES: Any allowance (a budget placeholder for items like fixtures or flooring) must state a dollar amount and require the homeowner's written approval before any overage is charged. Add a cap or approval gate if missing.
` : `
GENERAL CONTRACT RULES (apply because this is neither a creator nor a renovation agreement):

LICENSE / IP OWNERSHIP: Work-for-hire and full IP assignment clauses are standard and should not be narrowed unless the scope is unreasonably broad beyond the stated project. Flag only if the assignment extends to pre-existing IP or work outside the contract scope.

WARRANTY: Industry-standard "as is" disclaimers in technology, SaaS, or professional services agreements are appropriate and should not be removed. Flag only if warranties are completely absent or create unreasonable obligations for one party.
`}
GENERAL: Keep parties, dates, amounts, and core business intent intact. Preserve document structure and numbering. Do not mention AI, models, or internal process. Keep revised_text professional and negotiation-ready.

FORMATTING (critical): The revised_text field must preserve all paragraph breaks and spacing from the original. Use a blank line (double newline) between each section and between paragraphs. Section headings should appear on their own line. Do not collapse multiple paragraphs into a single block of text. The output should read as a properly spaced, human-readable document — not a wall of text.

Document metadata:
- file_name: ${filename || "Contract document"}

MANDATORY WORK LIST — you must address every item below in revised_text:

Risk flags to fix:
${flagLines}

Missing or unclear clauses to fix:
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
  renovationContract = false,
  model = null,
}) {
  const sourceText = trim(extractedText, MAX_SOURCE_CHARS);
  if (!sourceText) {
    throw new Error("No extracted text is available for revision.");
  }

  const llm = await getLlmConfig();
  if (!llm?.apiKey) {
    throw new Error("LLM API key is not configured for revision generation.");
  }
  // Caller may pin a tier-appropriate model; otherwise use the deployed default.
  const revisionModel = typeof model === "string" && model.trim() ? model.trim() : llm.model;

  const flags = asArray(redFlags)
    .map((item) => ({
      title: trim(item?.title, 200),
      plain_note: trim(item?.plain_note, 260),
      severity: trim(item?.severity, 24).toLowerCase() || "medium",
    }))
    .filter((item) => item.title && item.plain_note)
    .slice(0, 15);

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
    renovationContract,
  });

  const response = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: revisionModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a contracts attorney who reviews agreements for the person about to sign them — most often a homeowner reviewing a renovation or construction contract. Your priority is to protect that person's interests while keeping the contract professionally fair. Apply every applicable editing rule. Return strict JSON only.",
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
    model: revisionModel,
  };
}
