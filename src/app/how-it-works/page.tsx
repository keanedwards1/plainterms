import type { Metadata } from "next";
import Link from "next/link";

const FLOW_STEPS = [
  {
    id: "01",
    title: "Upload",
    detail:
      "Upload a PDF or DOCX contract. We validate file format and readability before any paid processing starts.",
    output: "Validated file ready for checkout",
  },
  {
    id: "02",
    title: "Secure Checkout",
    detail:
      "Choose your report depth and complete payment through secure checkout. Your analysis queue starts immediately after confirmation.",
    output: "Processing session created",
  },
  {
    id: "03",
    title: "Clause Extraction",
    detail:
      "PlainTerms parses the agreement into structured sections, identifies obligations, and maps evidence to source text.",
    output: "Structured contract map",
  },
  {
    id: "04",
    title: "Risk Scoring",
    detail:
      "We score risk signals, generate plain-English explanations, and surface the highest-priority issues first.",
    output: "Risk score and red flags",
  },
  {
    id: "05",
    title: "Actionable Report",
    detail:
      "You get summary, key terms, questions to ask, and negotiation guidance in one results workspace.",
    output: "Negotiation-ready insights",
  },
] as const;

const DELIVERABLES = [
  "Plain-English summary of the agreement",
  "Severity-ranked red flags",
  "Clause-by-clause interpretation",
  "Questions to ask before signing",
  "Negotiation bullet points and next steps",
] as const;

const CONTROL_ITEMS = [
  "Encrypted storage path for uploaded files",
  "Readability and malware precheck before checkout",
  "Result retention window with automatic expiration",
  "Informational guidance output (not legal advice)",
] as const;

export const metadata: Metadata = {
  title: "How It Works",
  description: "How PlainTerms analyzes contracts and delivers plain-English guidance.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

        <header className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <p className="pt-kicker">Workflow Overview</p>
          <h1 className="mt-3 text-5xl text-[var(--pt-ink)]">How It Works</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--pt-muted)]">
            PlainTerms is designed as a focused contract-review flow: upload, analyze, and act.
            Every step is built to reduce ambiguity before signature.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="pt-card-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Typical Time</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--pt-ink)]">Under 5 min</p>
            </article>
            <article className="pt-card-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Inputs</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--pt-ink)]">PDF + DOCX</p>
            </article>
            <article className="pt-card-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Output Focus</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--pt-ink)]">Risk + Actions</p>
            </article>
          </div>
        </header>

        <section className="mt-8 grid gap-4">
          {FLOW_STEPS.map((step) => (
            <article key={step.id} className="pt-card rounded-2xl p-5">
              <div className="grid gap-4 md:grid-cols-[78px_minmax(0,1fr)_240px] md:items-start">
                <div className="md:pt-1">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-sm font-semibold text-[var(--pt-ink)]">
                    {step.id}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl text-[var(--pt-ink)]">{step.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--pt-muted)]">{step.detail}</p>
                </div>
                <div className="pt-card-soft p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Output</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--pt-ink)]">{step.output}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="pt-card rounded-2xl p-5">
            <h2 className="text-3xl text-[var(--pt-ink)]">What You Receive</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--pt-muted)]">
              {DELIVERABLES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)]" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="pt-card rounded-2xl p-5">
            <h2 className="text-3xl text-[var(--pt-ink)]">Control & Reliability</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--pt-muted)]">
              {CONTROL_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--pt-success)]" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <h2 className="text-3xl text-[var(--pt-ink)]">Next Step</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--pt-muted)]">
            If you already have a draft agreement, start on the analyze page and choose your report tier.
            You can also review plan options and common questions first.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/analyze" className="pt-btn-success rounded-lg px-6 py-3 text-sm font-semibold">
              Start Analysis
            </Link>
            <Link href="/pricing" className="pt-btn-secondary rounded-lg px-6 py-3 text-sm font-semibold">
              Compare Pricing
            </Link>
            <Link href="/faq" className="pt-btn-secondary rounded-lg px-6 py-3 text-sm font-semibold">
              Read FAQ
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
