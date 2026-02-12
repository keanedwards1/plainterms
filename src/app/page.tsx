import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Independent Contractor Agreement Explanation",
  description:
    "PlainTerms explains independent contractor and services agreements in plain English with a calm, neutral summary.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Independent Contractor Agreement Explanation | PlainTerms",
    description:
      "Understand contractor agreements without legal jargon. Upload and review a plain-English summary.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Independent Contractor Agreement Explanation | PlainTerms",
    description:
      "Upload a contract and get a plain-English explanation focused on clarity, not legal advice.",
  },
};

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-1 text-sm font-semibold text-[var(--pt-muted)]">
            Plain-English contract analysis
          </p>
          <h1 className="max-w-2xl text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl">
            Understand contractor agreements without legal jargon.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--pt-muted)]">
            PlainTerms explains independent contractor and services agreements in calm,
            neutral language. Fast first-pass clarity, without legal advice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="rounded-full bg-[var(--pt-accent)] px-6 py-3 text-sm font-semibold text-[var(--pt-accent-ink)] shadow-sm transition hover:brightness-95"
            >
              Analyze a contract
            </Link>
            <Link
              href="/result/demo_1770094351605_2needzk2"
              className="rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)] px-6 py-3 text-sm font-semibold text-[var(--pt-ink)] transition hover:bg-[var(--pt-surface-soft)]"
            >
              View sample result
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-sm">
          <h2 className="text-xl text-[var(--pt-ink)]">How it works</h2>
          <ol className="mt-4 grid gap-4 text-sm text-[var(--pt-muted)]">
            <li className="rounded-xl bg-[var(--pt-surface-soft)] p-4">
              <p className="font-semibold text-[var(--pt-ink)]">1. Upload</p>
              Add a PDF or DOCX agreement.
            </li>
            <li className="rounded-xl bg-[var(--pt-surface-soft)] p-4">
              <p className="font-semibold text-[var(--pt-ink)]">2. Analyze</p>
              We extract key terms into a structured summary.
            </li>
            <li className="rounded-xl bg-[var(--pt-surface-soft)] p-4">
              <p className="font-semibold text-[var(--pt-ink)]">3. Review</p>
              Read a calm, section-by-section explanation with clear caveats.
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h3 className="text-lg text-[var(--pt-ink)]">Scope (v1)</h3>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">
            Focused on independent contractor and services agreements only.
          </p>
        </article>
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h3 className="text-lg text-[var(--pt-ink)]">Tone</h3>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">
            Neutral language, no negotiation tactics, no speculation.
          </p>
        </article>
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h3 className="text-lg text-[var(--pt-ink)]">Data handling</h3>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">
            Ephemeral file processing with structured persisted results.
          </p>
        </article>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pt-border)] pt-6 text-sm text-[var(--pt-muted)]">
        <p>PlainTerms is informational only and not legal advice.</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-[var(--pt-ink)]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--pt-ink)]">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
