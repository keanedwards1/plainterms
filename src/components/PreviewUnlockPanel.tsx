"use client";

import { useState } from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import {
  REPORT_TIER_PRICES,
  DEFAULT_REPORT_TIER,
  type ReportTierOption,
} from "@/lib/pricingOptions";

type RiskLabel = "low" | "medium" | "high";

type PreviewUnlockPanelProps = {
  resultId: string;
  previewAccessKey: string;
  canceled?: boolean;
  overview?: string;
  risk: { score: number; label: RiskLabel };
  redFlagCount: number;
  clauseCounts: { present: number; unclear: number; missing: number; total: number };
  teaser?: {
    top_next_step: string | null;
    next_steps?: string[];
    next_step_count: number;
    red_flag_titles: string[];
  };
};

type CheckoutResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
};

const CHECKOUT_STEPS = ["Securing your session", "Preparing your full report", "Opening secure checkout"];
const CHECKOUT_STEP_DESCRIPTIONS = [
  "Verifying your secure preview link.",
  "Unlocking the complete analysis for your purchase.",
  "Redirecting to encrypted Stripe checkout.",
];

const RISK_META: Record<RiskLabel, { label: string; note: string; ring: string; text: string; chipBg: string; chipText: string }> = {
  high: {
    label: "High risk",
    note: "Several terms shift risk toward you. Worth negotiating before you sign.",
    ring: "#e5573c",
    text: "#b23a22",
    chipBg: "#fdeae4",
    chipText: "#a53a22",
  },
  medium: {
    label: "Moderate risk",
    note: "A few clauses need clarifying before you commit.",
    ring: "#e0a53a",
    text: "#9a6f16",
    chipBg: "#fbf0d6",
    chipText: "#8a6413",
  },
  low: {
    label: "Low risk",
    note: "No major risk drivers stood out. Confirm the details that matter to you.",
    ring: "#24b4ae",
    text: "#12756f",
    chipBg: "#d9f2f0",
    chipText: "#0f6560",
  },
};

async function readErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
      return JSON.stringify(json).slice(0, 500);
    }
    const text = await res.text();
    if (text.trim()) return text.slice(0, 500);
  } catch { /* fall through */ }
  return res.statusText || "Unknown error";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ─── Score dial ────────────────────────────────────────────────────────────────

