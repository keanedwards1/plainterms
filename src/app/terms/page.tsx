import type { Metadata } from "next";
import Link from "next/link";

const TERMS_SECTIONS = [
  {
    title: "Service Scope",
    body:
      "PlainTerms provides informational contract analysis output. It is not legal representation, legal strategy, or legal opinion.",
  },
  {
    title: "No Attorney-Client Relationship",
    body:
      "Using this service does not create an attorney-client relationship. You remain responsible for legal decisions and final signature approval.",
  },
  {
    title: "User Responsibilities",
    body:
      "You are responsible for ensuring uploaded content is lawful to process and for independently verifying critical contract terms before execution.",
  },
  {
    title: "Payments and Access",
    body:
      "Plan purchases grant access to corresponding report depth. Feature availability may vary by plan and deployment configuration.",
  },
  {
    title: "Availability and Retention",
    body:
      "Result availability is time-limited and may expire automatically. Platform performance may vary based on workload and upstream dependencies.",
  },
  {
    title: "Limitation of Liability",
    body:
      "To the maximum extent permitted by law, PlainTerms is provided as-is for informational use. Users should obtain legal advice for high-stakes decisions.",
  },
] as const;

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for PlainTerms contract analysis.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms | PlainTerms",
    description: "Terms of use for PlainTerms contract analysis.",
    url: "/terms",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms | PlainTerms",
    description: "Terms of use for PlainTerms contract analysis.",
  },
};

export default function TermsPage() {
  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

        <header className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <p className="pt-kicker">Legal</p>
          <h1 className="mt-3 text-5xl text-[var(--pt-ink)]">Terms</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--pt-muted)]">
            These terms outline service boundaries and user responsibilities when using PlainTerms.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Last updated: March 2026</p>
        </header>

        <section className="mt-8 grid gap-4">
          {TERMS_SECTIONS.map((section) => (
            <article key={section.title} className="pt-card rounded-2xl p-5">
              <h2 className="text-3xl text-[var(--pt-ink)]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--pt-muted)]">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="pt-card rounded-2xl p-5">
            <h2 className="text-3xl text-[var(--pt-ink)]">Before You Sign</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--pt-muted)]">
              Use PlainTerms to understand language faster, then confirm final legal interpretation with qualified counsel when needed.
            </p>
          </article>

          <article className="pt-card rounded-2xl p-5">
            <h2 className="text-3xl text-[var(--pt-ink)]">Related Policies</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/privacy" className="pt-btn-secondary rounded-lg px-6 py-3 text-sm font-semibold">
                View Privacy
              </Link>
              <Link href="/faq" className="pt-btn-secondary rounded-lg px-6 py-3 text-sm font-semibold">
                Read FAQ
              </Link>
              <Link href="/analyze" className="pt-btn-success rounded-lg px-6 py-3 text-sm font-semibold">
                Analyze Contract
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
