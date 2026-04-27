import { getLogContext } from "@/lib/observability";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const VerifyRequest = z.object({
  sessionId: z.string().min(1),
});

const VerifyResponse = z.object({
  resultId: z.string().min(1),
  accessKey: z.string().min(1),
  reused: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = getLogContext(req, "/api/checkout/verify");

  const response = await postJsonProxy({
    req,
    upstreamPath: "/checkout/verify",
    requestSchema: VerifyRequest,
    responseSchema: VerifyResponse,
    invalidPayloadError: "Invalid checkout verify payload.",
    upstreamError: "Upstream /checkout/verify failed.",
    contractError: "Upstream /checkout/verify response violated contract.",
    requestFailedError: "Checkout verify request failed.",
    logConfig: {
      ctx,
      upstreamStage: "upstream_checkout_verify",
    },
  });

  return response;
}
