// Shown instantly while the documents page loads.
export default function Loading() {
  return (
    <main className="pt-page-pad" aria-busy="true" aria-label="Loading">
      <div className="pt-container-wide pb-10 pt-6 sm:pt-10">
        <div className="pt-skeleton h-14 w-72" />
        <div className="pt-skeleton mt-4 h-5 w-80" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="pt-skeleton h-64 rounded-(--pt-radius)" />
          ))}
        </div>
      </div>
    </main>
  );
}
