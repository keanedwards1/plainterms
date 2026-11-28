"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SoonChip } from "@/components/tools/ToolHeader";
import CategoryIcon, { type Category } from "@/components/templates/CategoryIcon";
import { TEMPLATE_GROUPS, TEMPLATES } from "@/lib/templates";

const SHORT: Record<Category, string> = {
  All: "All",
  "Home and renovation": "Home",
  Renting: "Renting",
  "Work and freelancing": "Work",
  "Creators and social media": "Creators",
  Business: "Business",
  "Buying and selling": "Buying and selling",
  "Money and disputes": "Money",
  "Personal and family": "Family",
};

const CATEGORIES: Category[] = ["All", ...TEMPLATE_GROUPS];

/** The category filter row and the template cards under it. */
export default function TemplateBrowser() {
  const [category, setCategory] = useState<Category>("All");
  const shown = useRef<Category>("All");
  useEffect(() => {
    shown.current = category;
  }, [category]);

  // Jumping to a template (from the search, or a link with #slug) shows every category again
  // if that template is in one that's filtered out, then scrolls to its card.
  useEffect(() => {
    const onHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      const template = TEMPLATES.find((t) => t.slug === slug);
      if (!template || shown.current === "All" || shown.current === template.group) return;
      setCategory("All");
      window.requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView({ block: "start" }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const groups = category === "All" ? TEMPLATE_GROUPS : [category];

  return (
    <>
      <div className="pt-tpl-filters" role="group" aria-label="Filter by category">
        {CATEGORIES.map((c) => {
          const count = c === "All" ? TEMPLATES.length : TEMPLATES.filter((t) => t.group === c).length;
          return (
            <button
              key={c}
              type="button"
              className="pt-tpl-filter"
              aria-pressed={category === c}
              title={c === "All" ? `All templates (${count})` : `${c} (${count})`}
              onClick={() => setCategory(c)}
            >
              <CategoryIcon category={c} />
              <span>{SHORT[c]}</span>
            </button>
          );
        })}
      </div>

      {groups.map((group) => (
        <section key={group} aria-labelledby={`g-${group}`} className="mt-10">
          <h2 id={`g-${group}`} className="text-2xl tracking-[-0.04em]">
            {group}
          </h2>
          <ul className="pt-tpl-grid mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {TEMPLATES.filter((t) => t.group === group).map((tpl) => {
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
                  {tpl.href ? null : (
                    <span className="mt-1">
                      <SoonChip />
                    </span>
                  )}
                </>
              );
              return (
                <li key={tpl.slug} id={tpl.slug} className="scroll-mt-24">
                  {tpl.href ? (
                    <Link href={tpl.href} className="pt-tpl grid gap-1.5">
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
    </>
  );
}
