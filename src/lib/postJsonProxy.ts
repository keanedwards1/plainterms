import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { logApiError } from "@/lib/observability";
import { z } from "zod";

type RouteLogContext = {
  route: string;
  requestId: string;
  method: string;
};

type ProxyLogConfig = {
  ctx?: RouteLogContext;
  upstreamStage?: string;
};

type PostJsonProxyArgs<TReq, TRes> = {
  req: Request;
  upstreamPath: string;
  requestSchema: z.ZodType<TReq>;
  responseSchema: z.ZodType<TRes>;
  invalidPayloadError: string;
  upstreamError: string;
  contractError: string;
  requestFailedError: string;
  logConfig?: ProxyLogConfig;
};

function withRequestId<T extends Record<string, unknown>>(
  body: T,
  ctx?: RouteLogContext
): T & { requestId?: string } {
  if (!ctx) return body;
  return { ...body, requestId: ctx.requestId };
}

async function maybeLogUpstreamError({
  ctx,
  stage,
  status,
  message,
}: {
  ctx?: RouteLogContext;
  stage: string;
  status: number;
  message: string;
}) {
  if (!ctx) return;
  await logApiError({
    ...ctx,
    stage,
    status,
    upstreamStatus: status,
    message,
  });
}

async function maybeLogInternalError({
  ctx,
  stage,
  status,
  message,
}: {
  ctx?: RouteLogContext;
  stage: string;
  status: number;
  message: string;
}) {
  if (!ctx) return;
  await logApiError({
    ...ctx,
    stage,
    status,
    message,
  });
}

export async function postJsonProxy<TReq, TRes>({
  req,
  upstreamPath,
  requestSchema,
  responseSchema,
  invalidPayloadError,
  upstreamError,
  contractError,
  requestFailedError,
  logConfig,
}: PostJsonProxyArgs<TReq, TRes>): Promise<Response> {
  const ctx = logConfig?.ctx;
  const upstreamStage = logConfig?.upstreamStage ?? "upstream_request";

  try {
    const payloadJson = await req.json();
    const payload = requestSchema.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        withRequestId({ error: invalidPayloadError, details: payload.error.flatten() }, ctx),
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}${upstreamPath}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      const trimmedDetail = detail.trim().slice(0, 500);
      await maybeLogUpstreamError({
        ctx,
        stage: upstreamStage,
        status: upstream.status,
        message: trimmedDetail || upstream.statusText || upstreamError,
      });
      const responseBody: Record<string, unknown> = {
        error: upstreamError,
        upstreamStatus: upstream.status,
      };
      if (process.env.NODE_ENV !== "production" && trimmedDetail) {
        responseBody.message = trimmedDetail;
      }
      return Response.json(
        withRequestId(responseBody, ctx),
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = responseSchema.safeParse(upstreamJson);
    if (!parsed.success) {
      await maybeLogInternalError({
        ctx,
        stage: "contract_validation",
        status: 502,
        message: contractError,
      });
      return Response.json(
        withRequestId(
          {
            error: contractError,
            details: parsed.error.flatten(),
          },
          ctx
        ),
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await maybeLogInternalError({
      ctx,
      stage: "unhandled_exception",
      status: 502,
      message,
    });
    const responseBody: Record<string, unknown> = { error: requestFailedError };
    if (process.env.NODE_ENV !== "production" && message) {
      responseBody.message = message;
    }
    return Response.json(withRequestId(responseBody, ctx), { status: 502 });
  }
}
