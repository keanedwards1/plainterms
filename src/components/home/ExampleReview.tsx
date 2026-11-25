import CopyButton from "@/components/ui/CopyButton";

// The worked example for "Review a contract": a kitchen remodel contract.

const FIXES = [
  {
    level: "High",
    tone: "bg-(--pt-bad-bg) text-(--pt-bad)",
    title: "Deposit is half the price",
    body: "Ask for 10% on signing and the rest as each stage is finished. California caps home-improvement deposits at 10% or $1,000.",
  },
  {
    level: "High",
    tone: "bg-(--pt-bad-bg) text-(--pt-bad)",
    title: "Extra work without your approval",
    body: "Ask that nothing outside the scope starts without a change order you have signed, with its price.",
  },
  {
    level: "Medium",
    tone: "bg-(--pt-warn-bg) text-(--pt-warn)",
    title: "No finish date",
    body: "Ask for a completion date and a $250 credit for each week it slips without a reason you agreed to.",
  },
];

const CLAUSES = [
  { name: "Deposit and payments", note: "Risky", dot: "bg-(--pt-bad)" },
  { name: "Change orders", note: "Risky", dot: "bg-(--pt-bad)" },
  { name: "Schedule", note: "Missing a date", dot: "bg-(--pt-warn)" },
  { name: "Allowances", note: "Open-ended", dot: "bg-(--pt-warn)" },
  { name: "Permits", note: "Contractor pulls them", dot: "bg-(--pt-good)" },
  { name: "Warranty", note: "1 year on labor", dot: "bg-(--pt-good)" },
  { name: "Cleanup", note: "Daily", dot: "bg-(--pt-good)" },
];

export default function ExampleReview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <section className="pt-panel grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr] lg:col-span-2">
        <svg viewBox="0 0 44 44" aria-hidden="true" className="h-24 w-24 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--pt-line)" strokeWidth="5" />
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--pt-accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray="113.1" strokeDashoffset="31.7" />
        </svg>
        <div>
          <p className="pt-label">Risk 72 of 100</p>
          <p className="font-heading mt-1 text-[clamp(1.625rem,2.6vw,2.25rem)] font-semibold leading-tight tracking-[-0.04em]">Negotiate before you sign</p>
          <p className="mt-2 text-(--pt-muted)">The price is fair for the scope. Three terms leave you paying for work that may not happen on time.</p>
        </div>
      </section>
      <section className="pt-panel p-6">
        <h3 className="text-[1.1875rem]">Ask for these three changes</h3>
        <ol className="mt-4 grid gap-3">
          {FIXES.map((fix, i) => (
            <li key={fix.title} className="grid grid-cols-[auto_1fr_auto] items-start gap-3.5 rounded-2xl bg-(--pt-surface-soft) p-4 max-sm:grid-cols-[1fr_auto]">
              <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold max-sm:col-span-2 max-sm:w-fit ${fix.tone}`}>{fix.level}</span>
              <div>
                <b className="font-medium">{fix.title}</b>
                <p className="mt-1 text-[0.9375rem] text-(--pt-muted)">{fix.body}</p>
              </div>
              <CopyButton text={`${fix.title}. ${fix.body}`} label={`Copy fix ${i + 1}`} />
            </li>
          ))}
        </ol>
      </section>
      <section className="pt-panel p-6">
        <h3 className="text-[1.1875rem]">All 11 clauses</h3>
        <ul className="mt-2">
          {CLAUSES.map((clause) => (
            <li key={clause.name} className="flex items-center gap-3 border-b border-(--pt-line) py-3 text-[0.9375rem] last:border-0">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${clause.dot}`} aria-hidden="true" />
              {clause.name}
              <em className="ml-auto text-right text-sm not-italic text-(--pt-muted)">{clause.note}</em>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
