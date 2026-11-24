// A compact, illustrative result so visitors see what they get before
// they add anything. The values come from the sample contract.

const ISSUES = [
  {
    severity: "high",
    title: "50% deposit before any work starts",
    ask: "Ask for 10% or less up front, then pay as work is finished.",
  },
  {
    severity: "high",
    title: "Changes can be billed without your written OK",
    ask: "Require a signed change order with the price before extra work.",
  },
  {
    severity: "medium",
    title: "No completion date",
    ask: "Add a finish date and what happens if it's missed.",
  },
] as const;

const SEVERITY = {
  high: "bg-(--pt-bad-bg) text-(--pt-bad)",
  medium: "bg-(--pt-warn-bg) text-(--pt-warn)",
} as const;

export default function ExamplePreview() {
  return (
    <aside aria-labelledby="example-heading" className="pt-panel relative overflow-hidden p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="example-heading" className="text-lg text-(--pt-ink)">
          What you&apos;ll get
        </h2>
        <span className="rounded-full border border-(--pt-line) px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--pt-muted)">
          Example
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-(--pt-warn-bg) p-4">
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-white ring-1 ring-[#ead3a1]">
          <span className="text-2xl font-bold leading-none text-(--pt-ink)">72</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-(--pt-muted)">risk</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--pt-warn)">Verdict</p>
          <p className="text-xl font-semibold text-(--pt-ink)">Negotiate before signing</p>
          <p className="mt-0.5 text-sm text-(--pt-ink-soft)">3 terms put your money at risk.</p>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-(--pt-muted)">Your top fixes</p>
      <ol className="mt-2 space-y-2.5">
        {ISSUES.map((issue, idx) => (
          <li key={issue.title} className="rounded-xl border border-(--pt-line) bg-white p-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--pt-surface-soft) text-xs font-bold text-(--pt-ink-soft) ring-1 ring-(--pt-line)">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold leading-snug text-(--pt-ink)">{issue.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY[issue.severity]}`}>
                    {issue.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 text-(--pt-ink-soft)">
                  <span className="font-semibold text-(--pt-good)">Ask for: </span>
                  {issue.ask}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm text-(--pt-muted)">
        Plus every clause in plain English, questions to ask, and a ready-to-send email.
      </p>
    </aside>
  );
}
