import type { Metadata } from "next";
import Link from "next/link";

const PROCESS_STEPS = [
  {
    id: "01",
    icon: "UP",
    title: "Upload",
    body: "Drop in your contract PDF or DOCX and we secure it before processing starts.",
  },
  {
    id: "02",
    icon: "RV",
    title: "Review",
    body: "Structured review logic highlights red flags, risky language, and negotiation leverage.",
  },
  {
    id: "03",
    icon: "GO",
    title: "Act",
    body: "Get plain-English guidance and talking points before you sign.",
  },
] as const;

const PRICING_TIERS = [
  {
    name: "Scan",
    price: "$39",
    kicker: "Fast check",
    description: "Quick pass before signing pressure gets real.",
    features: [
      "Risk score and recommendation",
      "Top red flags surfaced",
      "Plain-English summary",
      "Best for first-pass review",
    ],
    popular: false,
  },
  {
    name: "Report",
    price: "$69",
    kicker: "Most popular",
    description: "The full report plus what to change and why.",
    features: [
      "Everything in Scan",
      "Top 15 red flags expanded",
      "Clause-by-clause breakdown",
      "10 to 15 negotiation tips",
      "6 clause suggestions",
    ],
    popular: true,
  },
  {
    name: "Protect",
    price: "$99",
    kicker: "Power users",
    description: "Deep fallback strategy for high-risk agreements.",
    features: [
      "Everything in Report",
      "Advanced clause rewrites",
      "Fallback positions",
      "Negotiation sequence plan",
      "Extended follow-up Q&A",
    ],
    popular: false,
  },
] as const;

export const metadata: Metadata = {
  title: "PlainTerms - Contract Analysis for Creators",
  description:
    "Upload any brand deal, management agreement, or licensing contract. Get a plain-English risk report with negotiation tips in under 5 minutes.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PlainTerms - Contract Analysis for Creators",
    description:
      "Upload any brand deal, management agreement, or licensing contract. Get a plain-English risk report with negotiation tips in under 5 minutes.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms - Contract Analysis for Creators",
    description:
      "Upload any brand deal, management agreement, or licensing contract. Get a plain-English risk report with negotiation tips in under 5 minutes.",
  },
};

export default function HomePage() {
  return (
    <main className="w-full">
      <section className="relative overflow-hidden border-b border-[var(--pt-border)] px-5 pb-14 pt-12 sm:px-8 lg:px-12">
        <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[var(--pt-accent)]/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-28 h-72 w-72 rounded-full bg-[#9db6cb]/18 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="rise-in">
            <p className="pt-kicker">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)]" />
              Built for creators and founders
            </p>

            <h1 className="mt-5 text-5xl leading-[0.98] text-[var(--pt-ink)] sm:text-6xl lg:text-[4.5rem]">
              Contracts made
              <br />
              <span className="text-[var(--pt-accent)]">
                clear and actionable.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--pt-muted)]">
              PlainTerms translates legal language into plain guidance so you know what to
              negotiate before you sign.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/analyze"
                className="pt-btn-primary rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                Get My Contract Reviewed
              </Link>
              <Link
                href="/result/demo_1770094351605_2needzk2"
                className="pt-btn-secondary rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                See Real Sample
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--pt-muted)]">
              {["Encrypted upload", "No account needed", "Under 5 minutes"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-1.5"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <aside className="pt-card scan-line rise-in rise-in-delay-1 relative overflow-hidden rounded-[24px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pt-muted)]">
                Sample report preview
              </p>
              <span className="rounded-full bg-[var(--pt-surface-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--pt-muted)]">
                Report $69
              </span>
            </div>
            <p className="mb-3 text-xs text-[var(--pt-muted)]">
              This is an example of what your contract summary looks like after checkout.
            </p>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                  Contract summary
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--pt-ink)]">
                  Influencer Campaign Agreement
                </p>
                <p className="text-xs text-[var(--pt-muted)]">Creator x Agency</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7d6bc]">
                  <div className="h-full w-[73%] rounded-full bg-[var(--pt-accent)]" />
                </div>
                <p className="mt-1 text-xs font-semibold text-[var(--pt-muted)]">Risk score 73 / 100</p>
              </div>

              <div className="rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                  Top red flags
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--pt-muted)]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#ea5a45]" />
                    Perpetual usage rights extend beyond campaign timeline.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#dca440]" />
                    Late fee clause missing from payment section.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#bfd8d2] bg-[#edf7f4] px-4 py-3 text-sm text-[#335f5a]">
                <p className="font-semibold text-[#214c48]">Action plan</p>
                <p className="mt-1">Ask for a 90-day usage limit and payment due date penalties.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl text-[var(--pt-ink)] sm:text-[2.05rem]">Simple 3-step flow</h2>
            <p className="max-w-md text-sm text-[var(--pt-muted)]">
              One focused workflow: upload, review, negotiate from a position of clarity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {PROCESS_STEPS.map((step) => (
              <article key={step.id} className="pt-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-xs font-bold tracking-[0.14em] text-[var(--pt-ink)]">
                    {step.icon}
                  </span>
                  <span className="rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--pt-muted)]">
                    {step.id}
                  </span>
                </div>
                <h3 className="mt-3 text-2xl text-[var(--pt-ink)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--pt-muted)]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--pt-border)] bg-[var(--pt-surface)] px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl text-[var(--pt-ink)] sm:text-[2.05rem]">Pick your depth. Pay once.</h2>
            <p className="max-w-md text-sm text-[var(--pt-muted)]">
              The Report tier is the full experience and best fit for most creator contracts.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-[var(--pt-border)] bg-[color-mix(in_oklab,var(--pt-surface-soft)_70%,white_30%)] px-4 py-3 text-sm text-[var(--pt-muted)]">
            <p className="font-semibold text-[var(--pt-ink)]">Cost context</p>
            <p className="mt-1">
              Traditional attorney contract review often starts in the hundreds and can run higher
              with revisions. PlainTerms starts at $39 for structured issue spotting and guidance.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <article key={tier.name} className={tier.popular ? "shimmer-border" : ""}>
                <div
                  className={`relative rounded-[24px] bg-[var(--pt-surface)] p-6 ${
                    tier.popular ? "" : "border border-[var(--pt-border)]"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--pt-muted)]">
                    {tier.kicker}
                  </p>
                  <h3 className="mt-1 text-3xl text-[var(--pt-ink)]">{tier.name}</h3>
                  <p
                    className="mt-1 text-5xl leading-none text-[var(--pt-ink)]"
                    style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                  >
                    {tier.price}
                  </p>
                  <p className="mt-2 text-sm text-[var(--pt-muted)]">{tier.description}</p>

                  <ul className="mt-4 space-y-2 text-sm text-[var(--pt-muted)]">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-[0.2rem] inline-block h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/analyze"
                    className={`mt-6 block rounded-full px-4 py-3 text-center text-sm font-semibold ${
                      tier.popular ? "pt-btn-primary" : "pt-btn-secondary"
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-[var(--pt-muted)]">
          <p>PlainTerms is informational only and not legal advice.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition hover:text-[var(--pt-ink)]">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-[var(--pt-ink)]">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
