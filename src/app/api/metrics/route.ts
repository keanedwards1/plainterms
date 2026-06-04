import { getLogContext } from "@/lib/observability";
import { z } from "zod";

const FunnelMetricPayload = z.object({
  event: z.enum(["upload_start", "checkout_start", "checkout_success", "result_viewed", "survey_rating"]),
  funnelId: z.string().min(8).max(128),
  pathname: z.string().min(1).max(300).optional(),
  resultId: z.string().min(1).max(200).optional(),
  sessionId: z.string().min(1).max(200).optional(),
  fileSizeBytes: z.number().int().nonnegative().max(100_000_000).optional(),
  fileType: z.string().min(1).max(120).optional(),
  clientTs: z.string().datetime().optional(),
  rating: z.enum(["positive", "negative"]).optional(),
  abVariant: z.string().max(64).optional(),
});

function clientIp(req: Request): string | undefined {
  const raw = req.headers.get("x-forwarded-for");
  if (!raw) return undefined;
  return raw.split(",")[0]?.trim() || undefined;
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstForwardedHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function addNormalizedOrigin(allowed: Set<string>, candidate: string | null | undefined) {
  if (!candidate) return;
  const normalized = normalizeOrigin(candidate.trim());
  if (normalized) {
    allowed.add(normalized);
  }
}

function candidateTrustedOrigins(req: Request): string[] {
  const allowed = new Set<string>();

  const configuredOrigins = process.env.METRICS_ALLOWED_ORIGINS;
  if (configuredOrigins) {
    for (const candidate of configuredOrigins.split(",")) {
      addNormalizedOrigin(allowed, candidate);
    }
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  addNormalizedOrigin(allowed, configuredSiteUrl);

  // Runtime-derived self origins prevent false 403s when env vars are absent or stale.
  addNormalizedOrigin(allowed, req.url);

  const forwardedHost = firstForwardedHeaderValue(req.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedHeaderValue(req.headers.get("x-forwarded-proto")) ?? "https";
  if (forwardedHost) {
    addNormalizedOrigin(allowed, `${forwardedProto}://${forwardedHost}`);
  }

  const host = firstForwardedHeaderValue(req.headers.get("host"));
  if (host) {
    addNormalizedOrigin(allowed, `${process.env.NODE_ENV === "production" ? "https" : "http"}://${host}`);
  }

  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  return [...allowed];
}

function hasTrustedRequestOrigin(req: Request): boolean {
  const trustedOrigins = candidateTrustedOrigins(req);
  if (trustedOrigins.length === 0) return false;

  const origin = normalizeOrigin(req.headers.get("origin") ?? "");
  if (origin && trustedOrigins.includes(origin)) {
    return true;
  }

  const referer = req.headers.get("referer");
  if (!referer) return false;

  try {
    const refererOrigin = new URL(referer).origin;
    return trustedOrigins.includes(refererOrigin);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ctx = getLogContext(req, "/api/metrics");

  try {
    if (!hasTrustedRequestOrigin(req)) {
      return Response.json(
        {
          error: "Forbidden origin.",
          requestId: ctx.requestId,
        },
        { status: 403 }
      );
    }

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
        metricEvent: payload.data.event,
        funnelId: payload.data.funnelId,
        pathname: payload.data.pathname,
        resultId: payload.data.resultId,
        sessionId: payload.data.sessionId,
        fileSizeBytes: payload.data.fileSizeBytes,
        fileType: payload.data.fileType,
        clientTs: payload.data.clientTs,
        rating: payload.data.rating,
        abVariant: payload.data.abVariant,
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
