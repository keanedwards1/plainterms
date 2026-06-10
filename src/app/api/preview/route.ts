import { getLogContext } from "@/lib/observability";
import { ANALYSIS_MODE_OPTIONS, LLM_MODEL_OPTIONS } from "@/lib/analysisOptions";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const PreviewRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  precheckToken: z.string().min(1),
  analysisMode: z.enum(ANALYSIS_MODE_OPTIONS).optional(),
  llmModel: z.enum(LLM_MODEL_OPTIONS).optional(),
});

const PreviewResponse = z.object({
  resultId: z.string().min(1),
  previewAccessKey: z.string().min(1),
});

export async function POST(req: Request) {
  const ctx = getLogContext(req, "/api/preview");

  return postJsonProxy({
    req,
    upstreamPath: "/preview",
    requestSchema: PreviewRequest,
    responseSchema: PreviewResponse,
    invalidPayloadError: "Invalid preview request payload.",
    upstreamError: "Upstream /preview failed.",
    contractError: "Upstream /preview response violated contract.",
    requestFailedError: "Preview request failed.",
    logConfig: {
      ctx,
      upstreamStage: "upstream_preview",
    },
  });
}
