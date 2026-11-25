import type { Metadata } from "next";
import Link from "next/link";
import ToolHeader, { ExampleLabel } from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Dates",
  description: "Dates from your contracts, leases and letters, gathered as reminders you can add to your calendar.",
};

const DATES = [
  { month: "Dec", day: "12", title: "Reply to Oakridge HOA", detail: "Fence notice · 9 days left", tone: "bg-(--pt-warn)" },
  { month: "Jan", day: "15", title: "Brightline refund due", detail: "Demand letter sent Nov 24", tone: "bg-[#1f4e68]" },
  { month: "Feb", day: "1", title: "Decide on lease renewal", detail: "Harbor Point · rent up 4%", tone: "bg-(--pt-good)" },
  { month: "Mar", day: "30", title: "Roof warranty check", detail: "Summit Roofing · first year ends in 2027", tone: "bg-(--pt-muted)" },
];

export default function DeadlinesPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="dates"
          label="Dates"
          title="All your dates"
          line="Our software scans your documents for dates and adds them as reminders here. You can add them to your calendar or have us send you reminders."
          soon
        />
        <ExampleLabel>Example</ExampleLabel>
        <ul className="pt-panel max-w-3xl divide-y divide-(--pt-line) px-5">
          {DATES.map((d) => (
            <li key={d.title} className="flex items-center gap-4 py-4">
              <span className="grid h-14 w-12 place-items-center content-center rounded-(--pt-radius-pop) bg-(--pt-leaf) font-heading text-xl font-semibold leading-none">
                <small className="mb-1 font-mono text-[0.6875rem] font-medium uppercase tracking-wide opacity-70">{d.month}</small>
                {d.day}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block font-medium">{d.title}</b>
                <span className="text-sm text-(--pt-muted)">{d.detail}</span>
              </span>
              <i className={`h-2.5 w-2.5 rounded-full ${d.tone}`} aria-hidden="true" />
            </li>
          ))}
        </ul>
        <div className="mt-5 flex max-w-3xl flex-wrap gap-2.5">
          <button type="button" disabled className="pt-btn pt-btn-outline h-11 px-4 text-[0.9375rem]">
            Add to your calendar
          </button>
          <button type="button" disabled className="pt-btn pt-btn-solid h-11 px-4 text-[0.9375rem]">
            Send me reminders
            <span className="rounded-[3px] bg-white/90 px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium text-(--pt-ink)">Pro</span>
          </button>
        </div>
        <p className="mt-8 text-(--pt-muted)">
          Dates start showing up here when you{" "}
          <Link href="/#start" className="font-medium text-(--pt-ink) underline underline-offset-4">
            review a document
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
