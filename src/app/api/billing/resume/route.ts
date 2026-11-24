import { getLogContext } from "@/lib/observability";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const ResumeRequest = z.object({});
const SubscriptionResponse = z.object({
  cancelAtPeriodEnd: z.boolean(),
  currentPeriodEnd: z.number().nullable(),
});

export async function POST(req: Request) {
  return postJsonProxy({
    req,
    upstreamPath: "/billing/resume",
    requestSchema: ResumeRequest,
    responseSchema: SubscriptionResponse,
    invalidPayloadError: "Invalid request.",
    upstreamError: "Your subscription couldn't be resumed. Please try again.",
    contractError: "Your subscription couldn't be resumed. Please try again.",
    requestFailedError: "Your subscription couldn't be resumed. Please try again.",
    auth: "required",
    passThroughCodes: ["no_subscription", "resume_failed"],
    logConfig: { ctx: getLogContext(req, "/api/billing/resume"), upstreamStage: "upstream_billing" },
  });
}
