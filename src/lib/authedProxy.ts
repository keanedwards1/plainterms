import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { authHeaders, getSession, type Session } from "@/lib/auth";
import { getLogContext, logApiError } from "@/lib/observability";

type AuthedProxyArgs = {
  req: Request;
  route: string;
  upstreamPath: string;
  method: "GET" | "DELETE";
  /** Called after a successful upstream response, e.g. to clean up elsewhere. */
  onSuccess?: (session: Session) => Promise<void>;
};

/**
 * Forwards a signed-in GET/DELETE to the PlainTerms API and returns its JSON.
 * Upstream error messages are already user-facing, so they pass through.
 */
export async function authedProxy({ req, route, upstreamPath, method, onSuccess }: AuthedProxyArgs) {
  const ctx = getLogContext(req, route);
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in to continue.", code: "sign_in_required" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${getApiBaseUrl()}${upstreamPath}`, {
      method,
      headers: authHeaders(session),
      cache: "no-store",
    });
    const text = await upstream.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: "Unexpected response." };
    }

    if (!upstream.ok) {
      if (upstream.status >= 500) {
        await logApiError({
          ...ctx,
          stage: "upstream",
          status: upstream.status,
          upstreamStatus: upstream.status,
          message: text.slice(0, 300),
        });
      }
      const error =
        body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Something went wrong. Please try again.";
      return Response.json({ error }, { status: upstream.status });
    }

    if (onSuccess) await onSuccess(session);
    return Response.json(body);
  } catch (err) {
    await logApiError({
      ...ctx,
      stage: "unhandled_exception",
      status: 502,
      message: err instanceof Error ? err.message : "Unknown error",
    });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
