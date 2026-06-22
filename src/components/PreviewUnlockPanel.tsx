"use client";

import { useState } from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import ReportSidebar from "@/components/result/ReportSidebar";
import QuickReadout from "@/components/result/QuickReadout";
import ContractHealthSnapshot from "@/components/result/ContractHealthSnapshot";
import LockedSummarySection from "@/components/result/LockedSummarySection";
import { type ReportTierOption } from "@/lib/pricingOptions";
import { TAB_CLICK_OPENS_MODAL } from "@/lib/previewConfig";

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
  summary:   { title: "Unlock the full summary",          description: "See every prioritized next step, full flag list, and actionable guidance for this contract." },
  insights:  { title: "Unlock cross-tab insights",        description: "Connect risk posture, clause clarity, and evidence coverage to spot hidden leverage fast." },
  flags:     { title: "Unlock all red flags",             description: "Every high, medium, and low severity flag with plain-English notes on what each one means for you." },
  terms:     { title: "Unlock the full clause breakdown", description: "Clause-by-clause status for present, unclear, and missing terms before you sign." },
  questions: { title: "Unlock negotiation questions",     description: "Practical, ready-to-send questions to move your next email or call forward." },
  document:  { title: "Unlock document review",          description: "Source text with inline callouts, tracked changes, and revised wording where available." },
  full:      { title: "Unlock the full evidence-backed report", description: "Complete context with supporting details and source notes for stronger negotiation." },
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

// ─── Placeholder shapes (no real data) ────────────────────────────────────────

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
          <div className="flex-1"><div className="h-3 w-2/3 rounded bg-[#e6d8c3]" /></div>
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

// ─── Teaser stat banners (real counts, no detailed content) ───────────────────

function TeaserBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-[var(--pt-border)] bg-gradient-to-r from-[#fff4ef] via-[#fff9f6] to-[#fff2dc] px-4 py-3">
      {children}
    </div>
  );
}

