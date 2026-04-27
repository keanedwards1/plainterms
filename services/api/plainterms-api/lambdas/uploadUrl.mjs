import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { detectSupportedUploadType, sanitizeFilename } from "./lib/uploadPolicy.mjs";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";

const s3 = new S3Client({});
const METHODS = "POST,OPTIONS";

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

  const filename = payload.filename;
  const contentType = payload.contentType;

  if (!filename || !contentType) {
    return jsonResponse(event, 400, { error: "filename and contentType required" }, METHODS);
  }

  const uploadType = detectSupportedUploadType({ filename, contentType });
  if (!uploadType.ok) {
    return jsonResponse(event, 400, { error: uploadType.error }, METHODS);
  }

  const safeName = sanitizeFilename(filename);
  const objectKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: uploadType.normalizedContentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return jsonResponse(event, 200, { uploadUrl, objectKey }, METHODS);
};
