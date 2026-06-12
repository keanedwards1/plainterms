"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import {
  REPORT_TIER_DESCRIPTIONS,
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";

type RiskLabel = "low" | "medium" | "high";

type PreviewUnlockPanelProps = {
  resultId: string;
  previewAccessKey: string;
  canceled?: boolean;
  fileName: string;
  createdAtLabel: string;
  headline: string;
  overview: string;
  risk: { score: number; label: RiskLabel };
  redFlagCount: number;
  severityCounts: { high: number; medium: number; low: number };
  clauseCounts: { present: number; unclear: number; missing: number; total: number };
};

type CheckoutResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
};

type PreviewTabKey =
  | "summary"
  | "insights"
  | "flags"
  | "terms"
  | "questions"
  | "document"
  | "full";

type PreviewTab = {
  key: PreviewTabKey;
  label: string;
  icon: string;
  count?: number | "all";
  unlockTitle: string;
  unlockDescription: string;
};

const TIER_ORDER: ReportTierOption[] = ["scan_39", "report_69", "protect_99"];

const TIER_FEATURES: Record<ReportTierOption, string[]> = {
  scan_39: ["Priority risk summary", "Top issue spotting", "Sign-or-negotiate guidance"],
  report_69: ["Full red-flag review", "Clause-by-clause breakdown", "Questions to ask"],
  protect_99: ["Rewrite options", "Negotiation plan", "Ready-to-send email draft"],
};

function riskLabelClass(label: RiskLabel) {
  if (label === "high") return "border-[#efc1b6] bg-[#ffe8e3] text-[#9e3f2d]";
  if (label === "medium") return "border-[#ead3a1] bg-[#fff4df] text-[#8c6526]";
  return "border-[#b2ddd4] bg-[#e1f4ef] text-[#1d655f]";
}

function riskMeterClass(label: RiskLabel) {
  if (label === "high") return "bg-[#e7745c]";
  if (label === "medium") return "bg-[#d8a84b]";
  return "bg-[#2ba59f]";
}

function deriveRecommendation(label: RiskLabel) {
  if (label === "high") {
    return {
      text: "Negotiate before signing",
      reason: "Several terms shift risk toward you. Push on the highest-severity issues first.",
      cls: "border-[#efc1b6] bg-[#ffe8e3] text-[#9e3f2d]",
    };
  }
  if (label === "medium") {
    return {
      text: "Review key terms",
      reason: "A few clauses need clarification before you commit.",
      cls: "border-[#ead3a1] bg-[#fff4df] text-[#8c6526]",
    };
  }
  return {
    text: "Looks broadly balanced",
    reason: "No major risk drivers stood out, but confirm the details that matter to you.",
    cls: "border-[#b2ddd4] bg-[#e1f4ef] text-[#1d655f]",
  };
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
  } catch {
    // Fall back below.
  }

  return res.statusText || "Unknown error";
}

