"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";

type VerifyResponse = {
  resultId: string;
  reused?: boolean;
};

const PROCESSING_STAGES = [
  "Confirming secure payment.",
  "Reading and structuring contract clauses.",
  "Scoring risk and generating plain-English guidance.",
  "Preparing your result page.",
] as const;

async function readErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; detail?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) {
        if (typeof json.detail === "string" && json.detail.trim()) {
          return `${json.error} ${json.detail}`;
        }
        return json.error;
      }
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
  const [stageIndex, setStageIndex] = React.useState(0);

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

      void trackFunnelMetric({
        event: "checkout_success",
        funnelId: getOrCreateFunnelId(),
        resultId: data.resultId,
        sessionId,
      });
      router.replace(`/result/${data.resultId}`);
    }

    void verifyAndFinalize();
  }, [router, sessionId]);

  React.useEffect(() => {
    if (error) return;
    const timer = window.setInterval(() => {
      setStageIndex((prev) => (prev + 1) % PROCESSING_STAGES.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [error]);

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
        <section className="mt-6 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0">
              <span className="absolute inset-0 rounded-full border-2 border-[var(--pt-border)]" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--pt-accent)]" />
              <span className="absolute inset-[10px] animate-pulse rounded-full bg-[var(--pt-accent-soft)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--pt-ink)]">
                {PROCESSING_STAGES[stageIndex]}
              </p>
              <p className="mt-1 text-xs text-[var(--pt-muted)]">
                This usually takes under a minute once payment is confirmed.
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--pt-border)]">
            <div
              className="h-full rounded-full bg-[var(--pt-accent)] transition-all duration-700"
              style={{ width: `${((stageIndex + 1) / PROCESSING_STAGES.length) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {PROCESSING_STAGES.map((stage, idx) => (
              <span
                key={stage}
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  idx <= stageIndex ? "bg-[var(--pt-accent)]" : "bg-[var(--pt-border)]"
                } ${idx === stageIndex ? "animate-pulse" : ""}`}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
