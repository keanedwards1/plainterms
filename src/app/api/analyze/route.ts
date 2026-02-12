import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { z } from "zod";

const AnalyzeRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().nonnegative(),
});

const AnalyzeResponse = z.object({
  resultId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const payloadJson = await req.json();
    const payload = AnalyzeRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        { error: "Invalid analyze request payload.", details: payload.error.flatten() },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        {
          error: "Upstream /analyze failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = AnalyzeResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Upstream /analyze response violated contract.",
          details: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Analyze request failed: ${message}` }, { status: 502 });
  }
}
