import type { Metadata } from "next";
import Link from "next/link";

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
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
        ← Back to home
      </Link>

      <h1 className="mt-5 text-4xl text-[var(--pt-ink)]">Terms</h1>
      <p className="mt-4 text-[var(--pt-muted)]">
        PlainTerms is provided for informational use. Output may help users understand agreement
        language, but does not replace a licensed attorney.
      </p>

      <section className="mt-6 grid gap-4 text-sm text-[var(--pt-muted)]">
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h2 className="text-xl text-[var(--pt-ink)]">No legal advice</h2>
          <p className="mt-2">
            PlainTerms does not provide legal representation, legal strategy, or legal opinions.
          </p>
        </article>
        <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
          <h2 className="text-xl text-[var(--pt-ink)]">User responsibility</h2>
          <p className="mt-2">
            Users remain responsible for final decisions and should consult qualified counsel for
            legal interpretation or advice.
          </p>
        </article>
      </section>
    </main>
  );
}
