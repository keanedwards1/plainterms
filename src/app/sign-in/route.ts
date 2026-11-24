import { NextResponse } from "next/server";
import { isAuthConfigured, safeReturnPath, signInUrlFor } from "@/lib/auth";

// GET /sign-in?returnTo=/somewhere[&mode=sign-up]
// Starts the WorkOS AuthKit flow and comes back to `returnTo` afterwards.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("returnTo"));
  if (!isAuthConfigured()) {
    const fallback = new URL(returnTo, request.url);
    fallback.searchParams.set("signin", "unavailable");
    return NextResponse.redirect(fallback);
  }
  const target = await signInUrlFor(returnTo, { signUp: url.searchParams.get("mode") === "sign-up" });
  return NextResponse.redirect(target);
}
