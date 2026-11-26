import { getLogContext } from "@/lib/observability";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const AnalyzeRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  precheckToken: z.string().min(1),
  // The side the user said they're on; must be one of the parties found at precheck.
  party: z.string().max(160).optional(),
});

const AnalyzeResponse = z.object({
  resultId: z.string().min(1),
  accessKey: z.string().min(1),
  status: z.enum(["refining", "complete"]),
  plan: z.enum(["free", "pro"]),
});

export async function POST(req: Request) {
  return postJsonProxy({
    req,
    upstreamPath: "/analyze",
    requestSchema: AnalyzeRequest,
    responseSchema: AnalyzeResponse,
    invalidPayloadError: "Invalid analyze request payload.",
    upstreamError: "We couldn't analyze this document. Please try again.",
    contractError: "We couldn't analyze this document. Please try again.",
    requestFailedError: "We couldn't analyze this document. Please try again.",
    auth: "required",
    passThroughCodes: [
      "monthly_limit_reached",
      "precheck_token_used",
      "precheck_payload_mismatch",
      "precheck_required_checks_not_passed",
      "invalid_token",
      "expired_token",
    ],
    logConfig: { ctx: getLogContext(req, "/api/analyze"), upstreamStage: "upstream_analyze" },
  });
}
