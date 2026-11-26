import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import RemindersButton from "@/components/tools/RemindersButton";
import ToolHeader, { ExampleLabel } from "@/components/tools/ToolHeader";
import { getSession, type Session } from "@/lib/auth";
import { getAccount } from "@/lib/serverApi";

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

/** The reminders button needs the plan; it loads on its own so the page doesn't wait. */
async function Reminders({ session }: { session: Session | null }) {
  const account = session ? await getAccount(session) : null;
  return <RemindersButton signedIn={Boolean(session)} isPro={account?.plan === "pro"} />;
}

export default async function DeadlinesPage() {
  const session = await getSession();

  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="dates"
          label="Dates"
          title="All your dates"
          line="Our software scans your documents for dates and adds them as reminders here. You can add them to your calendar or set up reminders."
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
          <Suspense
            fallback={
              <button type="button" disabled className="pt-btn pt-btn-solid h-11 px-4 text-[0.9375rem]">
                Send me reminders
              </button>
            }
          >
            <Reminders session={session} />
          </Suspense>
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
