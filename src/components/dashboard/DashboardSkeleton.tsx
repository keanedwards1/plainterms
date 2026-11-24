// Shown instantly while a dashboard page loads its data.
export default function DashboardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="pt-skeleton h-9 w-56" />
      <div className="pt-skeleton mt-3 h-4 w-72" />
      <div className="pt-panel mt-6 space-y-4 p-5 sm:p-6">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="pt-skeleton h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="pt-skeleton h-4 w-2/5" />
              <div className="pt-skeleton h-3 w-1/4" />
            </div>
            <div className="pt-skeleton h-7 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
