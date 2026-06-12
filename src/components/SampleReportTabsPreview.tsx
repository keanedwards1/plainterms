"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import { type ReportTierOption } from "@/lib/pricingOptions";

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

const LOCAL_STORAGE_REPORT_TIER_KEY = "pt.reportTier";

const PREVIEW_TABS: PreviewTab[] = [
  {
    key: "summary",
    label: "Summary",
    icon: "/window.svg",
    unlockTitle: "Unlock the full summary",
    unlockDescription:
      "See the complete risk readout, recommendation rationale, and every prioritized next step for your own contract.",
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
    count: 4,
    unlockTitle: "Unlock all red flags",
    unlockDescription:
      "Review every high, medium, and low severity flag with plain-English explanations and what to challenge.",
  },
  {
    key: "terms",
    label: "Key Terms",
    icon: "/file.svg",
    count: 9,
    unlockTitle: "Unlock the full clause breakdown",
    unlockDescription:
      "See clause-by-clause status for present, unclear, and missing terms before you sign.",
  },
  {
    key: "questions",
    label: "Questions",
    icon: "/globe.svg",
    count: 3,
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

function LockedTease({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[2px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_94%)]">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pt-border)] bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--pt-ink)] shadow-sm">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
            <path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Locked — choose a plan to unlock
        </span>
      </div>
    </div>
  );
}

const TAB_PREVIEW_CONTENT: Record<PreviewTabKey, ReactNode> = {
  summary: (
    <div className="space-y-3">
      <article className="overflow-hidden rounded-lg border border-[var(--pt-border)] bg-gradient-to-r from-[#fff4ef] via-[#fff9f6] to-[#fff2dc] p-4">
        <p className="text-sm font-semibold text-[var(--pt-ink)]">Top Next Steps</p>
        <ul className="mt-2 space-y-2 text-sm text-[var(--pt-ink)]/90">
          <li className="rounded-md border border-[var(--pt-border)] bg-white px-3 py-2">
            Cap usage to 90 days and require written renewal.
          </li>
          <li className="rounded-md border border-[var(--pt-border)] bg-white px-3 py-2">
            Add net-15 payment terms plus late-fee language.
          </li>
        </ul>
      </article>

      <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
        <p className="text-sm font-semibold text-[var(--pt-ink)]">Top Flags Preview</p>
        <div className="mt-2 space-y-2">
          <div className="rounded-md border border-[var(--pt-border)] bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-[var(--pt-ink)]">Perpetual content license</p>
              <span className="rounded-full bg-[#ffe8e3] px-2 py-1 text-[11px] font-semibold text-[#9e3f2d]">high</span>
            </div>
            <p className="mt-1 text-xs text-[var(--pt-muted)]">
              Why it matters: it can block future exclusivity deals.
            </p>
          </div>
          <div className="rounded-md border border-[var(--pt-border)] bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-[var(--pt-ink)]">Late payment protection missing</p>
              <span className="rounded-full bg-[#fff4df] px-2 py-1 text-[11px] font-semibold text-[#8c6526]">medium</span>
            </div>
            <p className="mt-1 text-xs text-[var(--pt-muted)]">
              Why it matters: slower collections and weaker enforcement.
            </p>
          </div>
        </div>
      </article>
    </div>
  ),
  insights: (
    <LockedTease>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Clause coverage", value: "64%" },
            { label: "Evidence coverage", value: "58%" },
            { label: "Unclear terms", value: "3" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pt-muted)]">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--pt-ink)]">{metric.value}</p>
            </div>
          ))}
        </div>
        <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Where your leverage is</p>
          <p className="mt-2 text-sm leading-6 text-[var(--pt-ink)]/85">
            Two high-severity flags trace back to the same licensing clause, and the payment section
            has no enforcement language. Pushing on those two items moves the risk score down the
            fastest with the least friction.
          </p>
        </article>
      </div>
    </LockedTease>
  ),
  flags: (
    <LockedTease>
      <div className="space-y-2">
        {[
          { title: "Perpetual content license", severity: "high", cls: "bg-[#ffe8e3] text-[#9e3f2d]", note: "Grants indefinite reuse of your content with no end date or renewal gate." },
          { title: "Late payment protection missing", severity: "medium", cls: "bg-[#fff4df] text-[#8c6526]", note: "No interest, late fee, or net-term language to enforce on-time payment." },
          { title: "Broad indemnification", severity: "medium", cls: "bg-[#fff4df] text-[#8c6526]", note: "You cover the other side's legal costs across an unusually wide range of claims." },
          { title: "Termination notice imbalance", severity: "low", cls: "bg-[#e1f4ef] text-[#1d655f]", note: "Counterparty can exit on shorter notice than you can." },
        ].map((flag) => (
          <div key={flag.title} className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-[var(--pt-ink)]">{flag.title}</p>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${flag.cls}`}>{flag.severity}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--pt-muted)]">Why it matters: {flag.note}</p>
          </div>
        ))}
      </div>
    </LockedTease>
  ),
  terms: (
    <LockedTease>
      <div className="space-y-2">
        {[
          { term: "Payment schedule", status: "present", cls: "bg-[#e1f4ef] text-[#1d655f]" },
          { term: "Content usage rights", status: "unclear", cls: "bg-[#fff4df] text-[#8c6526]" },
          { term: "Termination for convenience", status: "missing", cls: "bg-[#ffe8e3] text-[#9e3f2d]" },
          { term: "Confidentiality", status: "present", cls: "bg-[#e1f4ef] text-[#1d655f]" },
          { term: "Indemnification", status: "unclear", cls: "bg-[#fff4df] text-[#8c6526]" },
          { term: "Limitation of liability", status: "missing", cls: "bg-[#ffe8e3] text-[#9e3f2d]" },
        ].map((row) => (
          <div key={row.term} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--pt-ink)]">{row.term}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.cls}`}>{row.status}</span>
          </div>
        ))}
      </div>
    </LockedTease>
  ),
  questions: (
    <LockedTease>
      <ol className="space-y-2">
        {[
          "Can we cap the content license to 90 days with an opt-in renewal in writing?",
          "Will you add net-15 payment terms with a late fee after 30 days?",
          "Can indemnification be limited to claims arising from each party's own breach?",
        ].map((q, idx) => (
          <li key={q} className="flex gap-3 rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5 text-sm text-[var(--pt-ink)]/90">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--pt-surface-soft)] text-xs font-semibold text-[var(--pt-ink)]">
              {idx + 1}
            </span>
            <span>{q}</span>
          </li>
        ))}
      </ol>
    </LockedTease>
  ),
  document: (
    <LockedTease>
      <article className="overflow-hidden rounded-lg border border-[var(--pt-border)] shadow-sm">
        <div className="max-h-[360px] overflow-hidden bg-[#f0ede8] px-3 py-6 sm:px-8">
          <div
            className="mx-auto max-w-[680px] rounded-sm bg-white px-8 py-10 text-[15px] leading-[1.85] text-[#252830] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <p>
              The Creator hereby grants the Brand a{" "}
              <span className="rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]">perpetual, irrevocable</span>{" "}
              license to use, reproduce, and modify the Content across all media now known or later developed.
            </p>
            <p className="mt-4">
              Payment shall be made{" "}
              <span className="rounded-[2px] bg-[#fff4df] px-[1px] text-[#8c6526]">within a reasonable period</span>{" "}
              following delivery and acceptance of the Content by the Brand.
            </p>
          </div>
        </div>
      </article>
    </LockedTease>
  ),
  full: (
    <LockedTease>
      <div className="space-y-2">
        {[
          "Executive summary with risk score and recommendation",
          "Every red flag with severity and plain-English notes",
          "Full clause-by-clause breakdown with evidence",
          "Negotiation questions and email draft",
          "Source map linking findings to document text",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5 text-sm text-[var(--pt-ink)]/90">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e1f4ef] text-[#1d655f]">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3">
                <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {item}
          </div>
        ))}
      </div>
    </LockedTease>
  ),
};

