import type { Metadata } from "next";
import Link from "next/link";
import { ToolIcon } from "@/components/home/ToolRow";
import { SoonChip } from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Tools",
  description: "Review a contract, write a letter, fill in a template and more.",
};

const TOOLS = [
  { icon: "review", name: "Review a contract", line: "A verdict, the risky clauses and the three changes to ask for.", href: "/new", ready: true },
  { icon: "write", name: "Write a letter", line: "Demand letters, deposit requests and complaints that write themselves.", href: "/tools/write-a-letter", ready: true },
  { icon: "letter", name: "Explain a letter", line: "What a notice wants from you, the reply date and your options.", href: "/tools/explain-a-letter", ready: false },
  { icon: "compare", name: "Compare versions", line: "Every change between two drafts, marked better or worse for you.", href: "/tools/compare-versions", ready: false },
  { icon: "ask", name: "Ask a question", line: "Answers about your document that point to the clause.", href: "/tools/ask", ready: false },
  { icon: "template", name: "Templates", line: "Change orders, invoices, NDAs, roommate agreements and more, ready to fill in and sign.", href: "/templates", ready: true },
  { icon: "dates", name: "Deadlines", line: "Every date in your documents on one calendar.", href: "/deadlines", ready: false },
  { icon: "check", name: "Check a contractor", line: "License, insurance and deposit checks before you pay.", href: "/tools/check-a-contractor", ready: false },
];

export default function ToolsPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <header className="pb-8 pt-6 sm:pt-10">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">Tools</h1>
          <p className="mt-3 max-w-[60ch] text-lg text-(--pt-muted)">Everything PlainTerms can do with a contract, a lease or a letter.</p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map((tool) => (
            <li key={tool.name}>
              <Link href={tool.href} className="pt-panel group flex h-full flex-col gap-3 p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-14px_rgb(21_50_44/0.28)]">
                <ToolIcon name={tool.icon} />
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-xl font-semibold tracking-[-0.03em]">{tool.name}</span>
                  {tool.ready ? null : <SoonChip />}
                </span>
                <span className="text-[0.9375rem] text-(--pt-muted)">{tool.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
