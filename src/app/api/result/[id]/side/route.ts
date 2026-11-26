import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { authHeaders, getSession } from "@/lib/auth";
import { getLogContext, logApiError } from "@/lib/observability";

type Props = { params: Promise<{ id: string }> };

/** Rewrites the review for the other side of the contract. Forwards to POST /result/{id}/side. */
export async function POST(req: Request, { params }: Props) {
  const ctx = getLogContext(req, "/api/result/[id]/side");
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  let party = "";
  try {
    const body = (await req.json()) as { party?: unknown };
    party = typeof body.party === "string" ? body.party.trim().slice(0, 160) : "";
  } catch {
    // handled below
  }
  if (!party) return Response.json({ error: "Pick a party." }, { status: 400 });

  const accessKey = new URL(req.url).searchParams.get("k") ?? "";
  const upstream = new URL(`${getApiBaseUrl()}/result/${encodeURIComponent(id)}/side`);
  if (accessKey) upstream.searchParams.set("k", accessKey);

  try {
    const session = await getSession();
    const res = await fetch(upstream.toString(), {
      method: "POST",
      headers: { ...authHeaders(session), "content-type": "application/json" },
      body: JSON.stringify({ party }),
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: "Something went wrong. Please try again." };
    }
    if (res.status >= 500) {
      await logApiError({ ...ctx, stage: "upstream", status: res.status, upstreamStatus: res.status, message: text.slice(0, 300) });
    }
    return Response.json(body, { status: res.status });
  } catch (err) {
    await logApiError({ ...ctx, stage: "unhandled_exception", status: 502, message: err instanceof Error ? err.message : "Unknown error" });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
