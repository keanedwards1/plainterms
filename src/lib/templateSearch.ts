import { highlight, normalize, type Segment } from "@/lib/documentSearch";
import { TEMPLATES, type TemplateInfo } from "@/lib/templates";

export type TemplateHit = { template: TemplateInfo; nameParts: Segment[] };
export type TemplateOutcome = { hits: TemplateHit[]; partial: boolean };

function words(text: string): string[] {
  return normalize(text).split(/[^a-z0-9$%]+/).filter(Boolean);
}

/** How well one typed word matches a template: 3 for its name, 2 for its other names, 1 for its description. */
function scoreTerm(term: string, name: string[], keywords: string[], rest: string[]): number {
  const hit = (list: string[]) => list.some((w) => w.startsWith(term));
  if (hit(name)) return 3;
  if (hit(keywords)) return 2;
  if (hit(rest)) return 1;
  return 0;
}

/**
 * Searches the template list by name, other names, group and description. Every template in
 * `TEMPLATES` is searchable, so new ones are found as soon as they're added there.
 * Words match the start of a word ("sub" finds "Sublease"). If no template has every word,
 * the ones that match some of them are returned, marked partial.
 */
export function searchTemplates(query: string, templates: TemplateInfo[] = TEMPLATES): TemplateOutcome {
  const terms = [...new Set(words(query))];
  if (!terms.length) return { hits: [], partial: false };

  const scored = templates.map((template, order) => {
    const name = words(template.name);
    const keywords = words(`${template.keywords ?? ""} ${template.slug}`);
    const rest = words(`${template.line} ${template.group}`);
    const scores = terms.map((t) => scoreTerm(t, name, keywords, rest));
    const nameStarts = normalize(template.name).startsWith(normalize(query.trim())) ? 1 : 0;
    return {
      template,
      order,
      matched: scores.filter(Boolean).length,
      score: scores.reduce((a, b) => a + b, 0) + nameStarts,
    };
  });

  const full = scored.filter((s) => s.matched === terms.length);
  const partial = !full.length;
  const pool = partial ? scored.filter((s) => s.matched > 0) : full;
  pool.sort((a, b) => b.matched - a.matched || b.score - a.score || a.order - b.order);

  return {
    hits: pool.map((s) => ({ template: s.template, nameParts: highlight(s.template.name, terms) })),
    partial: partial && pool.length > 0,
  };
}
