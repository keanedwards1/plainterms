import type { Metadata } from "next";
import Link from "next/link";

const TIERS = [
  {
    name: "Scan",
    price: "$39",
    description: "Fast risk check before signing pressure.",
    bullets: ["Risk score", "Top red flags", "Plain-English summary"],
    bestFor: "Early-stage review when you need a quick read",
    featured: false,
  },
  {
    name: "Report",
    price: "$69",
    description: "Most selected for full clause visibility.",
    bullets: ["Everything in Scan", "Clause-by-clause breakdown", "Negotiation bullets"],
    bestFor: "Most contracts where you plan to negotiate",
    featured: true,
  },
  {
    name: "Protect",
    price: "$99",
    description: "Deep strategy and fallback language.",
    bullets: ["Everything in Report", "Advanced rewrites", "Fallback positions"],
    bestFor: "Higher-risk deals needing layered fallback strategy",
    featured: false,
  },
] as const;

const COMPARE_ROWS = [
  { feature: "Risk score + recommendation", scan: true, report: true, protect: true },
  { feature: "Top red flags", scan: true, report: true, protect: true },
  { feature: "Clause-by-clause breakdown", scan: false, report: true, protect: true },
  { feature: "Negotiation bullets", scan: false, report: true, protect: true },
  { feature: "Advanced rewrites and fallback positions", scan: false, report: false, protect: true },
] as const;

const INCLUDED = [
  "Secure file handling and precheck workflow",
  "Plain-English language style across outputs",
  "Result workspace with downloadable findings",
  "Time-limited result retention",
] as const;

export const metadata: Metadata = {
  title: "Pricing",
  description: "PlainTerms pricing tiers for contract analysis.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

        <header className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <p className="pt-kicker">Plan Options</p>
          <h1 className="mt-3 text-5xl text-[var(--pt-ink)]">Pricing</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--pt-muted)]">
            Pick the depth that matches your contract risk and how much negotiation support you need.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <article key={tier.name} className={tier.featured ? "shimmer-border" : ""}>
              <div className="pt-card h-full rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">{tier.name}</p>
                <p className="mt-2 text-6xl leading-none text-[var(--pt-ink)]">{tier.price}</p>
                <p className="mt-3 text-sm text-[var(--pt-muted)]">{tier.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-[var(--pt-muted)]">
                  {tier.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)]" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs uppercase tracking-widest text-[var(--pt-muted)]">Best for</p>
                <p className="mt-1 text-sm font-semibold text-[var(--pt-ink)]">{tier.bestFor}</p>
                <Link
                  href="/analyze"
                  className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                    tier.featured ? "pt-btn-primary" : "pt-btn-secondary"
                  }`}
                >
                  Start {tier.name}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <h2 className="text-3xl text-[var(--pt-ink)]">Feature Comparison</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[var(--pt-border)] px-3 py-3 text-left text-[var(--pt-muted)]">Feature</th>
                  <th className="border-b border-[var(--pt-border)] px-3 py-3 text-left text-[var(--pt-muted)]">Scan</th>
                  <th className="border-b border-[var(--pt-border)] px-3 py-3 text-left text-[var(--pt-muted)]">Report</th>
                  <th className="border-b border-[var(--pt-border)] px-3 py-3 text-left text-[var(--pt-muted)]">Protect</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td className="border-b border-[var(--pt-border)] px-3 py-3 text-[var(--pt-ink)]">{row.feature}</td>
                    <td className="border-b border-[var(--pt-border)] px-3 py-3 text-[var(--pt-muted)]">{row.scan ? "Included" : "-"}</td>
                    <td className="border-b border-[var(--pt-border)] px-3 py-3 text-[var(--pt-muted)]">{row.report ? "Included" : "-"}</td>
                    <td className="border-b border-[var(--pt-border)] px-3 py-3 text-[var(--pt-muted)]">{row.protect ? "Included" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="pt-card rounded-2xl p-5">
            <h2 className="text-3xl text-[var(--pt-ink)]">Included With Every Plan</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--pt-muted)]">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--pt-success)]" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="pt-card rounded-2xl p-5">
            <h2 className="text-3xl text-[var(--pt-ink)]">Need Help Choosing?</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--pt-muted)]">
              If you are reviewing a standard services agreement, start with Report. For high-risk,
              exclusive, or complex rights language, Protect usually offers the best leverage.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/analyze" className="pt-btn-success rounded-lg px-6 py-3 text-sm font-semibold">
                Analyze Contract
              </Link>
              <Link href="/faq" className="pt-btn-secondary rounded-lg px-6 py-3 text-sm font-semibold">
                Pricing FAQ
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
