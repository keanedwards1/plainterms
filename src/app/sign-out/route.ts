import { signOut } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth";

// POST only, so a link or prefetch can't sign someone out.
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }
  await signOut({ returnTo: new URL("/", request.url).toString() });
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
