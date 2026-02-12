import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { z } from "zod";

const VerifyRequest = z.object({
  sessionId: z.string().min(1),
});

const VerifyResponse = z.object({
  resultId: z.string().min(1),
  reused: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const payloadJson = await req.json();
    const payload = VerifyRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        { error: "Invalid checkout verify payload.", details: payload.error.flatten() },
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
      return Response.json(
        {
          error: "Upstream /checkout/verify failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = VerifyResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Upstream /checkout/verify response violated contract.",
          details: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Checkout verify request failed: ${message}` }, { status: 502 });
  }
}
