import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SERVICE_ITEMS = [
  {
    title: "Red Flag Spotting",
    body: "Catch risky clauses early so you can negotiate from a safer position.",
    icon: "/graphics/icon-shield.svg",
  },
  {
    title: "Earnings Protection",
    body: "Surface payment, cancellation, and rights terms that impact your income.",
    icon: "/graphics/icon-search.svg",
  },
  {
    title: "IP Protection",
    body: "Understand ownership terms before your contract is locked in.",
    icon: "/graphics/icon-doc.svg",
  },
] as const;

const PRICING = [
  {
    name: "Core",
    price: "$29",
    popular: false,
    color: "bg-[#35b8b1] text-white",
    legalPackage: "Issue Spotting Brief",
    attorneyCost: "$400-$900",
    attorneyScope: "Often comparable to a short paid consult and first-pass issue list.",
    items: [
      "Initial issue spotting summary",
      "Priority clause risks highlighted",
      "Simple sign-or-negotiate guidance",
    ],
  },
  {
    name: "Report",
    price: "$79",
    popular: true,
    color: "bg-[var(--pt-accent)] text-white",
    legalPackage: "Review Memorandum",
    attorneyCost: "$900-$1,800",
    attorneyScope: "Often comparable to a written clause-by-clause attorney memo.",
    items: [
      "Everything in Core",
      "Expanded red-flag analysis",
      "Clause-by-clause plain-English breakdown",
      "Negotiation talking points",
    ],
  },
  {
    name: "Protect",
    price: "$149",
    popular: false,
    color: "bg-[var(--pt-teal-deep)] text-white",
    legalPackage: "Negotiation Prep Package",
    attorneyCost: "$1,800-$3,500+",
    attorneyScope: "Often comparable to deeper revision notes and negotiation prep support.",
    items: [
      "Everything in Report",
      "Fallback clause language options",
      "Structured action plan",
      "Negotiation-ready email draft",
    ],
  },
] as const;

const SOCIAL_PLATFORMS = [
  { label: "YouTube", icon: "/graphics/social-youtube.svg" },
  { label: "Twitch", icon: "/graphics/social-twitch.svg" },
  { label: "TikTok", icon: "/graphics/social-tiktok.svg" },
  { label: "Instagram", icon: "/graphics/social-instagram.svg" },
] as const;

export const metadata: Metadata = {
  title: "PlainTerms - Contract Analysis for Creators",
  description:
    "Upload any creator agreement and get plain-English contract guidance in minutes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PlainTerms - Contract Analysis for Creators",
    description:
      "Upload any creator agreement and get plain-English contract guidance in minutes.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms - Contract Analysis for Creators",
    description:
      "Upload any creator agreement and get plain-English contract guidance in minutes.",
  },
};

