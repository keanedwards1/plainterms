"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console; server-side logging happens upstream.
    console.error(error);
  }, [error]);

  return (
    <main className="pt-page-pad flex min-h-[70vh] items-center justify-center py-12">
      <section className="w-full max-w-md rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-white p-8 text-center shadow-[0_24px_56px_-34px_rgba(21,50,44,0.5)]">
        <p className="pt-kicker mx-auto">Something went wrong</p>
        <h1 className="mt-5 text-4xl leading-tight text-[var(--pt-ink)]">
          We hit an unexpected error.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--pt-muted)]">
          Sorry about that. You can try again, or head back home. If it keeps happening, contact us
          at{" "}
          <a className="font-semibold text-[var(--pt-ink)] underline" href="mailto:keanedwards1@gmail.com">
            keanedwards1@gmail.com
          </a>
          .
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => retry()}
            className="pt-btn-primary inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold sm:w-auto"
          >
            Try again
          </button>
          {/* A full page load, so it also recovers when the error happened on the home page itself. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="pt-btn-secondary inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold sm:w-auto"
          >
            Back to home
          </a>
        </div>
      </section>
    </main>
  );
}
