import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { authedProxy } from "@/lib/authedProxy";

export async function GET(req: Request) {
  return authedProxy({ req, route: "/api/me", upstreamPath: "/me", method: "GET" });
}

// Deletes the PlainTerms account and data, then the WorkOS user, so the person
// is fully removed. The browser signs out afterwards.
export async function DELETE(req: Request) {
  return authedProxy({
    req,
    route: "/api/me",
    upstreamPath: "/me",
    method: "DELETE",
    onSuccess: async (session) => {
      try {
        await getWorkOS().userManagement.deleteUser(session.user.id);
      } catch {
        // The PlainTerms data is already gone; the sign-in identity alone holds no documents.
      }
    },
  });
}
