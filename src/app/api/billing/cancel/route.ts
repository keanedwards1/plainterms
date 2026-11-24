import { getLogContext } from "@/lib/observability";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const CancelRequest = z.object({
  feedback: z
    .enum(["too_expensive", "unused", "missing_features", "low_quality", "switched_service", "too_complex", "customer_service", "other"])
    .optional(),
  comment: z.string().max(500).optional(),
});
const SubscriptionResponse = z.object({
  cancelAtPeriodEnd: z.boolean(),
  currentPeriodEnd: z.number().nullable(),
});

export async function POST(req: Request) {
  return postJsonProxy({
    req,
    upstreamPath: "/billing/cancel",
    requestSchema: CancelRequest,
    responseSchema: SubscriptionResponse,
    invalidPayloadError: "Invalid cancellation request.",
    upstreamError: "Your subscription couldn't be cancelled. Please try again.",
    contractError: "Your subscription couldn't be cancelled. Please try again.",
    requestFailedError: "Your subscription couldn't be cancelled. Please try again.",
    auth: "required",
    passThroughCodes: ["no_subscription", "cancel_failed"],
    logConfig: { ctx: getLogContext(req, "/api/billing/cancel"), upstreamStage: "upstream_billing" },
  });
}
