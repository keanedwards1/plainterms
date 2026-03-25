import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { getLogContext, logApiError } from "@/lib/observability";
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

  try {
    const payloadJson = await req.json();
    const payload = VerifyRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        {
          error: "Invalid checkout verify payload.",
          details: payload.error.flatten(),
          requestId: ctx.requestId,
        },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}/checkout/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      await logApiError({
        ...ctx,
        stage: "upstream_checkout_verify",
        status: upstream.status,
        upstreamStatus: upstream.status,
        message: detail || upstream.statusText || "Upstream /checkout/verify failed.",
      });
      return Response.json(
        {
          error: "Upstream /checkout/verify failed.",
          upstreamStatus: upstream.status,
          requestId: ctx.requestId,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = VerifyResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      await logApiError({
        ...ctx,
        stage: "contract_validation",
        status: 502,
        message: "Upstream /checkout/verify response violated contract.",
      });
      return Response.json(
        {
          error: "Upstream /checkout/verify response violated contract.",
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
      { error: "Checkout verify request failed.", requestId: ctx.requestId },
      { status: 502 }
    );
  }
}