export default function HomePage() {
  return (
    <main className="px-5 pb-12 pt-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr] lg:items-stretch">
          <article className="pt-card h-full overflow-hidden">
            <div className="grid h-full lg:grid-cols-2">
              <div className="flex h-full flex-col bg-[var(--pt-accent)] p-8 text-[var(--pt-accent-ink)] sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#ffe8df]">
                  PlainTerms
                </p>
                <h1 className="mt-8 text-3xl leading-tight sm:text-4xl lg:text-[2.65rem]">
                  Get detailed contract analysis at a fraction of the cost of a lawyer.
                </h1>
                <p className="mt-5 max-w-xs text-base text-[#ffe8df]">
                  Contract review built for creators. Understand your rights and protect your work.
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
                  <Link
                    href="/analyze"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-[#e3b4a7] bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-[#6f2f20]! transition-colors hover:bg-white sm:w-[250px]"
                  >
                    Get My Contract Reviewed
                  </Link>
                  <Link
                    href="/sample-report"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-[#e7bfb3] bg-[#f48b72] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ee7a5e] sm:w-[250px]"
                  >
                    See Sample Report
                  </Link>
                </div>
              </div>

              <div className="relative min-h-[280px] overflow-hidden bg-[var(--pt-surface-soft)] sm:min-h-[340px] lg:min-h-0">
                <div className="pointer-events-none absolute -left-12 top-8 h-48 w-48 rounded-full bg-[#ffd173]/28 blur-2xl" />
                <div className="pointer-events-none absolute -right-14 bottom-[-40px] h-56 w-56 rounded-full bg-[#f39a63]/24 blur-2xl" />
                <div className="pointer-events-none absolute right-5 top-5 z-20 hidden rounded-full border border-[var(--pt-border)] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pt-muted)] backdrop-blur lg:block">
                  Identify Red-flags
                </div>
                <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden rounded-xl border border-[var(--pt-border)] bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--pt-ink)] shadow-[0_10px_20px_-16px_rgba(31,43,61,0.6)] backdrop-blur lg:block">
                  Secure upload
                </div>
                <div className="pointer-events-none absolute bottom-5 right-5 z-20 hidden rounded-xl border border-[var(--pt-border)] bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--pt-ink)] shadow-[0_10px_20px_-16px_rgba(31,43,61,0.6)] backdrop-blur lg:block">
                  Plain-English summary
                </div>
                <Image
                  src="/graphics/creator-studio-1.png"
                  alt="Creator studio illustration"
                  fill
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="relative z-10 object-contain scale-[1.02] sm:scale-[1.12] lg:scale-[1.56]"
                  priority
                />
              </div>
            </div>
          </article>

          <aside id="sample-preview" className="pt-card h-full p-6">
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pt-muted)]">
                  Report preview
                </p>
                <span className="rounded-full bg-[var(--pt-surface-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--pt-muted)]">
                  Report $79
                </span>
              </div>

              <h2 className="text-3xl leading-tight text-[var(--pt-ink)]">
                Know exactly what to negotiate before you sign.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--pt-muted)]">
                A real look at what you get before you buy.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Summary", "Insights", "Red Flags", "Key Terms", "Questions", "Full Report"].map((tab) => (
                  <span key={tab} className="rounded-full border border-[var(--pt-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--pt-muted)]">
                    {tab}
                  </span>
                ))}
              </div>

              <ul className="mt-3 space-y-1">
                {["Red flags", "Negotiation talking points", "Email draft included"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-[var(--pt-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-[#f2d3a2] bg-[#fff8eb] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8d6222]">Example red flag</p>
                  <p className="mt-1 text-sm font-semibold text-[#6f4c1b]">
                    Perpetual usage rights extend beyond campaign timeline.
                  </p>
                  <p className="mt-1 text-xs text-[#8d6222]/85">
                    Suggested fix: cap usage at 90 days with renewal by written consent.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="pt-card-soft p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Risk</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-[#ead3a1] bg-[#fff4df] px-2.5 py-1 text-[11px] font-semibold text-[#8c6526]">MEDIUM</span>
                      <span className="text-sm font-semibold text-[var(--pt-ink)]">43/100</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
                      <div className="h-full rounded-full bg-[#d8a84b]" style={{ width: "43%" }} />
                    </div>
                  </div>
                  <div className="pt-card-soft p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Recommendation</p>
                    <span className="mt-2 inline-flex rounded-full border border-[#ead3a1] bg-[#fff4df] px-2.5 py-1 text-[11px] font-semibold text-[#8c6526]">Negotiate</span>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--pt-ink)]/85">Important terms need clarification or balancing before signing.</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-3 pt-5">
                <Link href="/analyze" className="pt-btn-primary inline-flex items-center px-5 py-2.5 text-sm font-semibold">
                  Start Review
                </Link>
                <Link href="/sample-report" className="pt-btn-secondary inline-flex items-center px-5 py-2.5 text-sm font-semibold">
                  Open Full Sample
                </Link>
              </div>
            </div>
          </aside>
        </section>

        <section className="pt-card p-7">
          <h2 className="text-center text-4xl text-[var(--pt-ink)]">Built for creators across a multitude of platforms</h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            {SOCIAL_PLATFORMS.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--pt-border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--pt-muted)]"
              >
                <Image src={item.icon} alt={item.label} width={20} height={20} className="h-5 w-5" />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="pt-card p-7">
          <h2 className="text-4xl text-[var(--pt-ink)]">How it works</h2>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">From upload to negotiation-ready in minutes.</p>
          <div className="mt-8">
            {/* Timeline connector row */}
            <div className="relative hidden sm:flex items-center justify-between px-[calc(100%/6)]">
              <div className="absolute left-[calc(100%/6)] right-[calc(100%/6)] top-1/2 h-px -translate-y-1/2 bg-[var(--pt-border)]" />
              {["01", "02", "03"].map((n) => (
                <div key={n} className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--pt-accent)] bg-white text-sm font-bold text-[var(--pt-accent)]">
                  {n}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload your contract",
                  body: "Securely upload any brand deal, sponsorship, or creator agreement in PDF or Word format.",
                },
                {
                  step: "02",
                  title: "Get your analysis in minutes",
                  body: "PlainTerms breaks down every clause in plain English, flags red flags, and scores overall risk.",
                },
                {
                  step: "03",
                  title: "Know what you're signing.",
                  body: "Walk into negotiations armed with talking points, fallback language, and a ready-to-send email draft.",
                },
              ].map((step) => (
                <article key={step.step} className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5 sm:text-center">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--pt-accent)] text-sm font-bold text-[var(--pt-accent)] sm:hidden">
                    {step.step}
                  </div>
                  <h3 className="text-xl text-[var(--pt-ink)]">{step.title}</h3>
                  <p className="mt-1 text-sm text-[var(--pt-muted)]">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="pt-card p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-4xl text-[var(--pt-ink)]">Pricing</h2>
              <p className="mt-2 text-sm text-[var(--pt-muted)]">
                Per-contract pricing, no subscription.
              </p>
            </div>
            <Link
              href="/analyze"
              className="pt-btn-primary inline-block px-6 py-3 text-sm font-semibold"
            >
              Start Review
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {PRICING.map((tier) => (
                <article
                  key={tier.name}
                  className={`flex h-full flex-col rounded-xl border bg-[var(--pt-surface)] p-5 lg:min-h-[430px] ${
                    tier.popular
                      ? "border-[var(--pt-accent)] shadow-[0_14px_20px_-14px_rgba(241,118,93,0.45)]"
                      : "border-[var(--pt-border)]"
                  }`}
                >
                  <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tier.color}`}>
                    {tier.popular ? "Most Popular" : "Single Payment"}
                  </span>
                  <p className="mt-3 text-2xl font-semibold text-[var(--pt-ink)]">{tier.name}</p>
                  <p className="mt-1 text-5xl leading-none text-[var(--pt-ink)]">{tier.price}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--pt-ink)]">{tier.legalPackage}</p>
                  <div className="mt-2 rounded-lg border border-dashed border-[var(--pt-border)] px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--pt-muted)]">
                      Typical lawyer cost:{" "}
                      <span className="font-semibold normal-case tracking-normal text-[var(--pt-ink)]">
                        {tier.attorneyCost}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--pt-muted)]">{tier.attorneyScope}</p>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-sm text-[var(--pt-muted)]">
                    {tier.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-5">
                    <Link
                      href="/analyze"
                      className={`block rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                        tier.popular ? "pt-btn-primary" : "pt-btn-secondary"
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <footer className="pt-card-soft px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--pt-muted)]">
              Informational analysis, not legal advice. Always consult a lawyer for high-stakes decisions.
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pt-muted)]">
              <Link
                href="/privacy"
                className="rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-1 transition-colors hover:text-[var(--pt-ink)]"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-1 transition-colors hover:text-[var(--pt-ink)]"
              >
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
