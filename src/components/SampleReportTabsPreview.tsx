"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  REPORT_TIER_DESCRIPTIONS,
  REPORT_TIER_NAMES,
  REPORT_TIER_OPTIONS,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";

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

export default function SampleReportTabsPreview() {
  const [unlockTab, setUnlockTab] = useState<PreviewTab | null>(null);

  useEffect(() => {
    if (!unlockTab) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setUnlockTab(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unlockTab]);

  function chooseTier(tier: ReportTierOption) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_REPORT_TIER_KEY, tier);
    } catch {
      // Ignore storage failures; the analyze page still works without a preselection.
    }
    window.location.assign("/analyze");
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
                <span className="rounded-full border border-[#efc1b6] bg-[#ffe8e3] px-2.5 py-1 text-[11px] font-semibold text-[#9e3f2d]">
                  HIGH
                </span>
                <span className="text-sm font-semibold text-[var(--pt-ink)]">73/100</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
                <div className="h-full rounded-full bg-[#e7745c]" style={{ width: "73%" }} />
              </div>
            </div>

            <div className="pt-card-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                Recommendation
              </p>
              <span className="mt-2 inline-flex rounded-full border border-[#ead3a1] bg-[#fff4df] px-2.5 py-1 text-[11px] font-semibold text-[#8c6526]">
                Negotiate
              </span>
              <p className="mt-2 text-sm leading-relaxed text-[var(--pt-ink)]/85">
                Several clauses shift risk toward you. Push on the licensing and payment terms
                before signing.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
            Informational only. Not legal advice.
          </div>
        </aside>

        <section className="pt-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl text-[var(--pt-ink)]">Summary</h2>
            <span className="inline-flex items-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pt-muted)]">
              Sample preview
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--pt-muted)]">
            Click any tab to unlock the rest of your purchased report.
          </p>

          <div className="mt-3 space-y-3">
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
                    <span className="rounded-full bg-[#ffe8e3] px-2 py-1 text-[11px] font-semibold text-[#9e3f2d]">
                      high
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--pt-muted)]">
                    Why it matters: it can block future exclusivity deals.
                  </p>
                </div>
                <div className="rounded-md border border-[var(--pt-border)] bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[var(--pt-ink)]">Late payment protection missing</p>
                    <span className="rounded-full bg-[#fff4df] px-2 py-1 text-[11px] font-semibold text-[#8c6526]">
                      medium
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--pt-muted)]">
                    Why it matters: slower collections and weaker enforcement.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </section>

      {unlockTab ? (
        <div className="fixed bottom-5 left-1/2 z-[200] w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-[var(--pt-border)] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(31,43,61,0.55)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--pt-ink)]">{unlockTab.unlockTitle}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--pt-muted)]">
                {unlockTab.unlockDescription}
              </p>
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
            {REPORT_TIER_OPTIONS.map((tier) => (
              <button
                key={`unlock-${tier}`}
                type="button"
                onClick={() => chooseTier(tier)}
                className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2.5 text-left transition-colors hover:border-[var(--pt-accent)]"
                title={REPORT_TIER_DESCRIPTIONS[tier]}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">
                    {REPORT_TIER_NAMES[tier]}
                  </span>
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">
                    {REPORT_TIER_PRICES[tier]}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-[var(--pt-muted)]">
                  {REPORT_TIER_DESCRIPTIONS[tier]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
