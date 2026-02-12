import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for PlainTerms contract analysis.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy | PlainTerms",
    description: "Privacy information for PlainTerms contract analysis.",
    url: "/privacy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy | PlainTerms",
    description: "Privacy information for PlainTerms contract analysis.",
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
        ← Back to home
      </Link>

      <h1 className="mt-5 text-4xl text-[var(--pt-ink)]">Privacy</h1>
      <p className="mt-4 text-[var(--pt-muted)]">
        PlainTerms is designed for minimal, practical data handling during contract analysis.
      </p>

      <section className="mt-6 grid gap-4 text-sm text-[var(--pt-muted)]">
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h2 className="text-xl text-[var(--pt-ink)]">Document processing</h2>
          <p className="mt-2">
            Uploaded documents are processed for analysis workflow and are intended to be stored
            ephemerally. Structured result payloads may be stored to support result retrieval.
          </p>
        </article>
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h2 className="text-xl text-[var(--pt-ink)]">Use limitation</h2>
          <p className="mt-2">
            PlainTerms provides informational summaries and is not a law firm or legal advice
            service.
          </p>
        </article>
      </section>
    </main>
  );
}
