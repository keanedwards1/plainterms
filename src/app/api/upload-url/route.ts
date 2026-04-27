import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const UploadUrlRequest = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const UploadUrlResponse = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string().min(1),
});

export async function POST(req: Request) {
  return postJsonProxy({
    req,
    upstreamPath: "/upload-url",
    requestSchema: UploadUrlRequest,
    responseSchema: UploadUrlResponse,
    invalidPayloadError: "Invalid upload-url request payload.",
    upstreamError: "Upstream /upload-url failed.",
    contractError: "Upstream /upload-url response violated contract.",
    requestFailedError: "Upload URL request failed.",
  });
}
