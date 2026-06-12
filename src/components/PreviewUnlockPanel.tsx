"use client";

import { useState } from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import ReportSidebar from "@/components/result/ReportSidebar";
import { riskLabelClass, riskMeterClass } from "@/lib/reportStyles";
import { type ReportTierOption } from "@/lib/pricingOptions";

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

const CHECKOUT_STEPS = ["Securing your session", "Preparing your full report", "Opening secure checkout"];
const CHECKOUT_STEP_DESCRIPTIONS = [
  "Verifying your secure preview link.",
  "Unlocking the complete analysis for your purchase.",
  "Redirecting to encrypted Stripe checkout.",
];

function deriveRecommendation(label: RiskLabel): { text: string; reason: string } {
  if (label === "high") {
    return {
      text: "Negotiate before signing",
      reason: "Several terms shift risk toward you. Push on the highest-severity issues first.",
    };
  }
  if (label === "medium") {
    return {
      text: "Review key terms",
      reason: "A few clauses need clarification before you commit.",
    };
  }
  return {
    text: "Looks broadly balanced",
    reason: "No major risk drivers stood out, but confirm the details that matter to you.",
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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState<{ title: string; description: string }>({
    title: "Unlock your full report",
    description: "Choose the level of review that fits what you need to see.",
  });
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function openModalForTab(tab: PreviewTab) {
    setError(null);
    setProcessing(null);
    setModalFeature({ title: tab.unlockTitle, description: tab.unlockDescription });
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
        body: JSON.stringify({
          previewResultId: resultId,
          previewAccessKey,
          reportTier: tier,
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
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ReportSidebar
          tabs={previewTabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            icon: tab.icon,
            count: tab.count,
          }))}
          activeKey="summary"
          onSelectTab={(key) => {
            const tab = previewTabs.find((t) => t.key === key);
            if (tab) openModalForTab(tab);
          }}
          risk={risk}
          recommendation={{
            label: recommendation.text,
            reason: recommendation.reason,
            tone: risk.label,
          }}
          tabAriaLabel={(label) => `Unlock ${label} section`}
          footer={
            <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
              Informational only. Not legal advice.
            </div>
          }
        />

        <section className="pt-card overflow-hidden">
          <div className="border-b border-[var(--pt-border)] bg-[#fff8f1] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pt-muted)]">
              <span>File: {fileName}</span>
              <span>Analyzed: {createdAtLabel}</span>
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl leading-tight text-[var(--pt-ink)] sm:text-4xl">{headline}</h1>
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
                <div className={`h-full rounded-full ${riskMeterClass(risk.label)}`} style={{ width: `${Math.max(risk.score, 5)}%` }} />
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

            <button
              type="button"
              onClick={() => {
                setModalFeature({
                  title: "Unlock your full report",
                  description: "Choose the level of review that fits what you need to see.",
                });
                setError(null);
                setProcessing(null);
                setModalOpen(true);
              }}
              className="pt-btn-primary mt-4 inline-flex items-center px-5 py-2.5 text-sm font-semibold"
            >
              Unlock full report
            </button>

            {canceled && !error ? (
              <p className="mt-3 rounded-md border border-[#ead3a1] bg-white px-3 py-2 text-xs text-[#6e4f1e]">
                Checkout was canceled. The preview is still here.
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">{error}</p>
            ) : null}
          </div>
        </section>
      </section>

      <UpgradeModal
        open={modalOpen}
        featureTitle={modalFeature.title}
        featureDescription={modalFeature.description}
        ctaPrefix="Continue with"
        processing={processing}
        error={error}
        onSelectTier={startCheckout}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
