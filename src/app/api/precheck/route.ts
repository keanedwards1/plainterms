import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const PrecheckRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

const PrecheckResponse = z.object({
  precheckPassed: z.boolean(),
  precheckToken: z.string().min(1),
  expiresInSec: z.number().int().positive().optional(),
  checks: z
    .object({
      fileType: z.enum(["passed", "failed", "not_run"]).optional(),
      fileSize: z.enum(["passed", "failed", "not_run"]).optional(),
      malwareScan: z.enum(["passed", "failed", "not_run"]).optional(),
      textExtractionPrecheck: z.enum(["passed", "failed", "not_run"]).optional(),
    })
    .optional(),
  extraction: z
    .object({
      detectedType: z.string().min(1),
      wordCount: z.number().int().nonnegative(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const upstreamResponse = await postJsonProxy({
    req,
    upstreamPath: "/precheck",
    requestSchema: PrecheckRequest,
    responseSchema: PrecheckResponse,
    invalidPayloadError: "Invalid precheck payload.",
    upstreamError: "Upstream /precheck failed.",
    contractError: "Upstream /precheck response violated contract.",
    requestFailedError: "Precheck request failed.",
  });

  if (!upstreamResponse.ok) {
    return upstreamResponse;
  }

  const parsed = (await upstreamResponse.json()) as z.infer<typeof PrecheckResponse>;

  if (!parsed.precheckPassed) {
    return Response.json({ error: "Precheck did not pass." }, { status: 409 });
  }

  return Response.json(parsed);
}
