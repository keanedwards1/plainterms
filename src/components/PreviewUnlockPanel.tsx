"use client";

import { useState } from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import ReportSidebar from "@/components/result/ReportSidebar";
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

const TABS: { key: PreviewTabKey; label: string; icon: string }[] = [
  { key: "summary",   label: "Summary",     icon: "/window.svg" },
  { key: "insights",  label: "Insights",    icon: "/graphics/icon-search.svg" },
  { key: "flags",     label: "Red Flags",   icon: "/graphics/icon-shield.svg" },
  { key: "terms",     label: "Key Terms",   icon: "/file.svg" },
  { key: "questions", label: "Questions",   icon: "/globe.svg" },
  { key: "document",  label: "Document",    icon: "/graphics/icon-doc.svg" },
  { key: "full",      label: "Full Report", icon: "/graphics/icon-doc.svg" },
];

const TAB_UNLOCK: Record<PreviewTabKey, { title: string; description: string }> = {
  summary:   { title: "Unlock the full summary",         description: "See the complete risk readout, recommendation rationale, and every prioritized next step." },
  insights:  { title: "Unlock cross-tab insights",       description: "Connect risk posture, clause clarity, and evidence coverage to spot hidden leverage fast." },
  flags:     { title: "Unlock all red flags",            description: "Every high, medium, and low severity flag with plain-English notes on what each one means for you." },
  terms:     { title: "Unlock the full clause breakdown",description: "Clause-by-clause status for present, unclear, and missing terms before you sign." },
  questions: { title: "Unlock negotiation questions",    description: "Practical, ready-to-send questions to move your next email or call forward." },
  document:  { title: "Unlock document review",         description: "Source text with inline callouts, tracked changes, and revised wording where available." },
  full:      { title: "Unlock the full evidence-backed report", description: "Complete context with supporting details and source notes for stronger negotiation." },
};

const CHECKOUT_STEPS = ["Securing your session", "Preparing your full report", "Opening secure checkout"];
const CHECKOUT_STEP_DESCRIPTIONS = [
  "Verifying your secure preview link.",
  "Unlocking the complete analysis for your purchase.",
  "Redirecting to encrypted Stripe checkout.",
];

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

// ─── Placeholder shapes (no real data) ────────────────────────────────────────

function PlaceholderTiles() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {["Risk score", "Recommendation", "Flags found"].map((label) => (
        <div key={label} className="rounded-xl border border-[var(--pt-border)] bg-white p-3">
          <p className="text-xs text-[var(--pt-muted)]">{label}</p>
          <div className="mt-2 h-6 w-16 rounded bg-[#e6d8c3]" />
        </div>
      ))}
    </div>
  );
}

function PlaceholderBars() {
  return (
    <div className="space-y-3">
      {["Contract strength", "Clause clarity"].map((label) => (
        <div key={label}>
          <div className="mb-1 flex justify-between">
            <span className="text-xs text-[var(--pt-muted)]">{label}</span>
            <div className="h-3 w-8 rounded bg-[#e6d8c3]" />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e6d8c3]">
            <div className="h-full w-3/5 rounded-full bg-[#c8d9d7]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceholderList({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5">
          <div className="h-3 w-full rounded bg-[#e6d8c3]" />
          <div className="mt-1.5 h-3 w-3/4 rounded bg-[#ede6db]" />
        </li>
      ))}
    </ul>
  );
}

function PlaceholderFlagList({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5">
          <div className="h-3 w-2/3 rounded bg-[#e6d8c3]" />
          <div className="h-5 w-14 rounded-full bg-[#fde8e3]" />
        </li>
      ))}
    </ul>
  );
}

function PlaceholderTermList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5">
          <div className="h-4 w-4 shrink-0 rounded-full bg-[#d4ece9]" />
          <div className="flex-1">
            <div className="h-3 w-2/3 rounded bg-[#e6d8c3]" />
          </div>
          <div className="h-4 w-16 rounded-full bg-[#ede6db]" />
        </div>
      ))}
    </div>
  );
}

function PlaceholderQA({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-3">
          <div className="h-3 w-3/4 rounded bg-[#e6d8c3]" />
          <div className="mt-1.5 h-3 w-full rounded bg-[#ede6db]" />
          <div className="mt-1 h-3 w-1/2 rounded bg-[#ede6db]" />
        </div>
      ))}
    </div>
  );
}

