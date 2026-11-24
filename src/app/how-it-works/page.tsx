import type { Metadata } from "next";
import Link from "next/link";
import HeroBubbles from "@/components/HeroBubbles";

const PRO_PRICE_LABEL = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "$5/month";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "No card needed",
    highlight: false,
    items: [
      "Full contract analysis in plain English",
      "Verdict, risk score and red flags",
      "Clause-by-clause breakdown",
      "Questions to ask and a negotiation email",
      "Documents saved for 30 days",
    ],
  },
  {
    name: "Pro",
    price: PRO_PRICE_LABEL,
    note: "Cancel anytime",
    highlight: true,
    items: [
      "Everything in Free",
      "Our most capable AI model",
      "Track changes and a clean revised draft",
      "Rewrite options and fallback positions",
      "Documents kept until you delete them",
    ],
  },
] as const;

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

const PROJECT_TYPES = [
  {
    label: "Kitchen & bath remodels",
    icon: (
      <svg {...ICON_PROPS}><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1.4" /><circle cx="15" cy="9" r="1.4" /><path d="M7 15h10" /></svg>
    ),
  },
  {
    label: "Home additions & ADUs",
    icon: (
      <svg {...ICON_PROPS}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>
    ),
  },
  {
    label: "General contractor agreements",
    icon: (
      <svg {...ICON_PROPS}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M9 12h6M9 16h4" /></svg>
    ),
  },
  {
    label: "Roofing & exterior work",
    icon: (
      <svg {...ICON_PROPS}><path d="M3 12l9-7 9 7" /><path d="M6 10v9h12v-9" /><path d="M16 6V4h2v3" /></svg>
    ),
  },
  {
    label: "Owner-builder subcontracts",
    icon: (
      <svg {...ICON_PROPS}><path d="M3 17a9 9 0 0 1 18 0z" /><path d="M9 8a3 3 0 0 1 6 0v2" /><path d="M2 17h20" /></svg>
    ),
  },
] as const;

export const metadata: Metadata = {
  title: "PlainTerms - Renovation Contract Review for Homeowners",
  description:
    "Upload your renovation or contractor agreement and get a plain-English breakdown of liens, deposits, change orders, and the terms you should negotiate — in minutes.",
  keywords: [
    "renovation contract review",
    "construction contract review",
    "contractor agreement review",
    "home remodel contract",
    "review my contractor's contract",
    "mechanics lien protection",
    "renovation contract red flags",
    "construction contract lawyer alternative",
    "remodeling contract analysis",
    "is my contractor's contract fair",
  ],
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "PlainTerms - Know What You're Signing",
    description:
      "Upload your renovation or contractor agreement and get a plain-English breakdown of liens, deposits, change orders, and the terms you should negotiate — in minutes.",
    url: "/how-it-works",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms - Know What You're Signing",
    description:
      "Upload your renovation or contractor agreement and get a plain-English breakdown of liens, deposits, change orders, and the terms you should negotiate — in minutes.",
  },
};

