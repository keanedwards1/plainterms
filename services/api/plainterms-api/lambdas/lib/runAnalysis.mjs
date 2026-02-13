import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  assertPtUiV1Contract,
  assertPtV1Contract,
  transformPtV1ToUiV1,
} from "./ptTransform.mjs";
import { extractDocumentTextFromUpload } from "./extractDocumentText.mjs";

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

function makeStubPtV1({ resultId, createdAt, payload, extraction }) {
  const filename = typeof payload.filename === "string" ? payload.filename : "Contract document";
  const textSnippet = pickSummaryText(extraction.extractedText);

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
      confidence_notes: extraction.extraction.notes,
    },
    sections: {
      document_overview: {
        heading: "Document Overview",
        plain_summary: {
          status: "found",
          summary: textSnippet,
          quotes: [],
          sources: [],
        },
        contract_purpose: {
          status: "found",
          summary:
            "The contract sets practical terms for services, payment, and responsibilities between the parties.",
          quotes: [],
          sources: [],
        },
      },
      parties: {
        heading: "Parties",
        client: {
          status: "not_clearly_stated",
          summary: "Client identity may be present but is not clearly extracted in this stub result.",
          quotes: [],
          sources: [],
        },
      },
      scope_of_services: {
        heading: "Scope of Services",
        services_description: {
          status: "not_clearly_stated",
          summary:
            "Service details may rely on attachments or sections that were not fully parsed in this stub result.",
          quotes: [],
          sources: [],
        },
      },
      term_and_termination: {
        heading: "Term & Termination",
        termination_for_convenience: {
          status: "not_found",
          summary: "Termination rights were not clearly extracted in this stub result.",
          quotes: [],
          sources: [],
        },
      },
      payment: {
        heading: "Payment",
        fee_structure: {
          status: "not_clearly_stated",
          summary: "Payment structure may be present but was not fully extracted in this stub result.",
          quotes: [],
          sources: [],
        },
      },
      confidentiality: {
        heading: "Confidentiality",
        confidentiality_info: {
          status: "not_clearly_stated",
          summary: "Confidentiality terms may be present but are not fully extracted in this stub result.",
          quotes: [],
          sources: [],
        },
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
  const resultId = makeResultId();
  const createdAt = new Date().toISOString();
  const expiresAtEpoch = Math.floor(Date.now() / 1000) + getRetentionDays() * 24 * 60 * 60;

  const bucket = process.env.UPLOAD_BUCKET;
  const extraction = await extractDocumentTextFromUpload({
    bucket,
    objectKey: payload.objectKey,
    filename: payload.filename,
    contentType: payload.contentType,
  });

  const ptV1 = makeStubPtV1({ resultId, createdAt, payload, extraction });
  assertPtV1Contract(ptV1);
  const uiResult = transformPtV1ToUiV1(ptV1);
  assertPtUiV1Contract(uiResult);

  const cmd = new PutItemCommand({
    TableName: process.env.RESULTS_TABLE,
    Item: {
      result_id: { S: resultId },
      created_at: { S: createdAt },
      expires_at: { N: String(expiresAtEpoch) },
      object_key: { S: payload.objectKey ?? "" },
      status: { S: "complete" },
      pt_v1_result: { S: JSON.stringify(ptV1) },
      ui_result: { S: JSON.stringify(uiResult) },
    },
  });

  await db.send(cmd);
  return { resultId };
}
