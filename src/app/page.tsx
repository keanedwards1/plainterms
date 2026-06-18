import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HeroBubbles from "@/components/HeroBubbles";

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ hero?: string }>;
}) {
  const { hero } = await searchParams;
  const useFocusedHero = hero === "focused";

  return (
    <main className="pt-page-pad pb-12 pt-8 3xl:pb-20 3xl:pt-14">
      <div className="pt-container-wide space-y-10 3xl:space-y-16">
        {useFocusedHero ? <FocusedHero /> : <ClassicHero />}

        <section className="pt-card p-7 3xl:p-12">
          <h2 className="text-center text-4xl text-[var(--pt-ink)] 3xl:text-5xl">Built for creators across a multitude of platforms</h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 3xl:mt-8 3xl:gap-6">
            {SOCIAL_PLATFORMS.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--pt-border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--pt-muted)] 3xl:px-5 3xl:py-2.5 3xl:text-base"
              >
                <Image src={item.icon} alt={item.label} width={20} height={20} className="h-5 w-5" />
                {item.label}
              </span>
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

        <section id="pricing" className="pt-card p-7 3xl:p-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-4xl text-[var(--pt-ink)] 3xl:text-5xl">Pricing</h2>
              <p className="mt-2 text-sm text-[var(--pt-muted)] 3xl:text-base 3xl:mt-3">
                Per-contract pricing, no subscription.
              </p>
            </div>
            <Link
              href="/analyze"
              className="pt-btn-primary inline-block px-6 py-3 text-sm font-semibold 3xl:px-8 3xl:py-4 3xl:text-base"
            >
              Start Review
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3 3xl:gap-8 3xl:mt-10">
              {PRICING.map((tier) => (
                <article
                  key={tier.name}
                  className={`flex h-full flex-col rounded-xl border bg-[var(--pt-surface)] p-5 lg:min-h-[430px] 3xl:p-8 3xl:min-h-130 ${
                    tier.popular
                      ? "border-[var(--pt-accent)] shadow-[0_14px_20px_-14px_rgba(241,118,93,0.45)]"
                      : "border-[var(--pt-border)]"
                  }`}
                >
                  <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold 3xl:text-sm 3xl:px-3 3xl:py-1.5 ${tier.color}`}>
                    {tier.popular ? "Most Popular" : "Single Payment"}
                  </span>
                  <p className="mt-3 text-2xl font-semibold text-[var(--pt-ink)] 3xl:text-3xl">{tier.name}</p>
                  <p className="mt-1 text-5xl leading-none text-[var(--pt-ink)] 3xl:text-6xl">{tier.price}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--pt-ink)] 3xl:text-base">{tier.legalPackage}</p>
                  <div className="mt-2 rounded-lg border border-dashed border-[var(--pt-border)] px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--pt-muted)]">
                      Typical lawyer cost:{" "}
                      <span className="font-semibold normal-case tracking-normal text-[var(--pt-ink)]">
                        {tier.attorneyCost}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--pt-muted)]">{tier.attorneyScope}</p>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-sm text-[var(--pt-muted)] 3xl:text-base 3xl:space-y-2.5 3xl:mt-6">
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

        <footer className="pt-card-soft px-6 py-5 3xl:px-10 3xl:py-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--pt-muted)] 3xl:text-base">
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

function ClassicHero() {
  return (
        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr] lg:items-stretch 3xl:gap-8">
          <article className="pt-card h-full overflow-hidden">
            <div className="grid h-full lg:grid-cols-2">
              <div className="flex h-full flex-col bg-[var(--pt-accent)] p-8 text-[var(--pt-accent-ink)] sm:p-10 3xl:p-16">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#ffe8df] 3xl:text-base">
                  PlainTerms
                </p>
                <h1 className="mt-8 text-3xl leading-tight sm:text-4xl lg:text-[2.65rem] 3xl:text-6xl 3xl:mt-12">
                  Get detailed contract analysis at a fraction of the cost of a lawyer.
                </h1>
                <p className="mt-5 max-w-xs text-base text-[#ffe8df] 3xl:text-lg 3xl:max-w-sm 3xl:mt-7">
                  Contract review built for creators. Understand your rights and protect your work.
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-8 3xl:pt-12">
                  <Link
                    href="/analyze"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-[#e3b4a7] bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-[#6f2f20]! transition-colors hover:bg-white sm:w-[250px] 3xl:w-70 3xl:py-4 3xl:text-base"
                  >
                    Get My Contract Reviewed
                  </Link>
                  <Link
                    href="/sample-report"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--pt-accent-soft)] bg-[#e85f49] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--pt-accent)] sm:w-[250px] 3xl:w-70 3xl:py-4 3xl:text-base"
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
                <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-20 hidden flex-col items-start gap-2 px-5 lg:flex xl:flex-row xl:items-center xl:justify-between">
                  <div className="rounded-xl border border-[var(--pt-border)] bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--pt-ink)] shadow-[0_10px_20px_-16px_rgba(31,43,61,0.6)] backdrop-blur whitespace-nowrap">
                    Secure upload
                  </div>
                  <div className="rounded-xl border border-[var(--pt-border)] bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--pt-ink)] shadow-[0_10px_20px_-16px_rgba(31,43,61,0.6)] backdrop-blur whitespace-nowrap">
                    Plain-English summary
                  </div>
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

          <aside id="sample-preview" className="pt-card h-full p-6 3xl:p-10">
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pt-muted)] 3xl:text-sm">
                  Report preview
                </p>
                <span className="rounded-full bg-[var(--pt-surface-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--pt-muted)] 3xl:text-xs">
                  Report {PRICING[1].price}
                </span>
              </div>

              <h2 className="text-3xl leading-tight text-[var(--pt-ink)] 3xl:text-4xl">
                Know exactly what to negotiate before you sign.
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Summary", "Insights", "Red Flags", "Key Terms", "Questions", "Full Report"].map((tab) => (
                  <span key={tab} className="rounded-full border border-[var(--pt-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--pt-muted)]">
                    {tab}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-[var(--pt-border)] px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--pt-muted)]">
                  Typical lawyer cost:{" "}
                  <span className="font-semibold normal-case tracking-normal text-[var(--pt-ink)]">
                    {PRICING[1].attorneyCost}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[var(--pt-muted)]">{PRICING[1].attorneyScope}</p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-[#f2d3a2] bg-[#fff8eb] px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8d6222]">Red Flags</p>
                  <p className="mt-1 text-xs text-[#8d6222]/90">
                    Contract risks highlighted with plain-English context and suggested fixes.
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
      <div className="pt-page-pad relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--pt-accent)] 3xl:text-base">
          PlainTerms
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl lg:text-6xl 3xl:max-w-5xl 3xl:text-7xl">
          Get detailed contract analysis at a fraction of the cost of a lawyer.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--pt-muted)] 3xl:max-w-2xl 3xl:text-xl">
          Upload your contract and know exactly what to negotiate before you sign.
        </p>

        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row 3xl:mt-12">
          <Link
            href="/analyze"
            className="pt-btn-primary inline-flex w-full items-center justify-center rounded-lg px-6 py-4 text-base font-semibold sm:w-auto sm:min-w-[260px] 3xl:py-5 3xl:text-lg"
          >
            Get My Contract Reviewed
          </Link>
          <Link
            href="/sample-report"
            className="pt-btn-secondary inline-flex w-full items-center justify-center rounded-lg px-6 py-4 text-base font-semibold sm:w-auto sm:min-w-[260px] 3xl:py-5 3xl:text-lg"
          >
            See Sample Report
          </Link>
        </div>

        {/* Lawyer price comparison */}
        <div className="mt-9 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-dashed border-[var(--pt-border)] bg-[var(--pt-surface)]/70 px-5 py-2.5 text-sm backdrop-blur 3xl:text-base">
          <span className="font-semibold text-[var(--pt-ink)]">
            PlainTerms Report {PRICING[1].price}
          </span>
          <span className="text-[var(--pt-muted)]">vs.</span>
          <span className="text-[var(--pt-muted)]">
            typical lawyer cost{" "}
            <span className="font-semibold text-[var(--pt-ink)]">
              {PRICING[1].attorneyCost}
            </span>
          </span>
        </div>
        <p className="mt-2 max-w-md text-xs text-[var(--pt-muted)] 3xl:text-sm">
          {PRICING[1].attorneyScope}
        </p>
      </div>
    </section>
  );
}
