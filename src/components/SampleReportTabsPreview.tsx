"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  tabs: string[];
};

type TabContent = {
  title: string;
  body: string;
  benefit: string;
};

const TAB_CONTENT: Record<string, TabContent> = {
  summary: {
    title: "Summary",
    body: "Get a quick readout of risk, recommendation, top next steps, and key flags.",
    benefit: "Use this first to decide whether to sign now or negotiate first.",
  },
  insights: {
    title: "Insights",
    body: "See cross-tab intelligence that connects risk posture, clause clarity, and evidence coverage.",
    benefit: "Spot hidden leverage fast without reading every clause line by line.",
  },
  red_flags: {
    title: "Red Flags",
    body: "Review high, medium, and low severity flags with plain-English explanations.",
    benefit: "Know exactly which clauses to challenge before signature.",
  },
  key_terms: {
    title: "Key Terms",
    body: "See clause-by-clause status for present, unclear, and missing terms.",
    benefit: "Catch costly omissions and ambiguity before they become problems.",
  },
  questions: {
    title: "Questions",
    body: "Get practical negotiation questions to ask in your next email or call.",
    benefit: "Move conversations forward with concrete asks instead of vague concerns.",
  },
  full_report: {
    title: "Full Report",
    body: "Access the full evidence-backed report with supporting details and source notes.",
    benefit: "Get complete context for stronger negotiation and cleaner final decisions.",
  },
};

function tabKey(tab: string): string {
  return tab.toLowerCase().replace(/\s+/g, "_");
}

export default function SampleReportTabsPreview({ tabs }: Props) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const current = useMemo(() => {
    if (!activeTab) return null;
    const key = tabKey(activeTab);
    return TAB_CONTENT[key] ?? null;
  }, [activeTab]);

  useEffect(() => {
    if (!activeTab) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveTab(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab]);

  return (
    <>
      <nav aria-label="Result sections" className="mt-3 space-y-2">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
              index === 0
                ? "border-[#de8f79] bg-[#ffe5dc] text-[#5a2f25]"
                : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[var(--pt-accent)] hover:text-[var(--pt-ink)]"
            }`}
            aria-label={`Preview ${tab} section details`}
          >
            <span>{tab}</span>
            <span className="inline-flex items-center gap-1">
              {tab === "Red Flags" && <span className="pt-pill !px-2 !py-0.5 !text-[10px]">4</span>}
              {tab === "Key Terms" && <span className="pt-pill !px-2 !py-0.5 !text-[10px]">9</span>}
              {tab === "Questions" && <span className="pt-pill !px-2 !py-0.5 !text-[10px]">3</span>}
              {tab === "Full Report" && <span className="pt-pill !px-2 !py-0.5 !text-[10px]">All</span>}
            </span>
          </button>
        ))}
      </nav>

      <p className="mt-2 text-xs text-[var(--pt-muted)]">
        Click any tab to see what that section unlocks in your interactive purchased report.
      </p>

      {activeTab && current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close preview modal"
            onClick={() => setActiveTab(null)}
            className="absolute inset-0 bg-[#1f2b3d]/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${current.title} preview`}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--pt-border)] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(31,43,61,0.45)]"
          >
            <p className="inline-flex items-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-1 text-sm font-bold uppercase tracking-[0.12em] text-[var(--pt-ink)]">
              Unlocked In Full Report
            </p>
            <h3 className="mt-2 text-2xl text-[var(--pt-ink)]">{current.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--pt-muted)]">{current.body}</p>
            <div className="mt-3 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-sm text-[var(--pt-ink)]">
              {current.benefit}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/analyze" className="pt-btn-primary inline-flex items-center px-5 py-2.5 text-sm font-semibold">
                Unlock My Report
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="pt-btn-secondary inline-flex items-center px-5 py-2.5 text-sm font-semibold"
              >
                Continue Preview
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
