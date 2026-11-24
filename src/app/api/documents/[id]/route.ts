import { authedProxy } from "@/lib/authedProxy";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Props) {
  const { id } = await params;
  if (!/^pt_[A-Za-z0-9_-]{1,120}$/.test(id)) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
  return authedProxy({
    req,
    route: "/api/documents/[id]",
    upstreamPath: `/documents/${encodeURIComponent(id)}`,
    method: "DELETE",
  });
}
