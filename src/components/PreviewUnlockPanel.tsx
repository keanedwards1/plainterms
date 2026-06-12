"use client";

import { useState } from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import ReportSidebar from "@/components/result/ReportSidebar";
import QuickReadout from "@/components/result/QuickReadout";
import ContractHealthSnapshot from "@/components/result/ContractHealthSnapshot";
import LockedSummarySection from "@/components/result/LockedSummarySection";
import { type ReportTierOption } from "@/lib/pricingOptions";

type RiskLabel = "low" | "medium" | "high";

type PreviewUnlockPanelProps = {
  resultId: string;
  previewAccessKey: string;
  canceled?: boolean;
  risk: { score: number; label: RiskLabel };
  redFlagCount: number;
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
  risk,
  redFlagCount,
  clauseCounts,
}: PreviewUnlockPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState<{ title: string; description: string }>({
    title: "Unlock your full report",
    description: "Choose the level of review that fits what you need to see.",
  });
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function openModalGeneric(title: string, description: string) {
    setError(null);
    setProcessing(null);
    setModalFeature({ title, description });
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

        <section className="pt-card p-4">
          <div className="mb-3">
            <h2 className="text-xl text-[var(--pt-ink)]">Summary</h2>
          </div>

          <div className="space-y-3">
            <QuickReadout
              riskScore={risk.score}
              recommendationLabel={recommendation.text}
              flagsFound={redFlagCount}
            />

            <ContractHealthSnapshot
              riskScore={risk.score}
              clearClauseCount={clauseCounts.present}
              totalClauseCount={clauseCounts.total}
            />

            <LockedSummarySection
              title="Top Next Steps"
              onUnlock={() =>
                openModalGeneric(
                  "Unlock your next steps",
                  "See the prioritized actions to take before you sign or negotiate this contract."
                )
              }
            >
              <ul className="space-y-2">
                {[
                  "Request limits on license duration, scope, and transfer rights.",
                  "Add reciprocal indemnity tied to each party's own conduct.",
                  "Define payment timing with late-fee protection.",
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2 text-[15px] leading-6 text-[var(--pt-ink)]/90"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </LockedSummarySection>

            <LockedSummarySection
              title="Top Flags Preview"
              onUnlock={() =>
                openModalGeneric(
                  "Unlock all red flags",
                  "Open every flag with plain-English notes on what each issue changes for you."
                )
              }
            >
              <ul className="space-y-2">
                {[
                  { title: "Intellectual Property and Usage Rights", severity: "high", cls: "bg-[#ffe8e3] text-[#9e3f2d]" },
                  { title: "Liability and Indemnity", severity: "high", cls: "bg-[#ffe8e3] text-[#9e3f2d]" },
                  { title: "Disputes and Governing Law", severity: "medium", cls: "bg-[#fff4df] text-[#8c6526]" },
                ].map((flag) => (
                  <li
                    key={flag.title}
                    className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[var(--pt-ink)]">{flag.title}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${flag.cls}`}>
                        {flag.severity}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </LockedSummarySection>

            {canceled && !error ? (
              <p className="rounded-md border border-[#ead3a1] bg-white px-3 py-2 text-xs text-[#6e4f1e]">
                Checkout was canceled. The preview is still here.
              </p>
            ) : null}

            {error ? (
              <p className="rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">{error}</p>
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
