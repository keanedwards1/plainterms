import { NextRequest, NextResponse } from "next/server";
import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";

const COOKIE_NAME = "pt_construction_access";
const TOKEN_PREFIX = "plainterms-construction:";

function isPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/graphics/")) return true;

  return (
    pathname === "/favicon.ico" ||
    pathname === "/favicon-16x16.png" ||
    pathname === "/favicon-32x32.png" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/android-chrome-192x192.png" ||
    pathname === "/android-chrome-512x512.png" ||
    pathname === "/site.webmanifest" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".ico")
  );
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function constructionToken(password: string) {
  const encoded = new TextEncoder().encode(`${TOKEN_PREFIX}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(digest);
}

function isAuthConfigured() {
  return Boolean(
    process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_API_KEY &&
      (process.env.WORKOS_COOKIE_PASSWORD?.length ?? 0) >= 32 &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}

// Signed-in-only areas. Everything else (including analyzing a document up to
// the point of pressing Analyze) works signed out.
function isProtectedPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

// Runs AuthKit so sessions refresh on every request, then continues with its
// headers merged in. Without AuthKit configured, requests pass straight through.
async function continueWithSession(request: NextRequest) {
  if (!isAuthConfigured()) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  const { session, headers, authorizationUrl } = await authkit(request);
  if (isProtectedPath(request.nextUrl.pathname) && !session.user && authorizationUrl) {
    return handleAuthkitHeaders(request, headers, { redirect: authorizationUrl });
  }
  return handleAuthkitHeaders(request, headers);
}

export async function proxy(request: NextRequest) {
  const password = process.env.CONSTRUCTION_PASSWORD?.trim();
  if (!password) return continueWithSession(request);

  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/construction" ||
    pathname === "/api/construction-login" ||
    isPublicAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const expectedToken = await constructionToken(password);
  const actualToken = request.cookies.get(COOKIE_NAME)?.value;
  if (actualToken === expectedToken) return continueWithSession(request);

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/construction";
  redirectUrl.search = "";

  const nextPath = `${pathname}${request.nextUrl.search}`;
  if (nextPath !== "/") {
    redirectUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  // Static files and images skip the proxy entirely.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|graphics/).*)"],
};
