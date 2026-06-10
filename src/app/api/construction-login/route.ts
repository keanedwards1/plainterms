import crypto from "node:crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "pt_construction_access";
const TOKEN_PREFIX = "plainterms-construction:";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function constructionToken(password: string) {
  return crypto.createHash("sha256").update(`${TOKEN_PREFIX}${password}`).digest("base64url");
}

function safeCompare(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/api/construction-login")) return "/";
  return value;
}

function redirectToConstruction(req: Request, nextPath: string) {
  const url = new URL("/construction", req.url);
  url.searchParams.set("error", "1");
  if (nextPath !== "/") {
    url.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  const configuredPassword = process.env.CONSTRUCTION_PASSWORD?.trim();
  const formData = await req.formData();
  const nextPath = safeNextPath(formData.get("next"));

  if (!configuredPassword) {
    return NextResponse.redirect(new URL(nextPath, req.url), { status: 303 });
  }

  const submittedPassword = formData.get("password");
  if (
    typeof submittedPassword !== "string" ||
    !safeCompare(submittedPassword, configuredPassword)
  ) {
    return redirectToConstruction(req, nextPath);
  }

  const response = NextResponse.redirect(new URL(nextPath, req.url), { status: 303 });
  response.cookies.set({
    name: COOKIE_NAME,
    value: constructionToken(configuredPassword),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export function GET(req: Request) {
  return NextResponse.redirect(new URL("/construction", req.url), { status: 303 });
}
