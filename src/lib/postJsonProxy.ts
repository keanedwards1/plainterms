import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { authHeaders, getSession } from "@/lib/auth";
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
  /** Forward the signed-in user's access token. "required" answers 401 when signed out. */
  auth?: "optional" | "required";
  /** Upstream error bodies with these `code` values are passed through to the browser. */
  passThroughCodes?: string[];
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

// Errors the API returns with a stable `code` (limit reached, upload expired,
// already on Pro, …) carry user-facing copy, so they are safe to pass through.
function readKnownError(detail: string, codes: string[]): Record<string, unknown> | null {
  if (!codes.length || !detail) return null;
  try {
    const json = JSON.parse(detail) as { error?: unknown; code?: unknown };
    if (typeof json.code === "string" && codes.includes(json.code) && typeof json.error === "string") {
      return { error: json.error, code: json.code };
    }
  } catch {
    // Not JSON.
  }
  return null;
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
  auth,
  passThroughCodes = [],
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

    const session = auth ? await getSession() : null;
    if (auth === "required" && !session) {
      return Response.json(withRequestId({ error: "Sign in to continue.", code: "sign_in_required" }, ctx), {
        status: 401,
      });
    }

    const upstream = await fetch(`${getApiBaseUrl()}${upstreamPath}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders(session) },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      const trimmedDetail = detail.trim().slice(0, 500);
      const known = readKnownError(detail, passThroughCodes);
      if (known) {
        return Response.json(withRequestId(known, ctx), { status: upstream.status });
      }
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