const REDIRECT_STEPS = ["Saving your selection", "Opening secure upload"];

export default function SampleReportTabsPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTabKey>("summary");
  const [modalTab, setModalTab] = useState<PreviewTab | null>(null);
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);

  const current = useMemo(
    () => PREVIEW_TABS.find((tab) => tab.key === activeTab) ?? PREVIEW_TABS[0],
    [activeTab]
  );

  function selectTab(tab: PreviewTab) {
    setActiveTab(tab.key);
    setModalTab(tab);
  }

  function chooseTier(tier: ReportTierOption) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_REPORT_TIER_KEY, tier);
    } catch {
      // Ignore storage failures; the analyze page still works without a preselection.
    }

    setProcessing({
      tier,
      stepNames: REDIRECT_STEPS,
      stepIndex: 0,
      stepLabel: REDIRECT_STEPS[0],
      stepDescription: "Carrying your plan choice to the secure upload page.",
    });

    window.setTimeout(() => {
      setProcessing({
        tier,
        stepNames: REDIRECT_STEPS,
        stepIndex: 1,
        stepLabel: REDIRECT_STEPS[1],
        stepDescription: "Upload your contract to generate a real, private analysis.",
      });
      window.setTimeout(() => {
        window.location.assign("/analyze");
      }, 450);
    }, 500);
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="pt-card p-4">
          <h2 className="text-xl text-[var(--pt-ink)]">At A Glance</h2>

          <nav aria-label="Sample result sections" className="mt-3 space-y-2">
            {PREVIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "border-[#de8f79] bg-[#ffe5dc] text-[#5a2f25] shadow-[inset_0_0_0_1px_rgba(222,143,121,0.15)]"
                    : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[#de8f79] hover:text-[var(--pt-ink)]"
                }`}
                aria-label={`Preview ${tab.label} section`}
              >
                <span className="flex items-center gap-2">
                  <Image src={tab.icon} alt="" width={16} height={16} className="h-4 w-4" />
                  <span>{tab.label}</span>
                </span>
                {tab.count !== undefined ? (
                  <span className="pt-pill !px-2 !py-0.5 !text-[10px]">{tab.count === "all" ? "All" : tab.count}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-4 space-y-3">
            <div className="pt-card-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Risk</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="rounded-full border border-[#efc1b6] bg-[#ffe8e3] px-2.5 py-1 text-[11px] font-semibold text-[#9e3f2d]">HIGH</span>
                <span className="text-sm font-semibold text-[var(--pt-ink)]">73/100</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
                <div className="h-full rounded-full bg-[#e7745c]" style={{ width: "73%" }} />
              </div>
            </div>

            <div className="pt-card-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Recommendation</p>
              <span className="mt-2 inline-flex rounded-full border border-[#ead3a1] bg-[#fff4df] px-2.5 py-1 text-[11px] font-semibold text-[#8c6526]">
                Negotiate
              </span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--pt-ink)]/85">
                Several clauses shift risk toward you. Push on the licensing and payment terms before signing.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
            Informational only. Not legal advice.
          </div>
        </aside>

        <section className="pt-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl text-[var(--pt-ink)]">{current.label}</h2>
            <span className="inline-flex items-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pt-muted)]">
              Sample preview
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--pt-muted)]">
            This is sample data. Click any tab to unlock the full version for your own contract.
          </p>
          <div className="mt-3">{TAB_PREVIEW_CONTENT[activeTab]}</div>
        </section>
      </section>

      <UpgradeModal
        open={modalTab !== null}
        featureTitle={modalTab?.unlockTitle ?? ""}
        featureDescription={modalTab?.unlockDescription ?? ""}
        ctaPrefix="Get started with"
        processing={processing}
        onSelectTier={chooseTier}
        onClose={() => setModalTab(null)}
      />
    </>
  );
}
