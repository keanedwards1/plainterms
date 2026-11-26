/**
 * Loading placeholders shaped like the content on its way, so a page keeps its layout while data arrives.
 * Used by route loading files, Suspense fallbacks and the instant tab switch in the shell.
 */

function Bar({ className }: { className: string }) {
  return <div className={`pt-skeleton ${className}`} />;
}

/** A tool-style page header: icon, label, big title, one line. */
function HeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pb-8 pt-6 sm:pt-10">
      <Bar className="h-20 w-20 rounded-(--pt-radius)" />
      <div className="min-w-0 flex-1">
        <Bar className="h-3.5 w-24" />
        <Bar className="mt-3 h-12 w-[min(28rem,80%)]" />
        <Bar className="mt-4 h-4 w-[min(36rem,90%)]" />
      </div>
    </div>
  );
}

/** Document cards: a page preview, the file name, the date. */
export function DocumentCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="grid gap-2">
          <Bar className="aspect-[4/3] w-full rounded-(--pt-radius)" />
          <Bar className="mt-1 h-4 w-3/4" />
          <Bar className="h-3.5 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

export function DocumentsSkeleton() {
  return (
    <main className="pt-page-pad" aria-busy="true" aria-label="Loading">
      <div className="pt-container-wide pb-10">
        <div className="pb-8 pt-6 sm:pt-10">
          <Bar className="h-14 w-64" />
          <Bar className="mt-4 h-5 w-80 max-w-full" />
        </div>
        <DocumentCardsSkeleton />
      </div>
    </main>
  );
}

/** The home page's "Pick up where you left off" rows. */
export function RecentDocumentsSkeleton() {
  return (
    <ul className="mt-4 grid gap-3" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex items-center gap-4">
          <Bar className="h-14 w-11 shrink-0 rounded-(--pt-radius-pop)" />
          <div className="min-w-0 flex-1">
            <Bar className="h-4 w-2/5" />
            <Bar className="mt-2 h-3.5 w-1/4" />
          </div>
          <Bar className="h-7 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Account panels (settings, billing). */
export function AccountPanelsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="pt-panel mt-5 space-y-4 p-5 sm:p-6" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bar className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bar className="h-4 w-2/5" />
            <Bar className="h-3 w-1/4" />
          </div>
          <Bar className="h-7 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Bar className="h-9 w-56" />
      <Bar className="mt-3 h-4 w-72 max-w-full" />
      <AccountPanelsSkeleton />
    </div>
  );
}

/** Tools, templates, emails, dates: a header, then a grid of cards. */
export function PageSkeleton() {
  return (
    <main className="pt-page-pad" aria-busy="true" aria-label="Loading">
      <div className="pt-container-wide pb-10">
        <HeaderSkeleton />
        <Bar className="mb-4 mt-12 h-3.5 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Bar key={i} className="h-40 rounded-(--pt-radius)" />
          ))}
        </div>
      </div>
    </main>
  );
}

/** Home: the hero's heading, line and upload field. */
export function HomeSkeleton() {
  return (
    <main className="pt-page-pad" aria-busy="true" aria-label="Loading">
      <div className="pt-container-wide flex flex-col items-center pb-14 pt-12 sm:pt-20">
        <Bar className="h-16 w-[min(36rem,90%)] sm:h-24" />
        <Bar className="mt-4 h-16 w-[min(30rem,80%)] sm:h-24" />
        <Bar className="mt-8 h-5 w-[min(34rem,90%)]" />
        <Bar className="mt-8 h-16 w-[min(47.5rem,100%)] rounded-(--pt-radius-pop)" />
      </div>
    </main>
  );
}

/** The full-screen /new page: close button, two-line headline, subtitle, upload field, two small buttons. */
export function NewDocumentSkeleton() {
  return (
    <main className="pt-new" aria-busy="true" aria-label="Loading">
      <span className="pt-skeleton fixed right-4 top-4 h-11 w-11 rounded-full" />
      <div className="flex w-full flex-col items-center px-4 pb-12 pt-[4.5rem]">
        <Bar className="h-14 w-[min(34rem,88%)] sm:h-24" />
        <Bar className="mt-3 h-14 w-[min(38rem,94%)] sm:h-24" />
        <Bar className="mt-8 h-4 w-[min(32rem,86%)]" />
        <Bar className="mt-2.5 h-4 w-[min(24rem,70%)]" />
        <Bar className="mt-9 h-16 w-[min(47.5rem,100%)] rounded-(--pt-radius-pop)" />
        <div className="mt-3.5 flex gap-2">
          <Bar className="h-9 w-40" />
          <Bar className="h-9 w-24" />
        </div>
        <Bar className="mt-4 h-3 w-[min(26rem,80%)]" />
      </div>
    </main>
  );
}

/** A document's result page. */
export function ResultSkeleton() {
  return (
    <main className="pt-page-pad" aria-busy="true" aria-label="Loading your document">
      <div className="pt-container-wide pb-10 pt-6 sm:pt-10">
        <Bar className="h-4 w-40" />
        <Bar className="mt-4 h-12 w-[min(36rem,90%)]" />
        <Bar className="mt-3 h-4 w-64" />
        <div className="pt-panel mt-8 flex items-center gap-6 p-6">
          <Bar className="h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Bar className="h-4 w-32" />
            <Bar className="h-8 w-2/3" />
            <Bar className="h-4 w-full max-w-xl" />
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="pt-panel space-y-3 p-6">
            {Array.from({ length: 3 }, (_, i) => (
              <Bar key={i} className="h-20" />
            ))}
          </div>
          <div className="pt-panel space-y-3 p-6">
            {Array.from({ length: 2 }, (_, i) => (
              <Bar key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/** The skeleton for whichever page a tab leads to. */
export function SkeletonFor({ path }: { path: string }) {
  if (path === "/") return <HomeSkeleton />;
  if (path === "/new") return <NewDocumentSkeleton />;
  if (path.startsWith("/documents")) return <DocumentsSkeleton />;
  if (path.startsWith("/result")) return <ResultSkeleton />;
  if (path.startsWith("/dashboard")) {
    return (
      <main className="pt-page-pad">
        <div className="pt-container-wide pb-10 pt-6 sm:pt-10">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }
  return <PageSkeleton />;
}
