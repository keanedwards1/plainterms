import { getLogContext } from "@/lib/observability";
import { ANALYSIS_MODE_OPTIONS, LLM_MODEL_OPTIONS } from "@/lib/analysisOptions";
import { ADDON_OPTIONS } from "@/lib/addonOptions";
import { REPORT_TIER_OPTIONS } from "@/lib/pricingOptions";
import { postJsonProxy } from "@/lib/postJsonProxy";
import { z } from "zod";

const UploadCheckoutRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().nonnegative(),
  precheckToken: z.string().min(1),
  analysisMode: z.enum(ANALYSIS_MODE_OPTIONS).optional(),
  llmModel: z.enum(LLM_MODEL_OPTIONS).optional(),
  reportTier: z.enum(REPORT_TIER_OPTIONS).optional(),
  selectedAddons: z.array(z.enum(ADDON_OPTIONS)).optional(),
});

const PreviewCheckoutRequest = z.object({
  previewResultId: z.string().min(1),
  previewAccessKey: z.string().min(1),
  reportTier: z.enum(REPORT_TIER_OPTIONS).optional(),
});

const CheckoutRequest = z.union([PreviewCheckoutRequest, UploadCheckoutRequest]);

const CheckoutResponse = z.object({
  checkoutSessionId: z.string().min(1),
  checkoutUrl: z.string().url(),
});

export async function POST(req: Request) {
  const ctx = getLogContext(req, "/api/checkout");

  const response = await postJsonProxy({
    req,
    upstreamPath: "/checkout",
    requestSchema: CheckoutRequest,
    responseSchema: CheckoutResponse,
    invalidPayloadError: "Invalid checkout request payload.",
    upstreamError: "Upstream /checkout failed.",
    contractError: "Upstream /checkout response violated contract.",
    requestFailedError: "Checkout request failed.",
    logConfig: {
      ctx,
      upstreamStage: "upstream_checkout",
    },
  });

  return response;
}
