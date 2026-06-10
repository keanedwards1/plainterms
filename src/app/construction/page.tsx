import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PlainTerms is under construction",
  description: "PlainTerms is temporarily password protected while updates are in progress.",
  robots: {
    index: false,
    follow: false,
  },
};

type ConstructionPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

function safeNextPath(value: string | undefined) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/api/construction-login")) return "/";
  return value;
}

export default async function ConstructionPage({ searchParams }: ConstructionPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "1";
  const nextPath = safeNextPath(params?.next);

  return (
    <main className="fixed inset-0 z-[1000] flex min-h-dvh items-center justify-center overflow-y-auto bg-[var(--pt-bg)] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-[var(--pt-border)] bg-white p-6 shadow-[0_24px_56px_-34px_rgba(31,43,61,0.5)] sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--pt-accent)] text-sm font-bold text-[var(--pt-accent-ink)]">
            P
          </span>
          <span className="text-2xl font-semibold tracking-tight text-[var(--pt-ink)]">
            PlainTerms
          </span>
        </div>

        <p className="pt-kicker mt-8">Under construction</p>
        <h1 className="mt-4 text-4xl leading-tight text-[var(--pt-ink)]">
          We are tuning up the contract review flow.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--pt-muted)]">
          Enter the temporary password to view the site while updates are in progress.
        </p>

        <form action="/api/construction-login" method="post" className="mt-6 space-y-3">
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="construction-password" className="block text-sm font-semibold text-[var(--pt-ink)]">
            Password
          </label>
          <input
            id="construction-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            className="w-full rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-3 text-base text-[var(--pt-ink)] outline-none transition-colors focus:border-[var(--pt-accent)]"
          />
          {hasError ? (
            <p className="rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-sm text-[#9e3f2d]">
              That password did not work. Please try again.
            </p>
          ) : null}
          <button
            type="submit"
            className="pt-btn-primary inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold"
          >
            Enter site
          </button>
        </form>
      </section>
    </main>
  );
}
