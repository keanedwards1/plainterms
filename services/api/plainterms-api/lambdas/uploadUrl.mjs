import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { detectSupportedUploadType, sanitizeFilename } from "./lib/uploadPolicy.mjs";

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

  const filename = payload.filename;
  const contentType = payload.contentType;

  if (!filename || !contentType) {
    return json(400, { error: "filename and contentType required" });
  }

  const uploadType = detectSupportedUploadType({ filename, contentType });
  if (!uploadType.ok) {
    return json(400, { error: uploadType.error });
  }

  const safeName = sanitizeFilename(filename);
  const objectKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: uploadType.normalizedContentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return json(200, { uploadUrl, objectKey });
};
