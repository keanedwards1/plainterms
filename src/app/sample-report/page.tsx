import type { Metadata } from "next";
import Link from "next/link";
import SampleReportTabsPreview from "@/components/SampleReportTabsPreview";

export const metadata: Metadata = {
  title: "Sample Report | PlainTerms",
  description: "See what the real PlainTerms report experience looks like before you buy.",
};

export default function SampleReportPage() {
  const tabs = ["Summary", "Insights", "Red Flags", "Key Terms", "Questions", "Full Report"];

  return (
    <main className="px-5 pb-12 pt-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="pt-card overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pt-muted)]">
                Sample report
              </p>
              <h1 className="mt-3 text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl">
                Get the clarity most creators pay a lawyer hundreds for.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--pt-muted)]">
                You get the same report structure as live paid results: At A Glance, Summary,
                Insights, Red Flags, Key Terms, Questions, and Full Report evidence.
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--pt-ink)]">
                Typical attorney review memo: ~$900–$1,800.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <span
                    key={tab}
                    className="rounded-full border border-[var(--pt-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--pt-muted)]"
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pt-muted)]">
                Contract snapshot
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--pt-ink)]">Influencer Campaign Agreement</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-[#efc1b6] bg-[#ffe8e3] px-3 py-2">
                  <p className="text-[11px] text-[#9e3f2d]">Risk</p>
                  <p className="text-lg font-semibold text-[#7f2e1f]">73/100</p>
                </div>
                <div className="rounded-md border border-[#ead3a1] bg-[#fff4df] px-3 py-2">
                  <p className="text-[11px] text-[#8c6526]">Recommendation</p>
                  <p className="text-sm font-semibold text-[#6e4f1e]">Negotiate</p>
                </div>
                <div className="rounded-md border border-[#b2ddd4] bg-[#e1f4ef] px-3 py-2">
                  <p className="text-[11px] text-[#1d655f]">Flags</p>
                  <p className="text-lg font-semibold text-[#154f4a]">4</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="pt-card p-4">
            <h2 className="text-xl text-[var(--pt-ink)]">At A Glance</h2>
            <SampleReportTabsPreview tabs={tabs} />

            <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
              Informational only. Not legal advice.
            </div>
          </aside>

          <section className="pt-card p-4">
            <h2 className="text-xl text-[var(--pt-ink)]">Summary</h2>
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

        <section className="pt-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pt-muted)]">
                Ready to run your own contract?
              </p>
              <h2 className="mt-2 text-3xl text-[var(--pt-ink)]">Get the full report in minutes.</h2>
              <p className="mt-2 text-sm text-[var(--pt-muted)]">
                Upload once. Get clear risk visibility and negotiation-ready guidance.
              </p>
            </div>
            <Link href="/analyze" className="pt-btn-primary inline-flex items-center px-6 py-3 text-sm font-semibold">
              Start My Review
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
