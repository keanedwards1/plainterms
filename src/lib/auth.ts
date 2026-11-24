import { getSignInUrl, getSignUpUrl, withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";

// Server-only helpers around WorkOS AuthKit. Every caller goes through these
// so the app keeps working (signed-out) when AuthKit is not configured yet.

export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};

export type Session = {
  user: SessionUser;
  accessToken: string;
};

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_API_KEY &&
      process.env.WORKOS_COOKIE_PASSWORD &&
      process.env.WORKOS_COOKIE_PASSWORD.length >= 32 &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}

/** The signed-in user and their access token, or null when signed out. */
export async function getSession(): Promise<Session | null> {
  // Reading cookies marks the page as per-request, so pages behave the same
  // whether or not AuthKit is configured in this environment.
  await cookies();
  if (!isAuthConfigured()) return null;
  try {
    const auth = await withAuth();
    if (!auth.user || !auth.accessToken) return null;
    return {
      accessToken: auth.accessToken,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        firstName: auth.user.firstName ?? null,
        lastName: auth.user.lastName ?? null,
        profilePictureUrl: auth.user.profilePictureUrl ?? null,
      },
    };
  } catch {
    return null;
  }
}

/** Headers that identify the user to the PlainTerms API. */
export function authHeaders(session: Session | null): Record<string, string> {
  if (!session) return {};
  return {
    authorization: `Bearer ${session.accessToken}`,
    "x-pt-user-email": session.user.email,
  };
}

/** Only same-site relative paths may be used as post-sign-in destinations. */
export function safeReturnPath(value: string | null | undefined, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return fallback;
  if (trimmed.length > 500 || /[\r\n]/.test(trimmed)) return fallback;
  return trimmed;
}

export async function signInUrlFor(returnPath: string, { signUp = false } = {}): Promise<string> {
  const returnTo = safeReturnPath(returnPath);
  return signUp ? getSignUpUrl({ returnTo }) : getSignInUrl({ returnTo });
}

export function displayName(user: SessionUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.email;
}
