// Shown the moment a document is opened, while its analysis loads.
export default function Loading() {
  return (
    <main className="pt-page-pad" aria-busy="true" aria-label="Loading your document">
      <div className="pt-container-wide pb-10 pt-6 sm:pt-10">
        <div className="pt-skeleton h-4 w-40" />
        <div className="pt-skeleton mt-4 h-12 w-[min(36rem,90%)]" />
        <div className="pt-skeleton mt-3 h-4 w-64" />
        <div className="pt-panel mt-8 flex items-center gap-6 p-6">
          <div className="pt-skeleton h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="pt-skeleton h-4 w-32" />
            <div className="pt-skeleton h-8 w-2/3" />
            <div className="pt-skeleton h-4 w-full max-w-xl" />
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="pt-panel space-y-3 p-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="pt-skeleton h-20" />
            ))}
          </div>
          <div className="pt-panel space-y-4 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="pt-skeleton h-5" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
