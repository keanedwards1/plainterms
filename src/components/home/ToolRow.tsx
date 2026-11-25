import Link from "next/link";
import { TOOL_ICONS } from "@/components/home/homeArt";

export const TOOLS = [
  { key: "review", name: "Review a contract", href: "/#start" },
  { key: "letter", name: "Explain a letter", href: "/tools/explain-a-letter" },
  { key: "compare", name: "Compare versions", href: "/tools/compare-versions" },
  { key: "ask", name: "Ask a question", href: "/tools/ask" },
  { key: "write", name: "Write a letter", href: "/tools/write-a-letter" },
  { key: "template", name: "Fill a template", href: "/templates" },
  { key: "dates", name: "Deadlines", href: "/deadlines" },
  { key: "check", name: "Check a contractor", href: "/tools/check-a-contractor" },
] as const;

export function ToolIcon({ name, className = "" }: { name: string; className?: string }) {
  // Static, hand-drawn SVG from our own source file.
  return <span className={`inline-flex ${className}`} dangerouslySetInnerHTML={{ __html: TOOL_ICONS[name] ?? "" }} />;
}

export default function ToolRow() {
  return (
    <nav aria-label="Tools" className="grid grid-cols-4 gap-x-2 gap-y-4 lg:grid-cols-8">
      {TOOLS.map((tool) => (
        <Link key={tool.key} href={tool.href} className="pt-tool">
          <ToolIcon name={tool.key} />
          <span className="text-[0.8125rem] leading-tight sm:text-[0.9375rem]">{tool.name}</span>
        </Link>
      ))}
    </nav>
  );
}
