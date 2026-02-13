import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { getLogContext, logApiError } from "@/lib/observability";
import { PtResult } from "@/lib/plainterms-schema";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const ctx = getLogContext(_req, "/api/result/[id]");

  try {
    const { id } = await params;
    const upstream = await fetch(`${getApiBaseUrl()}/result/${id}`, {
      cache: "no-store",
    });

    if (upstream.status === 202 || upstream.status === 410 || upstream.status === 404) {
      const body = await upstream.text().catch(() => "");
      return new Response(body, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") ?? "application/json",
        },
      });
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      await logApiError({
        ...ctx,
        stage: "upstream_result",
        status: upstream.status,
        upstreamStatus: upstream.status,
        message: detail || upstream.statusText || "Upstream /result failed.",
      });
      return Response.json(
        {
          error: "Upstream /result failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
          requestId: ctx.requestId,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = PtResult.safeParse(upstreamJson);
    if (!parsed.success) {
      await logApiError({
        ...ctx,
        stage: "contract_validation",
        status: 502,
        message: "Upstream /result response violated PtResult schema.",
      });
      return Response.json(
        {
          error: "Upstream /result response violated PtResult schema.",
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
      { error: `Result request failed: ${message}`, requestId: ctx.requestId },
      { status: 502 }
    );
  }
}
