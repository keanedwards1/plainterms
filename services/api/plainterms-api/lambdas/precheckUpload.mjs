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
import { scanBufferForMalwareSignals } from "./lib/malwareScan.mjs";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";

const s3 = new S3Client({});
const METHODS = "POST,OPTIONS";

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
  const methodResponse = methodGuard(event, "POST", METHODS);
  if (methodResponse) return methodResponse;

  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    return jsonResponse(event, 500, { error: "Upload bucket not configured" }, METHODS);
  }

  const parsedPayload = parseJsonBody(event, METHODS);
  if (!parsedPayload.ok) return parsedPayload.response;
  const payload = parsedPayload.payload;

  const objectKeyCheck = validateObjectKey(payload.objectKey);
  if (!objectKeyCheck.ok) {
    return jsonResponse(event, 400, { error: objectKeyCheck.error }, METHODS);
  }

  const metaCheck = validateUploadMeta({
    filename: payload.filename,
    contentType: payload.contentType,
    size: payload.size,
    requireSize: true,
  });
  if (!metaCheck.ok) {
    const status = metaCheck.errorCode === "file_too_large" ? 413 : 400;
    return jsonResponse(event, status, { error: metaCheck.error }, METHODS);
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
    return jsonResponse(event, mapped.statusCode, { error: mapped.message }, METHODS);
  }

  const headSize = Number(head?.ContentLength ?? 0);
  const uploadMaxBytes = getUploadMaxBytes();
  if (!Number.isFinite(headSize) || headSize <= 0) {
    return jsonResponse(event, 422, { error: "Uploaded file is empty or unreadable." }, METHODS);
  }
  if (headSize > uploadMaxBytes) {
    return jsonResponse(event, 413, {
      error: `File exceeds maximum allowed size (${uploadMaxBytes} bytes).`,
    }, METHODS);
  }

  if (headSize !== metaCheck.size) {
    return jsonResponse(event, 409, {
      error: "Uploaded file metadata mismatch. Please upload again.",
    }, METHODS);
  }

  const contentTypeCheck = validateUploadMeta({
    filename: metaCheck.filename,
    contentType:
      normalizeHeadContentType(head?.ContentType) || metaCheck.contentType,
    size: headSize,
    requireSize: true,
  });
  if (!contentTypeCheck.ok) {
    return jsonResponse(event, 400, { error: contentTypeCheck.error }, METHODS);
  }

  const extraction = await extractDocumentTextFromUpload({
    bucket,
    objectKey: objectKeyCheck.objectKey,
    filename: metaCheck.filename,
    contentType: contentTypeCheck.contentType,
  }, { includeRawBuffer: true });
  const malwareScan = scanBufferForMalwareSignals({
    buffer: extraction.rawBuffer,
    expectedType: contentTypeCheck.type,
  });

  if (malwareScan.status !== "passed") {
    return jsonResponse(event, 422, {
      error:
        "Potentially unsafe file content detected. Please remove active content/macros and upload again.",
      malwareScan,
      extraction: {
        detectedType: extraction.extraction.detectedType,
        notes: extraction.extraction.notes,
      },
      checks: {
        fileType: "passed",
        fileSize: "passed",
        malwareScan: "failed",
        textExtractionPrecheck: "not_run",
      },
    }, METHODS);
  }

  const extractedWordCount = countWords(extraction.extractedText);
  const minWords = getPrecheckMinWords();

  if (extractedWordCount < minWords) {
    return jsonResponse(event, 422, {
      error:
        "We could not read enough text from this file. Please upload a text-based PDF or DOCX.",
      extraction: {
        detectedType: extraction.extraction.detectedType,
        wordCount: extractedWordCount,
        notes: extraction.extraction.notes,
      },
      checks: {
        fileType: "passed",
        fileSize: "passed",
        malwareScan: "passed",
        textExtractionPrecheck: "failed",
      },
    }, METHODS);
  }

  const precheckToken = await createPrecheckToken({
    objectKey: objectKeyCheck.objectKey,
    filename: metaCheck.filename,
    contentType: contentTypeCheck.contentType,
    size: headSize,
    scanPassed: true,
    textExtractionPrecheckPassed: true,
  });

  return jsonResponse(event, 200, {
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
      malwareScan: "passed",
      textExtractionPrecheck: "passed",
    },
  }, METHODS);
};
