import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { getLogContext, logApiError } from "@/lib/observability";
import { z } from "zod";

const CheckoutRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().nonnegative(),
});

const CheckoutResponse = z.object({
  checkoutSessionId: z.string().min(1),
  checkoutUrl: z.string().url(),
});

export async function POST(req: Request) {
  const ctx = getLogContext(req, "/api/checkout");

  try {
    const payloadJson = await req.json();
    const payload = CheckoutRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        {
          error: "Invalid checkout request payload.",
          details: payload.error.flatten(),
          requestId: ctx.requestId,
        },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      await logApiError({
        ...ctx,
        stage: "upstream_checkout",
        status: upstream.status,
        upstreamStatus: upstream.status,
        message: detail || upstream.statusText || "Upstream /checkout failed.",
      });
      return Response.json(
        {
          error: "Upstream /checkout failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
          requestId: ctx.requestId,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = CheckoutResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      await logApiError({
        ...ctx,
        stage: "contract_validation",
        status: 502,
        message: "Upstream /checkout response violated contract.",
      });
      return Response.json(
        {
          error: "Upstream /checkout response violated contract.",
          details: parsed.error.flatten(),
          requestId: ctx.requestId,
        },
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logApiError({
      ...ctx,
      stage: "unhandled_exception",
      status: 502,
      message,
    });
    return Response.json(
      { error: `Checkout request failed: ${message}`, requestId: ctx.requestId },
      { status: 502 }
    );
  }
}
