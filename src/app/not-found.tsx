import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | PlainTerms",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="pt-page-pad flex min-h-[70vh] items-center justify-center py-12">
      <section className="w-full max-w-md rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-white p-8 text-center shadow-[0_24px_56px_-34px_rgba(31,43,61,0.5)]">
        <p className="pt-kicker mx-auto">Error 404</p>
        <h1 className="mt-5 text-4xl leading-tight text-[var(--pt-ink)]">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--pt-muted)]">
          The link may be broken or the page may have moved. Let&apos;s get you back on track.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="pt-btn-primary inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold sm:w-auto"
          >
            Back to home
          </Link>
          <Link
            href="/analyze"
            className="pt-btn-secondary inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold sm:w-auto"
          >
            Review a contract
          </Link>
        </div>
      </section>
    </main>
  );
}