export default function PreviewUnlockPanel({
  resultId,
  previewAccessKey,
  canceled,
  fileName,
  createdAtLabel,
  headline,
  overview,
  risk,
  redFlagCount,
  severityCounts,
  clauseCounts,
}: PreviewUnlockPanelProps) {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ReportTierOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockTab, setUnlockTab] = useState<PreviewTab | null>(null);

  const clauseIssueCount = clauseCounts.unclear + clauseCounts.missing;
  const recommendation = deriveRecommendation(risk.label);

  const previewTabs: PreviewTab[] = [
    {
      key: "summary",
      label: "Summary",
      icon: "/window.svg",
      unlockTitle: "Unlock the full summary",
      unlockDescription:
        "See the complete risk readout, recommendation rationale, and every prioritized next step for this contract.",
    },
    {
      key: "insights",
      label: "Insights",
      icon: "/graphics/icon-search.svg",
      unlockTitle: "Unlock cross-tab insights",
      unlockDescription:
        "Connect risk posture, clause clarity, and evidence coverage to spot hidden leverage fast.",
    },
    {
      key: "flags",
      label: "Red Flags",
      icon: "/graphics/icon-shield.svg",
      count: redFlagCount,
      unlockTitle: "Unlock all red flags",
      unlockDescription:
        "Open every high, medium, and low severity flag with plain-English notes on what each one changes for you.",
    },
    {
      key: "terms",
      label: "Key Terms",
      icon: "/file.svg",
      count: clauseCounts.total,
      unlockTitle: "Unlock the full clause breakdown",
      unlockDescription:
        "See clause-by-clause status for present, unclear, and missing terms before you sign.",
    },
    {
      key: "questions",
      label: "Questions",
      icon: "/globe.svg",
      unlockTitle: "Unlock negotiation questions",
      unlockDescription:
        "Get practical, ready-to-send questions to move your next email or call forward with concrete asks.",
    },
    {
      key: "document",
      label: "Document",
      icon: "/graphics/icon-doc.svg",
      unlockTitle: "Unlock document review",
      unlockDescription:
        "Read the source text with inline callouts, tracked changes, and revised wording where available.",
    },
    {
      key: "full",
      label: "Full Report",
      icon: "/graphics/icon-doc.svg",
      count: "all",
      unlockTitle: "Unlock the full evidence-backed report",
      unlockDescription:
        "Get complete context with supporting details and source notes for stronger negotiation.",
    },
  ];

  useEffect(() => {
    if (!unlockTab) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setUnlockTab(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unlockTab]);

  async function startCheckout(reportTier: ReportTierOption) {
    setSelectedTier(reportTier);
    setIsStartingCheckout(true);
    setError(null);

    try {
      void trackFunnelMetric({
        event: "checkout_start",
        funnelId: getOrCreateFunnelId(),
        resultId,
      });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          previewResultId: resultId,
          previewAccessKey,
          reportTier,
        }),
      });

      if (!res.ok) {
        const detail = await readErrorResponse(res);
        throw new Error(`Checkout failed (${res.status}): ${detail}`);
      }

      const data = (await res.json()) as CheckoutResponse;
      if (!data.checkoutUrl) {
        throw new Error("Checkout succeeded but no checkout URL was returned.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      setError(detail);
      setIsStartingCheckout(false);
      setSelectedTier(null);
    }
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="pt-card p-4">
          <h2 className="text-xl text-[var(--pt-ink)]">At A Glance</h2>

          <nav aria-label="Result sections" className="mt-3 space-y-2">
            {previewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setUnlockTab(tab)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  tab.key === "summary"
                    ? "border-[#de8f79] bg-[#ffe5dc] text-[#5a2f25] shadow-[inset_0_0_0_1px_rgba(222,143,121,0.15)]"
                    : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[#de8f79] hover:text-[var(--pt-ink)]"
                }`}
                aria-label={`Unlock ${tab.label} section`}
              >
                <span className="flex items-center gap-2">
                  <Image src={tab.icon} alt="" width={16} height={16} className="h-4 w-4" />
                  <span>{tab.label}</span>
                </span>
                {tab.count !== undefined ? (
                  <span className="pt-pill !px-2 !py-0.5 !text-[10px]">
                    {tab.count === "all" ? "All" : tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-4 space-y-3">
            <div className="pt-card-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Risk</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskLabelClass(risk.label)}`}>
                  {risk.label.toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-[var(--pt-ink)]">{risk.score}/100</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
                <div
                  className={`h-full rounded-full ${riskMeterClass(risk.label)}`}
                  style={{ width: `${Math.max(risk.score, 6)}%` }}
                />
              </div>
            </div>

            <div className="pt-card-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                Recommendation
              </p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${recommendation.cls}`}>
                {recommendation.text}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--pt-ink)]/85">{recommendation.reason}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
            Informational only. Not legal advice.
          </div>
        </aside>

        <section className="pt-card overflow-hidden">
          <div className="border-b border-[var(--pt-border)] bg-[#fff8f1] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pt-muted)]">
              <span>File: {fileName}</span>
              <span>Analyzed: {createdAtLabel}</span>
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl leading-tight text-[var(--pt-ink)] sm:text-4xl">
              {headline}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--pt-muted)]">{overview}</p>
          </div>

          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-lg border border-[#efc1b6] bg-[#ffe8e3] p-4">
                <p className="text-sm font-semibold text-[#9e3f2d]">Risk score</p>
                <p className="mt-2 text-5xl font-semibold leading-none text-[#7f2e1f]">{risk.score}</p>
                <p className="mt-1 text-sm text-[#9e3f2d]">out of 100</p>
              </article>
              <article className="rounded-lg border border-[#ead3a1] bg-[#fff4df] p-4">
                <p className="text-sm font-semibold text-[#8c6526]">Red flags found</p>
                <p className="mt-2 text-5xl font-semibold leading-none text-[#6e4f1e]">{redFlagCount}</p>
                <p className="mt-1 text-sm text-[#8c6526]">issue count</p>
              </article>
              <article className="rounded-lg border border-[#b2ddd4] bg-[#e1f4ef] p-4">
                <p className="text-sm font-semibold text-[#1d655f]">Clause issues</p>
                <p className="mt-2 text-5xl font-semibold leading-none text-[#154f4a]">{clauseIssueCount}</p>
                <p className="mt-1 text-sm text-[#1d655f]">unclear or missing</p>
              </article>
            </div>

            <article className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--pt-ink)]">Threat snapshot</p>
                  <p className="mt-1 text-sm text-[var(--pt-muted)]">
                    Shareable preview. Specific titles, notes, evidence, rewrites, and email content are locked.
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskLabelClass(risk.label)}`}>
                  {risk.label.toUpperCase()} RISK
                </span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e8e0d4]">
                <div
                  className={`h-full rounded-full ${riskMeterClass(risk.label)}`}
                  style={{ width: `${Math.max(risk.score, 5)}%` }}
                />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-[#efc1b6] bg-white px-3 py-2">
                  <p className="text-xs text-[#9e3f2d]">High severity</p>
                  <p className="text-xl font-semibold text-[#7f2e1f]">{severityCounts.high}</p>
                </div>
                <div className="rounded-md border border-[#ead3a1] bg-white px-3 py-2">
                  <p className="text-xs text-[#8c6526]">Medium severity</p>
                  <p className="text-xl font-semibold text-[#6e4f1e]">{severityCounts.medium}</p>
                </div>
                <div className="rounded-md border border-[#b2ddd4] bg-white px-3 py-2">
                  <p className="text-xs text-[#1d655f]">Low severity</p>
                  <p className="text-xl font-semibold text-[#154f4a]">{severityCounts.low}</p>
                </div>
              </div>
            </article>

            <p className="mt-3 text-sm text-[var(--pt-muted)]">
              Click any section on the left to unlock the full analysis.
            </p>

            <div className="mt-4 rounded-lg border border-[#e9d3b0] bg-[#fff8ef] p-4 shadow-[0_14px_26px_-24px_var(--pt-shadow)]">
              <p className="text-sm font-semibold text-[#6e4f1e]">Choose your review</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {TIER_ORDER.map((tier) => (
                  <article key={tier} className="flex flex-col rounded-lg border border-[#e9d3b0] bg-white p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-base font-semibold text-[var(--pt-ink)]">{REPORT_TIER_NAMES[tier]}</p>
                      <p className="text-xl font-semibold text-[var(--pt-ink)]">{REPORT_TIER_PRICES[tier]}</p>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[var(--pt-muted)]">
                      {REPORT_TIER_DESCRIPTIONS[tier]}
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-[var(--pt-muted)]">
                      {TIER_FEATURES[tier].map((item) => (
                        <li key={`${tier}-${item}`}>• {item}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => startCheckout(tier)}
                      disabled={isStartingCheckout}
                      className={`mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                        tier === "report_69" ? "pt-btn-primary" : "pt-btn-secondary"
                      }`}
                    >
                      {isStartingCheckout && selectedTier === tier
                        ? "Opening checkout..."
                        : `Continue with ${REPORT_TIER_NAMES[tier]}`}
                    </button>
                  </article>
                ))}
              </div>
            </div>

            {canceled && !error ? (
              <p className="mt-3 rounded-md border border-[#ead3a1] bg-white px-3 py-2 text-xs text-[#6e4f1e]">
                Checkout was canceled. The preview is still here.
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </section>

      {unlockTab ? (
        <div className="fixed bottom-5 left-1/2 z-[200] w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-[var(--pt-border)] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(31,43,61,0.55)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--pt-ink)]">{unlockTab.unlockTitle}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--pt-muted)]">{unlockTab.unlockDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => setUnlockTab(null)}
              className="rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {TIER_ORDER.map((tier) => (
              <button
                key={`unlock-${tier}`}
                type="button"
                onClick={() => startCheckout(tier)}
                disabled={isStartingCheckout}
                className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2.5 text-left transition-colors hover:border-[var(--pt-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                title={REPORT_TIER_DESCRIPTIONS[tier]}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">{REPORT_TIER_NAMES[tier]}</span>
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">{REPORT_TIER_PRICES[tier]}</span>
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-[var(--pt-muted)]">
                  {isStartingCheckout && selectedTier === tier ? "Opening..." : REPORT_TIER_DESCRIPTIONS[tier]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
