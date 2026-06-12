type ContractHealthSnapshotProps = {
  riskScore: number;
  clearClauseCount: number;
  totalClauseCount: number;
};

export default function ContractHealthSnapshot({
  riskScore,
  clearClauseCount,
  totalClauseCount,
}: ContractHealthSnapshotProps) {
  const strengthPct = Math.max(100 - riskScore, 0);
  const clarityPct = Math.round((clearClauseCount / Math.max(totalClauseCount, 1)) * 100);

  return (
    <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
      <p className="text-sm font-semibold text-[var(--pt-ink)]">Contract Health Snapshot</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
          <div className="flex items-center justify-between text-xs text-[var(--pt-muted)]">
            <span>Contract strength</span>
            <span>{strengthPct}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#f1ddd5]">
            <div className="h-2 rounded-full bg-[#2ba59f]" style={{ width: `${strengthPct}%` }} />
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--pt-ink)]/85">
            Lower risk score means stronger current contract posture.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
          <div className="flex items-center justify-between text-xs text-[var(--pt-muted)]">
            <span>Clause clarity</span>
            <span>{clarityPct}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#e7effc]">
            <div
              className="h-2 rounded-full bg-[#5d73c8]"
              style={{ width: `${Math.max(clarityPct, totalClauseCount ? 8 : 0)}%` }}
            />
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--pt-ink)]/85">
            {clearClauseCount} of {totalClauseCount || 0} core clauses are currently clear.
          </p>
        </div>
      </div>
    </article>
  );
}
