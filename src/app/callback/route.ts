import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth";

const authHandler = handleAuth({ returnPathname: "/" });

export async function GET(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return authHandler(request as Parameters<typeof authHandler>[0]);
}