function ScoreDial({ score, color }: { score: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--pt-border)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold leading-none" style={{ color }}>{clamped}</span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--pt-muted)]">/ 100 risk</span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PreviewUnlockPanel({
  resultId,
  previewAccessKey,
  canceled,
  overview,
  risk,
  redFlagCount,
  clauseCounts,
  teaser,
}: PreviewUnlockPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = RISK_META[risk.label];

  const nextSteps = (teaser?.next_steps?.length
    ? teaser.next_steps
    : teaser?.top_next_step
      ? [teaser.top_next_step]
      : []
  ).filter((step) => step && step.trim());

  const flagTitles = (teaser?.red_flag_titles ?? []).filter((t) => t && t.trim());

  function openModal() {
    setError(null);
    setProcessing(null);
    setModalOpen(true);
  }

  function setStep(tier: ReportTierOption, stepIndex: number) {
    setProcessing({
      tier,
      stepNames: CHECKOUT_STEPS,
      stepIndex,
      stepLabel: CHECKOUT_STEPS[stepIndex],
      stepDescription: CHECKOUT_STEP_DESCRIPTIONS[stepIndex],
    });
  }

  async function startCheckout(tier: ReportTierOption) {
    setError(null);
    setModalOpen(true);
    setStep(tier, 0);

    void trackFunnelMetric({
      event: "checkout_start",
      funnelId: getOrCreateFunnelId(),
      resultId,
    });

    try {
      await delay(420);
      setStep(tier, 1);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ previewResultId: resultId, previewAccessKey, reportTier: tier }),
      });

      if (!res.ok) {
        const detail = await readErrorResponse(res);
        throw new Error(`Checkout failed (${res.status}): ${detail}`);
      }

      const data = (await res.json()) as CheckoutResponse;
      if (!data.checkoutUrl) throw new Error("Checkout succeeded but no checkout URL was returned.");

      setStep(tier, 2);
      await delay(320);
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      setError(detail);
      setProcessing(null);
    }
  }

  const overviewText = overview?.trim() || meta.note;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Hero: score + verdict */}
        <section className="pt-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
            <ScoreDial score={risk.score} color={meta.ring} />
            <div className="flex-1">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: meta.chipBg, color: meta.chipText }}
              >
                {meta.label}
              </span>
              <h1 className="mt-3 text-2xl font-semibold leading-tight text-[var(--pt-ink)] sm:text-3xl">
                {redFlagCount > 0
                  ? `We found ${redFlagCount} thing${redFlagCount === 1 ? "" : "s"} worth a closer look`
                  : "This contract looks broadly balanced"}
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-6 text-[var(--pt-muted)]">{overviewText}</p>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--pt-border)] pt-5 sm:grid-cols-4">
            <Stat value={redFlagCount} label="Red flags" />
            <Stat value={clauseCounts.total} label="Clauses reviewed" />
            <Stat value={clauseCounts.present} label="Clauses clear" />
            <Stat value={clauseCounts.missing} label="Clauses missing" />
          </div>
        </section>

        {/* Findings: flags + next steps side by side on desktop */}
        <div className="grid gap-6 lg:grid-cols-2">
          {flagTitles.length > 0 ? (
            <section className="pt-card p-6 sm:p-7">
              <h2 className="text-lg font-semibold text-[var(--pt-ink)]">What stood out</h2>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">The issues we spotted in your contract.</p>
              <ul className="mt-5 space-y-3">
                {flagTitles.map((title, idx) => (
                  <li key={`flag-${idx}`} className="flex items-start gap-3">
                    <span
                      className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ backgroundColor: meta.chipBg, color: meta.chipText }}
                    >
                      !
                    </span>
                    <span className="flex-1 text-[15px] leading-6 text-[var(--pt-ink)]">{title}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {nextSteps.length > 0 ? (
            <section className="pt-card p-6 sm:p-7">
              <h2 className="text-lg font-semibold text-[var(--pt-ink)]">Where to start</h2>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">A few priority moves for this contract, in plain terms.</p>
              <ol className="mt-5 space-y-3">
                {nextSteps.map((step, idx) => (
                  <li key={`step-${idx}`} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--pt-teal)] text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-[15px] leading-6 text-[var(--pt-ink)]">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        {canceled && !error ? (
          <p className="rounded-xl border border-[#ead3a1] bg-[#fbf6ea] px-4 py-3 text-sm text-[#8a6413]">
            Checkout was canceled. Your preview is still here whenever you&apos;re ready.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-[#efc1b6] bg-[#fdeae4] px-4 py-3 text-sm text-[#a53a22]">{error}</p>
        ) : null}

        {/* Single CTA */}
        <section className="overflow-hidden rounded-[var(--pt-radius)] border border-[#cfe4fb] bg-[#eaf3fe] p-8 text-center sm:p-10">
          <h2 className="mx-auto max-w-lg text-2xl font-semibold leading-tight text-[#0b3d75] sm:text-[28px]">
            See your contract with the changes applied
          </h2>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#0071e3] px-8 py-3.5 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            See the changes — from {REPORT_TIER_PRICES[DEFAULT_REPORT_TIER]}
          </button>
          <p className="mt-4 text-xs text-[#0b3d75]/60">One-time payment · No subscription</p>
        </section>
      </div>

      <UpgradeModal
        open={modalOpen}
        featureTitle="Unlock your full report"
        featureDescription="Choose your level of review. Every option unlocks the complete analysis of this contract."
        ctaPrefix="Continue with"
        recommendedTier={DEFAULT_REPORT_TIER}
        processing={processing}
        error={error}
        onSelectTier={startCheckout}
        onClose={() => { setModalOpen(false); setError(null); }}
      />
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-2xl font-semibold text-[var(--pt-ink)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--pt-muted)]">{label}</p>
    </div>
  );
}
