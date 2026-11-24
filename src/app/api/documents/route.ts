import { authedProxy } from "@/lib/authedProxy";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = new URLSearchParams();
  const cursor = url.searchParams.get("cursor");
  const limit = url.searchParams.get("limit");
  if (cursor) params.set("cursor", cursor.slice(0, 2048));
  if (limit && /^\d{1,2}$/.test(limit)) params.set("limit", limit);
  const query = params.toString();
  return authedProxy({
    req,
    route: "/api/documents",
    upstreamPath: `/documents${query ? `?${query}` : ""}`,
    method: "GET",
  });
}
