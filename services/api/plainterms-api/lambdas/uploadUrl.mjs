import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { detectSupportedUploadType, sanitizeFilename } from "./lib/uploadPolicy.mjs";
import { corsHeaders } from "./lib/cors.mjs";

const s3 = new S3Client({});

function json(event, statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event, "POST,OPTIONS"),
      "content-type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(event, "POST,OPTIONS"), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(event, 405, { error: "Method not allowed" });
  }

  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    return json(event, 500, { error: "Upload bucket not configured" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(event, 400, { error: "Invalid JSON body" });
  }

  const filename = payload.filename;
  const contentType = payload.contentType;

  if (!filename || !contentType) {
    return json(event, 400, { error: "filename and contentType required" });
  }

  const uploadType = detectSupportedUploadType({ filename, contentType });
  if (!uploadType.ok) {
    return json(event, 400, { error: uploadType.error });
  }

  const safeName = sanitizeFilename(filename);
  const objectKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: uploadType.normalizedContentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return json(event, 200, { uploadUrl, objectKey });
};
