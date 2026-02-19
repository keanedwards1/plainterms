import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  assertPtUiV1Contract,
  assertPtV1Contract,
  transformPtV1ToUiV1,
} from "./ptTransform.mjs";
import { extractDocumentTextFromUpload } from "./extractDocumentText.mjs";
import { analyzeExtractedTextWithLlm } from "./llmAnalyze.mjs";
import { validateObjectKey, validateUploadMeta } from "./uploadPolicy.mjs";

const db = new DynamoDBClient({});

function makeResultId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `demo_${Date.now()}_${rand}`;
}

function getRetentionDays() {
  const raw = Number(process.env.RESULT_TTL_DAYS ?? "7");
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return Math.floor(raw);
}

function pickSummaryText(text) {
  if (!text) {
    return "We could not extract readable text from this document yet, so this result is limited. Try a text-based PDF or DOCX export.";
  }
  return text.slice(0, 420);
}

function makePtV1({ resultId, createdAt, payload, extraction, analysis }) {
  const filename = typeof payload.filename === "string" ? payload.filename : "Contract document";
  const textSnippet = pickSummaryText(extraction.extractedText);
  const llmFields = analysis?.fields;
  const notes = [...extraction.extraction.notes];
  if (analysis?.usedLlm) {
    notes.push("analysis_mode:llm");
  } else {
    notes.push(`analysis_mode:rules (${analysis?.reason || "unknown"})`);
  }

  const overviewField =
    llmFields?.overview ??
    {
      status: "found",
      summary: textSnippet,
      quotes: [],
      sources: [],
    };
  const purposeField =
    llmFields?.contractPurpose ??
    {
      status: "found",
      summary: "The contract sets practical terms for services, payment, and responsibilities between the parties.",
      quotes: [],
      sources: [],
    };
  const clientField =
    llmFields?.partiesClient ??
    {
      status: "not_clearly_stated",
      summary: "Client identity may be present but is not clearly extracted yet.",
      quotes: [],
      sources: [],
    };
  const contractorField =
    llmFields?.partiesContractor ??
    {
      status: "not_clearly_stated",
      summary: "Contractor identity may be present but is not clearly extracted yet.",
      quotes: [],
      sources: [],
    };
  const scopeField =
    llmFields?.scopeServices ??
    {
      status: "not_clearly_stated",
      summary: "Service details may rely on attachments or sections that were not clearly extracted.",
      quotes: [],
      sources: [],
    };
  const termField =
    llmFields?.termTermination ??
    {
      status: "not_clearly_stated",
      summary: "Term and termination rights were not clearly extracted.",
      quotes: [],
      sources: [],
    };
  const paymentField =
    llmFields?.payment ??
    {
      status: "not_clearly_stated",
      summary: "Payment structure may be present but was not fully extracted.",
      quotes: [],
      sources: [],
    };
  const confidentialityField =
    llmFields?.confidentiality ??
    {
      status: "not_clearly_stated",
      summary: "Confidentiality terms may be present but were not fully extracted.",
      quotes: [],
      sources: [],
    };

  return {
    schema_version: "pt.v1",
    result_id: resultId,
    created_at: createdAt,
    document: {
      title: filename,
      contract_type: "independent_contractor_services_agreement",
      jurisdiction_hint: "not_found",
      page_count: 0,
      word_count: extraction.extractedText ? extraction.extractedText.split(/\s+/).length : 0,
      confidence_notes: notes,
    },
    sections: {
      document_overview: {
        heading: "Document Overview",
        plain_summary: overviewField,
        contract_purpose: purposeField,
      },
      parties: {
        heading: "Parties",
        client: clientField,
        contractor: contractorField,
      },
      scope_of_services: {
        heading: "Scope of Services",
        services_description: scopeField,
      },
      term_and_termination: {
        heading: "Term & Termination",
        termination_for_convenience: termField,
      },
      payment: {
        heading: "Payment",
        fee_structure: paymentField,
      },
      confidentiality: {
        heading: "Confidentiality",
        confidentiality_info: confidentialityField,
      },
    },
    flags: [],
    notices: {
      not_legal_advice: "This summary is for informational purposes only and is not legal advice.",
      limits: [],
      tone_policy: [],
    },
    source_map: { items: [] },
  };
}

export async function runAnalysis(payload) {
  const objectKeyCheck = validateObjectKey(payload?.objectKey);
  if (!objectKeyCheck.ok) {
    throw new Error(objectKeyCheck.error);
  }

  const metaCheck = validateUploadMeta({
    filename: payload?.filename,
    contentType: payload?.contentType,
    size: payload?.size,
    requireSize: true,
  });
  if (!metaCheck.ok) {
    throw new Error(metaCheck.error);
  }

  const normalizedPayload = {
    objectKey: objectKeyCheck.objectKey,
    filename: metaCheck.filename,
    contentType: metaCheck.contentType,
    size: metaCheck.size,
  };

  const resultId = makeResultId();
  const createdAt = new Date().toISOString();
  const expiresAtEpoch = Math.floor(Date.now() / 1000) + getRetentionDays() * 24 * 60 * 60;

  const bucket = process.env.UPLOAD_BUCKET;
  const extraction = await extractDocumentTextFromUpload({
    bucket,
    objectKey: normalizedPayload.objectKey,
    filename: normalizedPayload.filename,
    contentType: normalizedPayload.contentType,
  });

  let llmAnalysis = { usedLlm: false, reason: "not_attempted", fields: null };
  try {
    llmAnalysis = await analyzeExtractedTextWithLlm({
      filename: normalizedPayload.filename,
      contentType: normalizedPayload.contentType,
      extractedText: extraction.extractedText,
    });
  } catch (err) {
    llmAnalysis = {
      usedLlm: false,
      reason: `llm_error:${err instanceof Error ? err.message : String(err)}`,
      fields: null,
    };
  }

  const ptV1 = makePtV1({
    resultId,
    createdAt,
    payload: normalizedPayload,
    extraction,
    analysis: llmAnalysis,
  });
  assertPtV1Contract(ptV1);
  const uiResult = transformPtV1ToUiV1(ptV1);
  assertPtUiV1Contract(uiResult);

  const cmd = new PutItemCommand({
    TableName: process.env.RESULTS_TABLE,
    Item: {
      result_id: { S: resultId },
      created_at: { S: createdAt },
      expires_at: { N: String(expiresAtEpoch) },
      object_key: { S: normalizedPayload.objectKey },
      status: { S: "complete" },
      pt_v1_result: { S: JSON.stringify(ptV1) },
      ui_result: { S: JSON.stringify(uiResult) },
    },
  });

  await db.send(cmd);
  return { resultId };
}
