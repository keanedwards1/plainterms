import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { extractDocumentTextFromUpload } from "./lib/extractDocumentText.mjs";
import {
  getUploadMaxBytes,
  validateObjectKey,
  validateUploadMeta,
} from "./lib/uploadPolicy.mjs";
import {
  createPrecheckToken,
  getPrecheckTokenTtlSec,
} from "./lib/precheckToken.mjs";

const s3 = new S3Client({});

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST,OPTIONS",
  };
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { ...corsHeaders(), "content-type": "application/json" },
    body: JSON.stringify(bodyObj),
  };
}

function getPrecheckMinWords() {
  const raw = Number(process.env.PRECHECK_MIN_WORDS ?? "5");
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.floor(raw);
}

function countWords(text) {
  if (typeof text !== "string" || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeHeadContentType(value) {
  if (typeof value !== "string") return "";
  return value.split(";")[0].trim().toLowerCase();
}

function mapHeadError(err) {
  const code = err?.name || err?.Code || err?.code;
  if (code === "NotFound" || code === "NoSuchKey") {
    return { statusCode: 404, message: "Uploaded file not found." };
  }
  return { statusCode: 502, message: "Failed to read uploaded file metadata." };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    return json(500, { error: "Upload bucket not configured" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const objectKeyCheck = validateObjectKey(payload.objectKey);
  if (!objectKeyCheck.ok) {
    return json(400, { error: objectKeyCheck.error });
  }

  const metaCheck = validateUploadMeta({
    filename: payload.filename,
    contentType: payload.contentType,
    size: payload.size,
    requireSize: true,
  });
  if (!metaCheck.ok) {
    const status = metaCheck.errorCode === "file_too_large" ? 413 : 400;
    return json(status, { error: metaCheck.error });
  }

  let head;
  try {
    head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKeyCheck.objectKey,
      })
    );
  } catch (err) {
    const mapped = mapHeadError(err);
    return json(mapped.statusCode, { error: mapped.message });
  }

  const headSize = Number(head?.ContentLength ?? 0);
  const uploadMaxBytes = getUploadMaxBytes();
  if (!Number.isFinite(headSize) || headSize <= 0) {
    return json(422, { error: "Uploaded file is empty or unreadable." });
  }
  if (headSize > uploadMaxBytes) {
    return json(413, {
      error: `File exceeds maximum allowed size (${uploadMaxBytes} bytes).`,
    });
  }

  if (headSize !== metaCheck.size) {
    return json(409, {
      error: "Uploaded file metadata mismatch. Please upload again.",
    });
  }

  const contentTypeCheck = validateUploadMeta({
    filename: metaCheck.filename,
    contentType:
      normalizeHeadContentType(head?.ContentType) || metaCheck.contentType,
    size: headSize,
    requireSize: true,
  });
  if (!contentTypeCheck.ok) {
    return json(400, { error: contentTypeCheck.error });
  }

  const extraction = await extractDocumentTextFromUpload({
    bucket,
    objectKey: objectKeyCheck.objectKey,
    filename: metaCheck.filename,
    contentType: contentTypeCheck.contentType,
  });
  const extractedWordCount = countWords(extraction.extractedText);
  const minWords = getPrecheckMinWords();

  if (extractedWordCount < minWords) {
    return json(422, {
      error:
        "We could not read enough text from this file. Please upload a text-based PDF or DOCX.",
      extraction: {
        detectedType: extraction.extraction.detectedType,
        wordCount: extractedWordCount,
        notes: extraction.extraction.notes,
      },
    });
  }

  const precheckToken = await createPrecheckToken({
    objectKey: objectKeyCheck.objectKey,
    filename: metaCheck.filename,
    contentType: contentTypeCheck.contentType,
    size: headSize,
  });

  return json(200, {
    precheckPassed: true,
    precheckToken,
    expiresInSec: getPrecheckTokenTtlSec(),
    extraction: {
      detectedType: extraction.extraction.detectedType,
      wordCount: extractedWordCount,
    },
    checks: {
      fileType: "passed",
      fileSize: "passed",
      textExtraction: "passed",
    },
  });
};
