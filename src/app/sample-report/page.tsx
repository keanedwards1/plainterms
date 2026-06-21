import type { Metadata } from "next";
import SampleReportTabsPreview from "@/components/SampleReportTabsPreview";

export const metadata: Metadata = {
  title: "Sample Report | PlainTerms",
  description: "See what the real PlainTerms report experience looks like before you buy.",
};

export default function SampleReportPage() {
  const tabs = ["Summary", "Insights", "Red Flags", "Key Terms", "Questions", "Full Report"];

  return (
    <main className="pt-page-pad pb-12 pt-8">
      <div className="pt-container-wide space-y-6">
        <section className="pt-card overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pt-muted)]">
                Sample report
              </p>
              <h1 className="mt-3 text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl">
                Get the clarity most homeowners pay a lawyer hundreds for.
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
              <p className="mt-2 text-lg font-semibold text-[var(--pt-ink)]">Home Renovation Agreement</p>
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

        <SampleReportTabsPreview />

      </div>
    </main>
  );
}
