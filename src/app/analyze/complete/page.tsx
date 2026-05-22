"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import Image from "next/image";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";

type VerifyResponse = {
  resultId: string;
  accessKey: string;
  reused?: boolean;
};

const STAGES = [
  { label: "Getting your report ready.", threshold: 0 },
  { label: "Reading and structuring contract clauses.", threshold: 25 },
  { label: "Scoring risk and generating plain-English guidance.", threshold: 55 },
  { label: "Preparing your result page.", threshold: 80 },
] as const;

const ESTIMATED_MS = 40_000;

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
  const [progress, setProgress] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [showStillWorking, setShowStillWorking] = React.useState(false);
  const startTimeRef = React.useRef<number | null>(null);

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
      if (!data.resultId || !data.accessKey) {
        setError("Checkout verified but the secure result link data was incomplete.");
        return;
      }

      void trackFunnelMetric({
        event: "checkout_success",
        funnelId: getOrCreateFunnelId(),
        resultId: data.resultId,
        sessionId,
      });
      setDone(true);
      setProgress(100);
      setTimeout(() => {
        router.replace(
          `/result/${encodeURIComponent(data.resultId)}?k=${encodeURIComponent(data.accessKey)}`
        );
      }, 400);
    }

    void verifyAndFinalize();
  }, [router, sessionId]);

  React.useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    if (error || done) return;
    const tick = window.setInterval(() => {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      const elapsed = Date.now() - startTimeRef.current;
      const ratio = Math.min(elapsed / ESTIMATED_MS, 1);
      // sqrt curve: fast start, slows as it approaches the cap
      setProgress(Math.floor(Math.sqrt(ratio) * 88));
    }, 300);
    return () => window.clearInterval(tick);
  }, [error, done]);

  React.useEffect(() => {
    if (error || sessionId === undefined) return;
    const timer = window.setTimeout(() => setShowStillWorking(true), 10000);
    return () => window.clearTimeout(timer);
  }, [error, sessionId]);

  const currentStage = [...STAGES].reverse().find((s) => progress >= s.threshold) ?? STAGES[0];

  return (
    <main className="pt-page-pad flex min-h-screen items-center justify-center">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl text-[var(--pt-ink)]">Final safety checks</h1>
        <p className="mt-3 text-[var(--pt-muted)]">
          Finalizing your secure report and loading your results.
        </p>

        {error ? (
          <div className="pt-alert-danger mt-6 p-4 text-sm">
            <p>{error}</p>
            <p className="mt-3">
              <Link href="/analyze" className="font-semibold underline">
                Return to upload
              </Link>
            </p>
          </div>
        ) : (
          <section className="mt-6 pt-card p-5">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 shrink-0">
                <span className="absolute inset-0 rounded-full border-2 border-[var(--pt-border)]" />
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--pt-accent)]" />
                <span className="absolute inset-[10px] animate-pulse rounded-full bg-[var(--pt-accent-soft)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">
                  {currentStage.label}
                </p>
                <p className="mt-1 text-xs text-[var(--pt-muted)]">
                  This usually takes under a minute once payment is confirmed.
                </p>
              </div>
              <Image
                src="/graphics/icon-shield.svg"
                alt=""
                width={58}
                height={58}
                className="ml-auto hidden rounded-xl border border-[var(--pt-border)] bg-white p-2 sm:block"
              />
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--pt-border)]">
              <div
                className="h-full rounded-full bg-[var(--pt-accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {STAGES.map((stage) => (
                  <span
                    key={stage.label}
                    className={`inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${
                      progress >= stage.threshold ? "bg-[var(--pt-accent)]" : "bg-[var(--pt-border)]"
                    } ${currentStage.label === stage.label ? "animate-pulse" : ""}`}
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--pt-muted)]">{progress}%</span>
            </div>

            {showStillWorking && (
              <div className="pt-alert-warn mt-4 p-3 text-xs">
                Still working. Secure processing continues in the background and can take up to 5
                minutes for larger files.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
