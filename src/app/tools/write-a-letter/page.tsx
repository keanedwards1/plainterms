import type { Metadata } from "next";
import LetterWriter from "@/components/tools/LetterWriter";
import ToolHeader from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Write a letter",
  description: "A demand letter, a security deposit request or a complaint to a contractor. Fill in a few details and the letter writes itself.",
};

export default function WriteLetterPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="write"
          label="Write a letter"
          title="Put it in writing"
          line="Pick the kind of letter, fill in a few details and it writes itself as you type. Copy it into an email or print it."
        />
        <LetterWriter />
        <p className="mt-10 max-w-3xl text-sm text-(--pt-muted)">
          These letters are a starting point you can edit. PlainTerms isn&apos;t a law firm, and the rules for deposits, deadlines and
          small claims differ by state.
        </p>
      </div>
    </main>
  );
}
