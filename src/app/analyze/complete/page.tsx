"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

type VerifyResponse = {
  resultId: string;
  reused?: boolean;
};

async function readErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; detail?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
      if (typeof json.detail === "string" && json.detail.trim()) return json.detail;
      return JSON.stringify(json).slice(0, 500);
    }

    const text = await res.text();
    if (text.trim()) return text.slice(0, 500);
  } catch {
    // fallback
  }

  return res.statusText || "Unknown error";
}

export default function AnalyzeCompletePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = React.useState<string | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setSessionId(url.searchParams.get("session_id"));
  }, []);

  React.useEffect(() => {
    async function verifyAndFinalize() {
      if (sessionId === undefined) {
        return;
      }

      if (!sessionId) {
        setError("Missing checkout session ID.");
        return;
      }

      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const detail = await readErrorResponse(res);
        setError(`Checkout verification failed (${res.status}): ${detail}`);
        return;
      }

      const data = (await res.json()) as VerifyResponse;
      if (!data.resultId) {
        setError("Checkout verified but no resultId was returned.");
        return;
      }

      router.replace(`/result/${data.resultId}`);
    }

    void verifyAndFinalize();
  }, [router, sessionId]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl text-[var(--pt-ink)]">Finalizing your analysis</h1>
      <p className="mt-3 text-[var(--pt-muted)]">
        We are confirming payment and preparing your result.
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <p className="mt-3">
            <Link href="/analyze" className="font-semibold underline">
              Return to upload
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[var(--pt-muted)]">Please wait...</p>
      )}
    </main>
  );
}
