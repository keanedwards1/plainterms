import { authedProxy } from "@/lib/authedProxy";

/** GET /api/documents/search-index?cursor= — one page of the signed-in user's search index. */
export async function GET(req: Request) {
  const cursor = new URL(req.url).searchParams.get("cursor");
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return authedProxy({ req, route: "/api/documents/search-index", upstreamPath: `/documents/search-index${query}`, method: "GET" });
}
