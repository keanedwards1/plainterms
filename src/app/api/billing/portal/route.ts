import { getLogContext } from "@/lib/observability";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const BillingRequest = z.object({ returnPath: z.string().max(300).optional() });
const BillingResponse = z.object({ portalUrl: z.string().url() });

export async function POST(req: Request) {
  return postJsonProxy({
    req,
    upstreamPath: "/billing/portal",
    requestSchema: BillingRequest,
    responseSchema: BillingResponse,
    invalidPayloadError: "Invalid billing request.",
    upstreamError: "Billing couldn't be opened. Please try again.",
    contractError: "Billing couldn't be opened. Please try again.",
    requestFailedError: "Billing couldn't be opened. Please try again.",
    auth: "required",
    passThroughCodes: ["already_pro", "no_billing_account", "checkout_failed", "portal_failed"],
    logConfig: { ctx: getLogContext(req, "/api/billing/portal"), upstreamStage: "upstream_billing" },
  });
}
