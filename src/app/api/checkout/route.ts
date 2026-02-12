import { getApiBaseUrl } from "@/lib/apiBaseUrl";
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
  try {
    const payloadJson = await req.json();
    const payload = CheckoutRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        { error: "Invalid checkout request payload.", details: payload.error.flatten() },
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
      return Response.json(
        {
          error: "Upstream /checkout failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = CheckoutResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Upstream /checkout response violated contract.",
          details: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Checkout request failed: ${message}` }, { status: 502 });
  }
}
