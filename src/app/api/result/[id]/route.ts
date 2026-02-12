import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { PtResult } from "@/lib/plainterms-schema";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const upstream = await fetch(`${getApiBaseUrl()}/result/${id}`, {
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        {
          error: "Upstream /result failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = PtResult.safeParse(upstreamJson);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Upstream /result response violated PtResult schema.",
          details: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Result request failed: ${message}` }, { status: 502 });
  }
}