function StatPill({ label, value, color = "red" }: { label: string; value: string | number; color?: "red" | "amber" | "teal" }) {
  const cls = {
    red:   "border-[#efc1b6] bg-[#ffe8e3] text-[#7f2e1f]",
    amber: "border-[#ead3a1] bg-[#fff4df] text-[#6e4f1e]",
    teal:  "border-[#b2ddd4] bg-[#e1f4ef] text-[#154f4a]",
  }[color];
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

// ─── Tab content components ────────────────────────────────────────────────────

type TabProps = {
  risk: { score: number; label: RiskLabel };
  redFlagCount: number;
  clauseCounts: { present: number; unclear: number; missing: number; total: number };
  onUnlock: () => void;
};

function SummaryTab({ risk, redFlagCount, clauseCounts, onUnlock }: TabProps) {
  const rec = deriveRecommendation(risk.label);
  return (
    <div className="space-y-3">
      <QuickReadout riskScore={risk.score} recommendationLabel={rec.text} flagsFound={redFlagCount} />
      <p className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs leading-5 text-[var(--pt-muted)]">
        This is your free estimate. The paid report is a deeper review and may refine this score.
      </p>
      <ContractHealthSnapshot riskScore={risk.score} clearClauseCount={clauseCounts.present} totalClauseCount={clauseCounts.total} />
      <LockedSummarySection title="Top Next Steps" onUnlock={onUnlock}>
        <PlaceholderList rows={3} />
      </LockedSummarySection>
      <LockedSummarySection title="Top Flags Preview" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={3} />
      </LockedSummarySection>
    </div>
  );
}

function InsightsTab({ risk, redFlagCount, clauseCounts, onUnlock }: TabProps) {
  const missingCount = clauseCounts.missing;
  return (
    <div className="space-y-3">
      <TeaserBanner>
        <p className="text-sm font-semibold text-[var(--pt-ink)]">Risk snapshot</p>
        <p className="mt-0.5 text-xs text-[var(--pt-muted)]">
          Your contract scored <strong>{risk.score}/100</strong> on risk with {redFlagCount} flags identified.
          {missingCount > 0 && <> <strong>{missingCount}</strong> standard protective clauses are missing entirely.</>}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatPill label="Risk score" value={risk.score} color="red" />
          <StatPill label="Flags found" value={redFlagCount} color="amber" />
          <StatPill label="Clauses missing" value={clauseCounts.missing} color="teal" />
        </div>
      </TeaserBanner>
      <LockedSummarySection title="Risk Breakdown" onUnlock={onUnlock}>
        <PlaceholderList rows={3} />
      </LockedSummarySection>
      <LockedSummarySection title="Coverage Gaps" onUnlock={onUnlock}>
        <PlaceholderList rows={4} />
      </LockedSummarySection>
    </div>
  );
}

function FlagsTab({ risk, redFlagCount, onUnlock }: TabProps) {
  const highEst = risk.label === "high" ? Math.ceil(redFlagCount * 0.5) : risk.label === "medium" ? Math.ceil(redFlagCount * 0.3) : Math.ceil(redFlagCount * 0.1);
  const highCount = Math.max(highEst, 1);
  const medCount = Math.max(redFlagCount - highCount - 1, 0);
  return (
    <div className="space-y-3">
      <TeaserBanner>
        <p className="text-sm font-semibold text-[var(--pt-ink)]">{redFlagCount} issues flagged</p>
        <p className="mt-0.5 text-xs text-[var(--pt-muted)]">
          Unlock to see exactly what each flag means for you and what to do about it.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatPill label="High severity" value={highCount} color="red" />
          <StatPill label="Medium" value={medCount} color="amber" />
          <StatPill label="Total" value={redFlagCount} color="teal" />
        </div>
      </TeaserBanner>
      <LockedSummarySection title="High Severity Flags" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={3} />
      </LockedSummarySection>
      <LockedSummarySection title="Medium &amp; Low Severity" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={4} />
      </LockedSummarySection>
    </div>
  );
}

function TermsTab({ clauseCounts, onUnlock }: TabProps) {
  return (
    <div className="space-y-3">
      <TeaserBanner>
        <p className="text-sm font-semibold text-[var(--pt-ink)]">{clauseCounts.total} clauses reviewed</p>
        <p className="mt-0.5 text-xs text-[var(--pt-muted)]">
          Unlock to see a plain-English breakdown of every term — present, unclear, or missing.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatPill label="Present" value={clauseCounts.present} color="teal" />
          <StatPill label="Unclear" value={clauseCounts.unclear} color="amber" />
          <StatPill label="Missing" value={clauseCounts.missing} color="red" />
        </div>
      </TeaserBanner>
      <LockedSummarySection title="Clause Breakdown" onUnlock={onUnlock}>
        <PlaceholderTermList rows={6} />
      </LockedSummarySection>
    </div>
  );
}

const PLACEHOLDER_QUESTIONS = [
  "What specific deliverables are included in the scope of work, and how are revisions handled?",
  "Under what circumstances can either party terminate this agreement early?",
  "How is intellectual property ownership assigned for work created during the engagement?",
  "What are the payment terms if a milestone is delayed on your end?",
];

function QuestionsTab({ redFlagCount, onUnlock }: TabProps) {
  const questionCount = Math.max(redFlagCount + 2, 4);
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--pt-ink)]">Questions to raise with the other party</p>
        <p className="mt-1 text-sm text-[var(--pt-muted)]">
          {questionCount} questions generated from your contract&apos;s risk areas. Unlock to see them in full — copy and send directly, or use the negotiation email draft.
        </p>
      </article>

      <LockedSummarySection title={`${questionCount} negotiation questions`} onUnlock={onUnlock}>
        <div className="space-y-2">
          {PLACEHOLDER_QUESTIONS.map((q, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-[11px] font-bold text-[var(--pt-muted)]">
                {idx + 1}
              </span>
              <span className="flex-1 text-[15px] leading-6 text-[var(--pt-ink)]">{q}</span>
              <svg className="mt-1 h-4 w-4 shrink-0 text-[var(--pt-muted)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>
      </LockedSummarySection>

      <LockedSummarySection title="Negotiation email draft" onUnlock={onUnlock}>
        <div className="rounded-lg border border-[var(--pt-border)] bg-white">
          <div className="border-b border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Subject</p>
            <div className="mt-1 h-4 w-2/3 rounded bg-[#e6d8c3]" />
          </div>
          <div className="space-y-2 p-3">
            <div className="h-3 w-full rounded bg-[#e6d8c3]" />
            <div className="h-3 w-11/12 rounded bg-[#ede6db]" />
            <div className="h-3 w-4/5 rounded bg-[#ede6db]" />
          </div>
        </div>
      </LockedSummarySection>
    </div>
  );
}

function DocumentTab({ clauseCounts, redFlagCount, onUnlock }: TabProps) {
  return (
    <div className="space-y-3">
      <LockedSummarySection title="Document review" onUnlock={onUnlock}>
        {/* Mirrors the real document tab: file toolbar + segmented control + document text */}
        <div className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="h-4 w-48 rounded bg-[#e6d8c3]" />
              <p className="mt-1 text-xs text-[var(--pt-muted)]">
                {redFlagCount} flagged passages · {clauseCounts.total} clauses reviewed
              </p>
            </div>
            <div className="flex items-center rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-[3px]">
              {["Original", "Track Changes", "Revised"].map((label) => (
                <span key={label} className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--pt-muted)] first:bg-white first:text-[var(--pt-ink)] first:shadow-sm">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <PlaceholderText lines={7} />
          </div>
        </div>
      </LockedSummarySection>
    </div>
  );
}

function FullReportTab({ risk, redFlagCount, clauseCounts, onUnlock }: TabProps) {
  return (
    <div className="space-y-3">
      <TeaserBanner>
        <p className="text-sm font-semibold text-[var(--pt-ink)]">Full evidence-backed report</p>
        <p className="mt-0.5 text-xs text-[var(--pt-muted)]">
          Every finding backed by source text. Risk score {risk.score}/100 · {redFlagCount} flags · {clauseCounts.total} clauses.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatPill label="Risk score" value={risk.score} color="red" />
          <StatPill label="Flags" value={redFlagCount} color="amber" />
          <StatPill label="Clauses" value={clauseCounts.total} color="teal" />
        </div>
      </TeaserBanner>
      <LockedSummarySection title="Executive Summary" onUnlock={onUnlock}>
        <PlaceholderText lines={5} />
      </LockedSummarySection>
      <LockedSummarySection title="Detailed Findings" onUnlock={onUnlock}>
        <PlaceholderFlagList rows={5} />
      </LockedSummarySection>
      <LockedSummarySection title="Supporting Evidence" onUnlock={onUnlock}>
        <PlaceholderText lines={6} />
      </LockedSummarySection>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PreviewUnlockPanel({
  resultId,
  previewAccessKey,
  canceled,
  risk,
  redFlagCount,
  clauseCounts,
}: PreviewUnlockPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTabKey>("summary");
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recommendation = deriveRecommendation(risk.label);
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

  const tabProps: TabProps = { risk, redFlagCount, clauseCounts, onUnlock: openModal };

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ReportSidebar
          tabs={TABS}
          activeKey={activeTab}
          onSelectTab={(key) => {
            setActiveTab(key as PreviewTabKey);
            if (TAB_CLICK_OPENS_MODAL && key !== "summary") setModalOpen(true);
          }}
          risk={risk}
          recommendation={{ label: recommendation.text, reason: recommendation.reason, tone: risk.label }}
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
            <button type="button" onClick={openModal} className="pt-btn-primary px-4 py-2 text-sm font-semibold">
              Unlock full report
            </button>
          </div>

          {activeTab === "summary"   && <SummaryTab   {...tabProps} />}
          {activeTab === "insights"  && <InsightsTab  {...tabProps} />}
          {activeTab === "flags"     && <FlagsTab     {...tabProps} />}
          {activeTab === "terms"     && <TermsTab     {...tabProps} />}
          {activeTab === "questions" && <QuestionsTab {...tabProps} />}
          {activeTab === "document"  && <DocumentTab  {...tabProps} />}
          {activeTab === "full"      && <FullReportTab {...tabProps} />}

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
        onClose={() => { setModalOpen(false); setError(null); }}
      />
    </>
  );
}
