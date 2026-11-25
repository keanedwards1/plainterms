import type { Metadata } from "next";
import ToolHeader, { ExampleLabel, SoonChip } from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Compare versions",
  description: "Upload the old and new drafts of a contract and see every change, marked better or worse for you.",
};

const CHANGES = [
  { tone: "ok", label: "Better", clause: "Deposit", before: "50% on signing", after: "15% on signing", note: "Less of your money is at risk before work starts." },
  { tone: "bad", label: "Worse", clause: "Warranty", before: "10 years on labor", after: "2 years on labor", note: "Ask them to put the longer warranty back, or lower the price." },
  { tone: "info", label: "New", clause: "Cleanup", before: "Not mentioned", after: "Daily, with a dumpster on site", note: "Good to have in writing." },
];

const TONE: Record<string, string> = {
  ok: "bg-(--pt-good-bg) text-(--pt-good)",
  bad: "bg-(--pt-bad-bg) text-(--pt-bad)",
  info: "bg-[#d8e8f1] text-[#1f4e68]",
};

function Slot({ title }: { title: string }) {
  return (
    <div className="pt-framed flex min-h-36 flex-col items-center justify-center gap-2 bg-white p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-(--pt-muted)">PDF, Word or text</p>
    </div>
  );
}

export default function CompareVersionsPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="compare"
          label="Compare versions"
          title="What changed in the new draft?"
          line="Put the old and new versions side by side. Every change is marked better or worse for you, with what to say back."
          soon
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Slot title="The version you had" />
          <Slot title="The new version" />
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          <SoonChip />
          <button type="button" disabled className="pt-btn pt-btn-solid h-11 rounded-[3px] px-5">
            Compare
          </button>
        </div>

        <ExampleLabel>Example: a roofing estimate, version 2 against version 1</ExampleLabel>
        <ul className="grid gap-3">
          {CHANGES.map((change) => (
            <li key={change.clause} className="pt-panel grid gap-3 p-5 md:grid-cols-[6rem_8rem_1fr_1fr_1.4fr] md:items-center">
              <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[change.tone]}`}>{change.label}</span>
              <b className="font-medium">{change.clause}</b>
              <span className="text-(--pt-muted) line-through decoration-(--pt-bad)/60">{change.before}</span>
              <span className="font-medium">{change.after}</span>
              <span className="text-[0.9375rem] text-(--pt-muted)">{change.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
