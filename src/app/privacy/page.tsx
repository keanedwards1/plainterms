import type { Metadata } from "next";
import Link from "next/link";

const PRIVACY_SECTIONS = [
  {
    title: "Data You Provide",
    body:
      "When you use PlainTerms, you provide uploaded contract files and related metadata such as filename and file type.",
    points: [
      "Uploaded contract content",
      "Technical metadata required for analysis",
      "Checkout and payment session identifiers",
    ],
  },
  {
    title: "How Data Is Used",
    body:
      "Data is used to validate files, run analysis, generate report output, and support result retrieval during the retention window.",
    points: [
      "File precheck and validation",
      "Contract analysis and report generation",
      "Operational monitoring and abuse prevention",
    ],
  },
  {
    title: "Retention",
    body:
      "Results are retained for a limited period and may expire automatically. Source documents and result payloads are not intended for indefinite storage.",
    points: [
      "Time-limited result availability",
      "Automatic expiry behavior",
      "Re-upload creates a new result record",
    ],
  },
  {
    title: "Security Controls",
    body:
      "PlainTerms uses encrypted storage paths and controlled processing flow for uploaded files.",
    points: [
      "Precheck before paid analysis",
      "Restricted processing pipeline",
      "Environment-configured retention controls",
    ],
  },
] as const;

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
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

        <header className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <p className="pt-kicker">Policy</p>
          <h1 className="mt-3 text-5xl text-[var(--pt-ink)]">Privacy</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--pt-muted)]">
            PlainTerms is designed for focused, practical data handling tied directly to contract analysis workflows.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Last updated: March 2026</p>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {PRIVACY_SECTIONS.map((section) => (
            <article key={section.title} className="pt-card rounded-2xl p-5">
              <h2 className="text-3xl text-[var(--pt-ink)]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--pt-muted)]">{section.body}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--pt-muted)]">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)]" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <h2 className="text-3xl text-[var(--pt-ink)]">Important Note</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--pt-muted)]">
            PlainTerms provides informational analysis output and is not a law firm. If your contract has high stakes,
            engage qualified legal counsel before signing.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/terms" className="pt-btn-secondary rounded-lg px-6 py-3 text-sm font-semibold">
              View Terms
            </Link>
            <Link href="/analyze" className="pt-btn-success rounded-lg px-6 py-3 text-sm font-semibold">
              Analyze Contract
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
