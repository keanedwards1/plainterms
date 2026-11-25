import type { Metadata } from "next";
import ToolHeader, { ExampleLabel } from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Check a contractor",
  description: "What to confirm before you hire a contractor or pay a deposit: license, insurance, bond, deposit size and lien waivers.",
};

const CHECKS = [
  { title: "The license is active", body: "Look the contractor up on your state's licensing board site. The name and license number should match the contract." },
  { title: "They carry liability insurance", body: "Ask for a certificate of insurance sent straight from the insurer, with your address on it." },
  { title: "Workers are covered", body: "If they have employees, ask for proof of workers' compensation coverage so an injury on your property isn't your bill." },
  { title: "The deposit is small", body: "Many states cap home-improvement deposits. In California it's 10% of the price or $1,000, whichever is less." },
  { title: "Everything is in the contract", body: "Scope, price, payment schedule, start and finish dates, and how changes are approved and priced." },
  { title: "You get lien waivers", body: "Each time you pay, ask for a waiver from the contractor and any big suppliers so no one can put a lien on your home." },
];

export default function CheckContractorPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="check"
          label="Check a contractor"
          title="Before you hand over a deposit"
          line="Enter a contractor's license number to check it against your state's board. Until then, here's what to confirm yourself."
          soon
        />
        <form className="pt-framed grid gap-3 bg-white p-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end" aria-label="Look up a contractor">
          {[
            ["Contractor name", "Brightline Remodeling"],
            ["License number", "1048213"],
            ["State", "California"],
          ].map(([label, placeholder]) => (
            <label key={label} className="grid gap-1.5 text-sm font-medium">
              {label}
              <input disabled placeholder={placeholder} className="rounded-[10px] border border-(--pt-line) bg-(--pt-bg) px-3.5 py-2.5 font-normal disabled:cursor-not-allowed" />
            </label>
          ))}
          <button type="button" disabled className="pt-btn pt-btn-solid h-11 rounded-[3px] px-5">
            Check
          </button>
        </form>

        <ExampleLabel>What to confirm</ExampleLabel>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CHECKS.map((check, i) => (
            <li key={check.title} className="pt-panel p-5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-(--pt-leaf) text-sm font-semibold">{i + 1}</span>
              <h2 className="mt-3 text-lg">{check.title}</h2>
              <p className="mt-1 text-[0.9375rem] text-(--pt-muted)">{check.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