export default function HowItWorksPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "PlainTerms",
        url: "https://www.plainterms.us",
        description:
          "Plain-English review of home renovation, remodeling, and construction contracts for homeowners.",
      },
      {
        "@type": "Service",
        name: "Renovation Contract Review",
        serviceType: "Home renovation and construction contract review",
        provider: { "@type": "Organization", name: "PlainTerms", url: "https://www.plainterms.us" },
        areaServed: "US",
        description:
          "Upload a renovation or contractor agreement and get a plain-English breakdown of liens, deposits, change orders, warranties, and the terms to negotiate before you sign.",
        offers: [{ "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" }],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What does PlainTerms check in a renovation contract?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "PlainTerms reviews your home renovation or construction contract for risks like oversized deposits, missing mechanics-lien waivers, vague change-order terms, missing completion dates, uncapped allowances, and one-sided indemnification — then explains each in plain English with negotiation points.",
            },
          },
          {
            "@type": "Question",
            name: "How much does a renovation contract review cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "PlainTerms is free to use. Pro adds our most capable AI model, a revised draft with tracked changes, and long-term document history.",
            },
          },
          {
            "@type": "Question",
            name: "Is PlainTerms legal advice?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. PlainTerms is an informational tool that helps you understand your contract and spot risks before you sign. It is not a law firm and does not provide legal advice. For high-stakes decisions, consult a licensed attorney.",
            },
          },
          {
            "@type": "Question",
            name: "What contracts can I upload?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Any home renovation, remodeling, addition, or general-contractor agreement in PDF or Word format, or pasted as text — whether you hired a contractor or are managing the project as your own general contractor.",
            },
          },
        ],
      },
    ],
  };

  return (
    <main className="pt-page-pad pb-12 pt-8 3xl:pb-20 3xl:pt-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pt-container-wide space-y-10 3xl:space-y-16">
        <FocusedHero />

        <section className="pt-card p-7 3xl:p-12">
          <h2 className="text-center text-4xl text-[var(--pt-ink)] 3xl:text-5xl">Built for every kind of renovation contract</h2>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 3xl:mt-10 3xl:gap-6">
            {PROJECT_TYPES.map((type) => (
              <div
                key={type.label}
                className="flex flex-col items-center gap-3 rounded-xl border border-[var(--pt-border)] bg-white px-3 py-5 text-center"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--pt-accent)]/10 text-[var(--pt-accent)]">
                  {type.icon}
                </span>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">{type.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="pt-card p-7 3xl:p-12">
          <h2 className="text-4xl text-[var(--pt-ink)] 3xl:text-5xl">How it works</h2>
          <p className="mt-2 text-sm text-[var(--pt-muted)] 3xl:text-base 3xl:mt-3">From upload to negotiation-ready in minutes.</p>
          <div className="mt-8 3xl:mt-12">
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
            <div className="mt-6 grid gap-4 sm:grid-cols-3 3xl:gap-8">
              {[
                {
                  step: "01",
                  title: "Upload your contract",
                  body: "Drop in any renovation, remodeling, or contractor agreement as a PDF or Word file, or paste the text.",
                },
                {
                  step: "02",
                  title: "Get a verdict in seconds",
                  body: "A first read appears almost instantly, then our AI fills in every clause in plain English, flags red flags, and scores overall risk.",
                },
                {
                  step: "03",
                  title: "Know what you're signing.",
                  body: "Walk into negotiations armed with talking points, fallback language, and a ready-to-send email draft.",
                },
              ].map((step) => (
                <article key={step.step} className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5 sm:text-center 3xl:p-8">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--pt-accent)] text-sm font-bold text-[var(--pt-accent)] sm:hidden">
                    {step.step}
                  </div>
                  <h3 className="text-xl text-[var(--pt-ink)] 3xl:text-2xl">{step.title}</h3>
                  <p className="mt-1 text-sm text-[var(--pt-muted)] 3xl:text-base 3xl:mt-3">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="pt-card p-7 3xl:p-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-4xl text-[var(--pt-ink)] 3xl:text-5xl">Plans</h2>
              <p className="mt-2 text-sm text-[var(--pt-muted)] 3xl:text-base 3xl:mt-3">
                Start free. Upgrade when you want the deepest review.
              </p>
            </div>
            <Link href="/" className="pt-btn pt-btn-solid px-6 py-3 text-sm 3xl:px-8 3xl:py-4 3xl:text-base">
              Analyze a contract
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 3xl:mt-10 3xl:gap-8">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`flex h-full flex-col rounded-2xl border bg-[var(--pt-surface)] p-6 3xl:p-8 ${
                  plan.highlight ? "border-[var(--pt-action)] shadow-[0_18px_30px_-22px_rgba(194,74,53,0.55)]" : "border-[var(--pt-line)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-2xl font-semibold text-[var(--pt-ink)] 3xl:text-3xl">{plan.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--pt-muted)]">{plan.note}</p>
                </div>
                <p className="mt-2 text-4xl leading-none text-[var(--pt-ink)] 3xl:text-5xl">{plan.price}</p>
                <ul className="mt-5 space-y-2 text-[15px] text-[var(--pt-ink-soft)] 3xl:text-base">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--pt-good)]">
                        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <Link
                    href={plan.highlight ? "/dashboard/billing" : "/"}
                    className={`pt-btn w-full px-4 py-2.5 text-sm ${plan.highlight ? "pt-btn-solid" : "pt-btn-outline"}`}
                  >
                    {plan.highlight ? "Get Pro" : "Start free"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="pt-card-soft px-6 py-5 3xl:px-10 3xl:py-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--pt-muted)] 3xl:text-base">
              Informational analysis, not legal advice.
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

function FocusedHero() {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 w-screen overflow-hidden">
      {/* Decorative background layer */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Soft color blooms */}
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#f1765d]/22 blur-[90px] sm:h-[26rem] sm:w-[26rem]" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-[#24b4ae]/18 blur-[90px] sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-[#ffd173]/28 blur-[90px] sm:h-96 sm:w-96" />
        {/* Faint dot grid */}
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(83,99,120,0.16) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 78%)",
          }}
        />
      </div>

      {/* Interactive bubbles that drift and react to the cursor */}
      <HeroBubbles />

      {/* Content */}
      <div className="pt-page-pad relative flex min-h-[min(46rem,calc(100dvh-4rem))] flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--pt-accent)] 3xl:text-base">
          PlainTerms
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl lg:text-6xl 3xl:max-w-5xl 3xl:text-7xl">
          Know what you&apos;re signing before you sign it.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--pt-muted)] 3xl:max-w-2xl 3xl:text-xl">
          Upload your renovation or contractor agreement and know exactly what to watch for — liens, deposits, change orders — before you sign.
        </p>

        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row 3xl:mt-12">
          <Link
            href="/"
            className="pt-btn pt-btn-solid w-full rounded-lg px-6 py-4 text-base sm:w-auto sm:min-w-[260px] 3xl:py-5 3xl:text-lg"
          >
            Analyze a contract free
          </Link>
          <Link
            href="/sample-report"
            className="pt-btn-secondary inline-flex w-full items-center justify-center rounded-lg px-6 py-4 text-base font-semibold sm:w-auto sm:min-w-[260px] 3xl:py-5 3xl:text-lg"
          >
            See an example report
          </Link>
        </div>

        <p className="mt-9 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-[var(--pt-line)] bg-[var(--pt-surface)]/70 px-5 py-2.5 text-sm text-[var(--pt-muted)] backdrop-blur 3xl:text-base">
          <span className="font-semibold text-[var(--pt-ink)]">Free to use</span>
          <span aria-hidden="true">·</span>
          <span>Pro from {PRO_PRICE_LABEL}</span>
        </p>
      </div>
    </section>
  );
}
