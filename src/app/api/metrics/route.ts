import { getLogContext } from "@/lib/observability";
import { z } from "zod";

const FunnelMetricPayload = z.object({
  event: z.enum(["upload_start", "checkout_start", "checkout_success", "result_viewed"]),
  funnelId: z.string().min(8).max(128),
  pathname: z.string().min(1).max(300).optional(),
  resultId: z.string().min(1).max(200).optional(),
  sessionId: z.string().min(1).max(200).optional(),
  fileSizeBytes: z.number().int().nonnegative().max(100_000_000).optional(),
  fileType: z.string().min(1).max(120).optional(),
  clientTs: z.string().datetime().optional(),
});

function clientIp(req: Request): string | undefined {
  const raw = req.headers.get("x-forwarded-for");
  if (!raw) return undefined;
  return raw.split(",")[0]?.trim() || undefined;
}

export async function POST(req: Request) {
  const ctx = getLogContext(req, "/api/metrics");

  try {
    const payloadJson = await req.json();
    const payload = FunnelMetricPayload.safeParse(payloadJson);

    if (!payload.success) {
      return Response.json(
        {
          error: "Invalid metrics payload.",
          details: payload.error.flatten(),
          requestId: ctx.requestId,
        },
        { status: 400 }
      );
    }

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        event: "funnel.metric",
        ...ctx,
        ...payload.data,
        ip: clientIp(req),
      })
    );

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "funnel.metric_error",
        ...ctx,
        message,
      })
    );
    return Response.json({ error: "Metrics ingestion failed.", requestId: ctx.requestId }, { status: 500 });
  }
}

