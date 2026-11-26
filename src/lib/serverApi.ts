import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { authHeaders, type Session } from "@/lib/auth";

// Server-component reads from the PlainTerms API as the signed-in user.

export type DocumentSummary = {
  id: string;
  createdAt: string;
  fileName: string;
  status: "refining" | "complete" | string;
  riskScore: number;
  riskLabel: "low" | "medium" | "high" | string;
  recommendationAction: "sign" | "negotiate" | "do_not_sign_yet" | string;
  recommendationLabel: string;
  flagCount: number;
  expiresAt: number | null;
  /** The opening of the contract text, for card thumbnails. */
  preview?: string;
};

export type DocumentsPage = { documents: DocumentSummary[]; nextCursor: string | null };

export type Account = {
  userId: string;
  email: string;
  plan: "free" | "pro";
  entitlements: { plan: "free" | "pro"; rewrites: boolean; revised_document: boolean; history: boolean };
  subscription: {
    status: string | null;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    hasBillingAccount: boolean;
  };
  usage: { documentsThisMonth: number };
  createdAt: string;
};

async function apiGet<T>(path: string, session: Session): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: authHeaders(session),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getAccount(session: Session) {
  return apiGet<Account>("/me", session);
}

export function getDocuments(session: Session, { limit = 20, cursor }: { limit?: number; cursor?: string } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return apiGet<DocumentsPage>(`/documents?${params.toString()}`, session);
}