function PlaceholderText({ lines = 6 }: { lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-3/4", "w-full"];
  return (
    <div className="space-y-2 rounded-lg border border-[var(--pt-border)] bg-white px-4 py-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 rounded bg-[#e6d8c3] ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

// ─── Per-tab locked layouts ────────────────────────────────────────────────────

function LockedTabContent({
  title,
  children,
  onUnlock,
}: {
  title: string;
  children: React.ReactNode;
  onUnlock: () => void;
}) {
  return (
    <article className="pt-card-soft p-3">
      <h3 className="text-lg font-semibold text-[var(--pt-ink)]">{title}</h3>
      <button
        type="button"
        onClick={onUnlock}
        aria-label={`Unlock ${title}`}
        className="relative mt-2 block w-full cursor-pointer text-left"
      >
        <div className="pointer-events-none select-none blur-[3px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_96%)]">
          {children}
        </div>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--pt-border)] bg-white/95 px-3.5 py-1.5 text-sm font-semibold text-[var(--pt-ink)] shadow-sm transition-colors hover:border-[var(--pt-accent)] hover:text-[var(--pt-accent)]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Unlock to view
          </span>
        </span>
      </button>
    </article>
  );
}

function SummaryTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="Quick Readout" onUnlock={onUnlock}>
        <PlaceholderTiles />
      </LockedTabContent>
      <LockedTabContent title="Contract Health" onUnlock={onUnlock}>
        <PlaceholderBars />
      </LockedTabContent>
      <LockedTabContent title="Top Next Steps" onUnlock={onUnlock}>
        <PlaceholderList rows={3} />
      </LockedTabContent>
      <LockedTabContent title="Top Flags Preview" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={3} />
      </LockedTabContent>
    </div>
  );
}

function InsightsTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="Risk Overview" onUnlock={onUnlock}>
        <PlaceholderBars />
      </LockedTabContent>
      <LockedTabContent title="Coverage Gaps" onUnlock={onUnlock}>
        <PlaceholderList rows={4} />
      </LockedTabContent>
    </div>
  );
}

function FlagsTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="High Severity" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={3} />
      </LockedTabContent>
      <LockedTabContent title="Medium & Low Severity" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={4} />
      </LockedTabContent>
    </div>
  );
}

function TermsTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="Clause Breakdown" onUnlock={onUnlock}>
        <PlaceholderBars />
      </LockedTabContent>
      <LockedTabContent title="All Terms" onUnlock={onUnlock}>
        <PlaceholderTermList rows={6} />
      </LockedTabContent>
    </div>
  );
}

function QuestionsTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="Negotiation Questions" onUnlock={onUnlock}>
        <PlaceholderQA rows={5} />
      </LockedTabContent>
    </div>
  );
}

function DocumentTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="Source Document" onUnlock={onUnlock}>
        <PlaceholderText lines={8} />
      </LockedTabContent>
      <LockedTabContent title="Inline Annotations" onUnlock={onUnlock}>
        <PlaceholderText lines={5} />
      </LockedTabContent>
    </div>
  );
}

function FullReportTabContent({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <LockedTabContent title="Executive Summary" onUnlock={onUnlock}>
        <PlaceholderText lines={5} />
      </LockedTabContent>
      <LockedTabContent title="Detailed Findings" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={5} />
      </LockedTabContent>
      <LockedTabContent title="Supporting Evidence" onUnlock={onUnlock}>
        <PlaceholderText lines={6} />
      </LockedTabContent>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PreviewUnlockPanel({
  resultId,
  previewAccessKey,
  canceled,
}: PreviewUnlockPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTabKey>("summary");
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeUnlock = TAB_UNLOCK[activeTab];

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
          tabs={TABS}
          activeKey={activeTab}
          onSelectTab={(key) => setActiveTab(key as PreviewTabKey)}
          footer={
            <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
              Informational only. Not legal advice.
            </div>
          }
        />

        <section className="pt-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl text-[var(--pt-ink)]">
              {TABS.find((t) => t.key === activeTab)?.label ?? "Summary"}
            </h2>
            <button
              type="button"
              onClick={openModal}
              className="pt-btn-primary px-4 py-2 text-sm font-semibold"
            >
              Unlock full report
            </button>
          </div>

          {activeTab === "summary"   && <SummaryTabContent   onUnlock={openModal} />}
          {activeTab === "insights"  && <InsightsTabContent  onUnlock={openModal} />}
          {activeTab === "flags"     && <FlagsTabContent     onUnlock={openModal} />}
          {activeTab === "terms"     && <TermsTabContent     onUnlock={openModal} />}
          {activeTab === "questions" && <QuestionsTabContent onUnlock={openModal} />}
          {activeTab === "document"  && <DocumentTabContent  onUnlock={openModal} />}
          {activeTab === "full"      && <FullReportTabContent onUnlock={openModal} />}

          {canceled && !error ? (
            <p className="mt-3 rounded-md border border-[#ead3a1] bg-white px-3 py-2 text-xs text-[#6e4f1e]">
              Checkout was canceled. The preview is still here.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">{error}</p>
          ) : null}
        </section>
      </section>

      <UpgradeModal
        open={modalOpen}
        featureTitle={activeUnlock.title}
        featureDescription={activeUnlock.description}
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
