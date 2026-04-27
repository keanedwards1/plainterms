import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { generateRevisedDocumentWithLlm } from "./lib/generateRevisedDocument.mjs";

const db = new DynamoDBClient({});

function parseJsonField(item, key) {
  const raw = item?.[key]?.S;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function withRevision(uiResult, revision) {
  return {
    ...uiResult,
    document: {
      ...(uiResult?.document ?? {}),
      revision,
    },
  };
}

function nowIso() {
  return new Date().toISOString();
}

async function saveUiResult(resultId, uiResult) {
  await db.send(
    new UpdateItemCommand({
      TableName: process.env.RESULTS_TABLE,
      Key: {
        result_id: { S: resultId },
      },
      UpdateExpression: "SET ui_result = :ui",
      ExpressionAttributeValues: {
        ":ui": { S: JSON.stringify(uiResult) },
      },
    })
  );
}

export const handler = async (event) => {
  const resultId = typeof event?.resultId === "string" ? event.resultId.trim() : "";
  if (!resultId) {
    return { ok: false, reason: "missing_result_id" };
  }

  const record = await db.send(
    new GetItemCommand({
      TableName: process.env.RESULTS_TABLE,
      Key: {
        result_id: { S: resultId },
      },
    })
  );

  if (!record?.Item) return { ok: false, reason: "not_found" };

  const uiResult = parseJsonField(record.Item, "ui_result");
  if (!uiResult || typeof uiResult !== "object") {
    return { ok: false, reason: "invalid_ui_result" };
  }

  const currentRevisionStatus = uiResult?.document?.revision?.status;
  if (currentRevisionStatus === "ready") {
    return { ok: true, reason: "already_ready" };
  }

  const extractedText = typeof uiResult?.document?.extracted_text === "string"
    ? uiResult.document.extracted_text
    : "";
  if (!extractedText.trim()) {
    const unavailable = withRevision(uiResult, {
      status: "not_available",
      message: "Document text was not available for revision generation.",
    });
    await saveUiResult(resultId, unavailable);
    return { ok: true, reason: "no_document_text" };
  }

  try {
    const revised = await generateRevisedDocumentWithLlm({
      filename: uiResult?.document?.file_name,
      extractedText,
      redFlags: uiResult?.report?.red_flags ?? [],
      clauseBreakdown: uiResult?.report?.clause_breakdown ?? [],
      creatorContract: uiResult?.report?.creator_contract === true,
    });

    const readyResult = withRevision(uiResult, {
      status: "ready",
      revised_text: revised.revised_text,
      summary: revised.summary,
      changes: revised.changes,
      generated_at: nowIso(),
      model: revised.model,
    });
    await saveUiResult(resultId, readyResult);
    return { ok: true, reason: "ready" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failed = withRevision(uiResult, {
      status: "failed",
      message: `Revision generation failed: ${message.slice(0, 280)}`,
      generated_at: nowIso(),
    });
    await saveUiResult(resultId, failed);
    return { ok: false, reason: "generation_failed", message };
  }
};
