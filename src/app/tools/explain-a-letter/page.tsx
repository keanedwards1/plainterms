import type { Metadata } from "next";
import Link from "next/link";
import ExampleLetter from "@/components/tools/ExampleLetter";
import ToolHeader, { DisabledDrop, ExampleLabel } from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Explain a letter",
  description: "Letters from a landlord, HOA, insurer or debt collector, explained in plain English, with the reply date on your calendar.",
};

export default function ExplainLetterPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="letter"
          label="Explain a letter"
          title="What does this letter want from me?"
          line="Notices from a landlord, HOA, insurer or debt collector. We find the deadline, say what it means and lay out your options."
          soon
        />
        <DisabledDrop prompt="Drop a letter or notice here, or take a photo of it" action="Explain it" />

        <ExampleLabel>Example: an HOA fence notice</ExampleLabel>
        <ExampleLetter />
        <p className="mt-8 text-(--pt-muted)">
          Have a contract instead?{" "}
          <Link href="/#start" className="font-medium text-(--pt-ink) underline underline-offset-4">
            Review it now
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
