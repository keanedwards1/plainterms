import type { Metadata } from "next";
import Link from "next/link";

const FAQ_GROUPS = [
  {
    title: "General",
    items: [
      {
        q: "What does PlainTerms do?",
        a: "PlainTerms analyzes contract language and returns a structured plain-English report focused on risk, obligations, and negotiation readiness.",
      },
      {
        q: "Is this legal advice?",
        a: "No. PlainTerms is informational and does not replace a licensed attorney or legal representation.",
      },
      {
        q: "Who is this best for?",
        a: "Creators, founders, freelancers, and operators who need a faster first-pass contract review before signing.",
      },
    ],
  },
  {
    title: "Processing & Files",
    items: [
      {
        q: "What file formats are supported?",
        a: "PDF and DOCX are supported in the current workflow.",
      },
      {
        q: "How long does analysis take?",
        a: "Most contracts are processed in under 5 minutes after payment confirmation, depending on document size and complexity.",
      },
      {
        q: "What happens before checkout?",
        a: "Files are validated for readability and scanned in precheck before secure checkout is started.",
      },
    ],
  },
  {
    title: "Results & Plans",
    items: [
      {
        q: "What is included in the report?",
        a: "Depending on plan, you can receive risk score, red flags, clause breakdown, questions to ask, and negotiation bullets.",
      },
      {
        q: "How do I choose a plan?",
        a: "Scan is fastest, Report is best for most contract negotiations, and Protect is best for higher-risk or more complex agreements.",
      },
      {
        q: "Do results expire?",
        a: "Yes. Results are retained for a limited period and may expire automatically based on your environment settings.",
      },
    ],
  },
] as const;

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about PlainTerms.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

        <header className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_18px_28px_-24px_var(--pt-shadow)]">
          <p className="pt-kicker">Support</p>
          <h1 className="mt-3 text-5xl text-[var(--pt-ink)]">FAQ</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--pt-muted)]">
            Answers to common questions about workflow, outputs, plans, and what PlainTerms covers.
          </p>
        </header>

        <section className="mt-8 grid gap-4">
          {FAQ_GROUPS.map((group) => (
            <article key={group.title} className="pt-card rounded-2xl p-5">
              <h2 className="text-3xl text-[var(--pt-ink)]">{group.title}</h2>
              <div className="mt-4 grid gap-3">
                {group.items.map((item) => (
                  <details key={item.q} className="pt-card-soft rounded-xl p-4" open>
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--pt-ink)]">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-sm leading-7 text-[var(--pt-muted)]">{item.a}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link href="/how-it-works" className="pt-card rounded-2xl p-5 transition hover:border-[var(--pt-accent)]">
            <h3 className="text-2xl text-[var(--pt-ink)]">How It Works</h3>
            <p className="mt-2 text-sm text-[var(--pt-muted)]">See the complete review workflow.</p>
          </Link>
          <Link href="/pricing" className="pt-card rounded-2xl p-5 transition hover:border-[var(--pt-accent)]">
            <h3 className="text-2xl text-[var(--pt-ink)]">Pricing</h3>
            <p className="mt-2 text-sm text-[var(--pt-muted)]">Compare Scan, Report, and Protect plans.</p>
          </Link>
          <Link href="/analyze" className="pt-card rounded-2xl p-5 transition hover:border-[var(--pt-accent)]">
            <h3 className="text-2xl text-[var(--pt-ink)]">Start Analysis</h3>
            <p className="mt-2 text-sm text-[var(--pt-muted)]">Upload a contract and generate your report.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
