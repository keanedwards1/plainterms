import type { Metadata } from "next";
import Link from "next/link";
import { SoonChip } from "@/components/tools/ToolHeader";
import { TEMPLATES, type TemplateInfo } from "@/lib/templates";
import "@/components/home/home.css";

export const metadata: Metadata = {
  title: "Templates",
  description: "Change orders, lien waivers, demand letters, lease addenda and more, filled in by answering a few questions.",
};

// Templates the letter writer can already fill.
const READY: Record<string, string> = {
  "demand-letter": "/tools/write-a-letter",
  "security-deposit": "/tools/write-a-letter",
  "contractor-complaint": "/tools/write-a-letter",
};

const GROUPS: TemplateInfo["group"][] = ["Home and renovation", "Renting", "Money and disputes"];

export default function TemplatesPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <header className="pb-6 pt-6 sm:pt-10">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">Templates</h1>
          <p className="mt-3 max-w-[60ch] text-lg text-(--pt-muted)">
            Answer a few questions and get a filled-in document you can sign, send or print.
          </p>
        </header>
        {GROUPS.map((group) => (
          <section key={group} aria-labelledby={`g-${group}`} className="mt-10">
            <h2 id={`g-${group}`} className="text-2xl tracking-[-0.04em]">
              {group}
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {TEMPLATES.filter((t) => t.group === group).map((tpl) => {
                const href = READY[tpl.slug];
                const inner = (
                  <>
                    <span className="pt-tpl-paper" aria-hidden="true">
                      <b className="font-heading text-[0.8125rem] font-semibold">{tpl.name}</b>
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="mt-2 font-medium">{tpl.name}</span>
                    <span className="text-sm leading-snug text-(--pt-muted)">{tpl.line}</span>
                    {href ? null : (
                      <span className="mt-1">
                        <SoonChip />
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={tpl.slug} id={tpl.slug} className="scroll-mt-24">
                    {href ? (
                      <Link href={href} className="pt-tpl grid gap-1.5">
                        {inner}
                      </Link>
                    ) : (
                      <div className="grid gap-1.5">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
