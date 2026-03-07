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
  const [showStillWorking, setShowStillWorking] = React.useState(false);

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

  React.useEffect(() => {
    if (error || sessionId === undefined) return;
    const timer = window.setTimeout(() => {
      setShowStillWorking(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [error, sessionId]);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative w-full text-center">
        <p className="pt-kicker mb-2 inline-flex">Step 3 of 3</p>
        <h1 className="text-5xl text-[var(--pt-ink)] sm:text-6xl">Final Safety Checks</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-[var(--pt-muted)]">
          Confirming payment and preparing your secure analysis report.
        </p>
      </div>

      {error ? (
        <div className="relative mt-8 w-full rounded-2xl border border-[var(--pt-danger)]/35 bg-[var(--pt-danger-soft)] p-5 text-sm text-[var(--pt-danger)] shadow-[0_16px_26px_-24px_var(--pt-shadow)]">
          <p>{error}</p>
          <p className="mt-4">
            <Link
              href="/analyze"
              className="pt-btn-secondary rounded-xl px-4 py-2 text-xs font-semibold"
            >
              ← Return to upload
            </Link>
          </p>
        </div>
      ) : (
        <section className="relative mt-8 w-full rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_24px_40px_-34px_var(--pt-shadow)]">
          <div className="flex items-start gap-4">
            <div className="relative mt-1 h-12 w-12 shrink-0">
              <span className="absolute inset-0 rounded-full border-2 border-[var(--pt-border)]" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--pt-accent)]" />
              <span className="absolute inset-[10px] animate-pulse rounded-full bg-[var(--pt-accent-soft)]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--pt-ink)]">
                {PROCESSING_STAGES[stageIndex]}
              </p>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">
                This usually takes under a minute once payment is confirmed.
              </p>
            </div>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--pt-border)]">
            <div
              className="h-full rounded-full bg-[var(--pt-accent)] transition-all duration-700"
              style={{ width: `${((stageIndex + 1) / PROCESSING_STAGES.length) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            {PROCESSING_STAGES.map((stage, idx) => (
              <span
                key={stage}
                className={`inline-flex h-2 w-2 rounded-full transition-colors ${
                  idx <= stageIndex ? "bg-[var(--pt-accent)]" : "bg-[var(--pt-border)]"
                } ${idx === stageIndex ? "animate-pulse" : ""}`}
              />
            ))}
          </div>

          {showStillWorking && (
            <div className="mt-5 rounded-xl border border-[var(--pt-warning)]/30 bg-[var(--pt-warning-soft)] p-3 text-xs text-[var(--pt-warning)]">
              Still working — secure processing can take up to 5 minutes for larger files.
            </div>
          )}
        </section>
      )}
    </main>
  );
}
