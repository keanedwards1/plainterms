"use client";

import { useState } from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import QuickReadout from "@/components/result/QuickReadout";
import ContractHealthSnapshot from "@/components/result/ContractHealthSnapshot";
import {
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  DEFAULT_REPORT_TIER,
  type ReportTierOption,
} from "@/lib/pricingOptions";

type RiskLabel = "low" | "medium" | "high";

type PreviewUnlockPanelProps = {
  resultId: string;
  previewAccessKey: string;
  canceled?: boolean;
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

function deriveRecommendation(label: RiskLabel): { text: string; reason: string } {
  if (label === "high") return { text: "Negotiate before signing", reason: "Several terms shift risk toward you. Push on the highest-severity issues first." };
  if (label === "medium") return { text: "Review key terms", reason: "A few clauses need clarification before you commit." };
  return { text: "Looks broadly balanced", reason: "No major risk drivers stood out, but confirm the details that matter to you." };
}

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

// ─── Main component ────────────────────────────────────────────────────────────

export default function PreviewUnlockPanel({
  resultId,
  previewAccessKey,
  canceled,
  risk,
  redFlagCount,
  clauseCounts,
  teaser,
}: PreviewUnlockPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recommendation = deriveRecommendation(risk.label);

  const nextSteps = (teaser?.next_steps?.length
    ? teaser.next_steps
    : teaser?.top_next_step
      ? [teaser.top_next_step]
      : []
  ).filter((step) => step && step.trim());
  const moreNextSteps = Math.max((teaser?.next_step_count ?? nextSteps.length) - nextSteps.length, 0);

  const flagTitles = (teaser?.red_flag_titles ?? []).filter((t) => t && t.trim());
  const moreFlags = Math.max(redFlagCount - flagTitles.length, 0);

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

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {/* Recommendation banner */}
        <section className="pt-card p-5">
          <QuickReadout riskScore={risk.score} recommendationLabel={recommendation.text} flagsFound={redFlagCount} />
          <p className="mt-3 text-[15px] leading-6 text-[var(--pt-ink)]/85">{recommendation.reason}</p>
          <p className="mt-3 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs leading-5 text-[var(--pt-muted)]">
            This is your free estimate. The full report is a deeper review and may refine this score.
          </p>
        </section>

        {/* Health snapshot */}
        <section className="pt-card p-5">
          <ContractHealthSnapshot
            riskScore={risk.score}
            clearClauseCount={clauseCounts.present}
            totalClauseCount={clauseCounts.total}
          />
        </section>

        {/* Red flags found (real titles) */}
        {flagTitles.length > 0 ? (
          <section className="pt-card p-5">
            <h2 className="text-lg text-[var(--pt-ink)]">
              {redFlagCount > 0 ? `${redFlagCount} red flag${redFlagCount === 1 ? "" : "s"} found` : "Red flags"}
            </h2>
            <p className="mt-1 text-sm text-[var(--pt-muted)]">
              Here&apos;s what stood out in your contract. The full report explains why each one matters and how to fix it.
            </p>
            <ul className="mt-4 space-y-2.5">
              {flagTitles.map((title, idx) => (
                <li
                  key={`flag-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--pt-border)] bg-white px-4 py-3"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e7745c]" />
                  <span className="flex-1 text-[15px] leading-6 text-[var(--pt-ink)]">{title}</span>
                </li>
              ))}
            </ul>
            {moreFlags > 0 ? (
              <p className="mt-3 text-sm text-[var(--pt-muted)]">
                +{moreFlags} more flag{moreFlags === 1 ? "" : "s"} covered in the full report.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Recommended next steps (real) */}
        {nextSteps.length > 0 ? (
          <section className="pt-card p-5">
            <h2 className="text-lg text-[var(--pt-ink)]">Where to start</h2>
            <p className="mt-1 text-sm text-[var(--pt-muted)]">
              A few of the priority moves for this contract, in plain terms.
            </p>
            <ol className="mt-4 space-y-2.5">
              {nextSteps.map((step, idx) => (
                <li
                  key={`step-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--pt-border)] bg-white px-4 py-3"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-xs font-bold text-[var(--pt-muted)]">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-[15px] leading-6 text-[var(--pt-ink)]">{step}</span>
                </li>
              ))}
            </ol>
            {moreNextSteps > 0 ? (
              <p className="mt-3 text-sm text-[var(--pt-muted)]">
                +{moreNextSteps} more prioritized step{moreNextSteps === 1 ? "" : "s"} in the full report.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* One rewrite example */}
        <section className="pt-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg text-[var(--pt-ink)]">Your contract, rewritten</h2>
            <span className="rounded-full border border-[#ead3a1] bg-[#fff4df] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8c6526]">
              Example
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--pt-muted)]">
            The full report rewrites every risky clause in plain, balanced language — with tracked changes and a clean
            revised draft you can copy and send.
          </p>
          <div className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
            <div className="rounded-lg border border-[#f5c6c0] bg-[#fff0ee] px-3 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9e3f2d]">Was</p>
              <p className="leading-6 text-[#7f2e1f]">
                Any changes requested by Owner will be billed at Contractor&apos;s discretion with no prior written
                approval required.
              </p>
            </div>
            <div className="rounded-lg border border-[#a8ddd0] bg-[#edf8f5] px-3 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#1d655f]">Now</p>
              <p className="leading-6 text-[#165a52]">
                No change order is binding unless it is in writing and signed by the Owner before the work begins,
                stating the added scope, price, and schedule impact.
              </p>
            </div>
          </div>
        </section>

        {canceled && !error ? (
          <p className="rounded-md border border-[#ead3a1] bg-white px-4 py-3 text-sm text-[#6e4f1e]">
            Checkout was canceled. Your preview is still here whenever you&apos;re ready.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-[#efc1b6] bg-[#fff0ee] px-4 py-3 text-sm text-[#9e3f2d]">{error}</p>
        ) : null}

        {/* Single closing CTA */}
        <section className="pt-card overflow-hidden bg-gradient-to-br from-[#fff4ef] via-[#fff9f6] to-[#fff2dc] p-6 text-center sm:p-8">
          <h2 className="text-2xl leading-tight text-[var(--pt-ink)]">Get the full report</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-6 text-[var(--pt-muted)]">
            Every red flag explained, a clause-by-clause breakdown, negotiation questions with a ready-to-send email
            draft, and your whole contract rewritten in plain terms.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="pt-btn-primary mt-5 w-full px-6 py-3.5 text-base font-semibold sm:w-auto"
          >
            Get the full report — from {REPORT_TIER_PRICES[DEFAULT_REPORT_TIER]}
          </button>
          <p className="mt-3 text-xs text-[var(--pt-muted)]">One-time payment · No subscription · Informational only, not legal advice.</p>
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
