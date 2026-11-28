import { describe, expect, it } from "vitest";
import { searchTemplates } from "@/lib/templateSearch";
import type { TemplateInfo } from "@/lib/templates";

const slugs = (query: string, list?: TemplateInfo[]) => searchTemplates(query, list).hits.map((h) => h.template.slug);

describe("searchTemplates", () => {
  it("returns nothing for an empty query", () => {
    expect(searchTemplates("   ")).toEqual({ hits: [], partial: false });
  });

  it("finds a template by the start of a word in its name", () => {
    expect(slugs("sub")[0]).toBe("sublease-agreement");
  });

  it("finds a template by another name people use", () => {
    expect(slugs("influencer")[0]).toBe("brand-deal");
    expect(slugs("NDA")[0]).toBe("nda");
    expect(slugs("IOU")).toContain("promissory-note");
  });

  it("ranks name matches above description matches", () => {
    const hits = slugs("lease");
    expect(hits.slice(0, 3)).toEqual(["lease-addendum", "residential-lease", "commercial-lease"]);
    expect(hits).toContain("sublease-agreement");
  });

  it("needs every word, and falls back to partial matches", () => {
    expect(slugs("vehicle sale")).toEqual(["vehicle-bill-of-sale"]);
    const outcome = searchTemplates("vehicle zebra");
    expect(outcome.partial).toBe(true);
    expect(outcome.hits[0]?.template.slug).toBe("vehicle-bill-of-sale");
  });

  it("searches templates added later", () => {
    const extra: TemplateInfo = { slug: "boat-sale", name: "Boat bill of sale", line: "Sells a boat.", group: "Buying and selling" };
    expect(slugs("boat", [extra])).toEqual(["boat-sale"]);
  });

  it("highlights the matched words in the name", () => {
    const [hit] = searchTemplates("demand").hits;
    expect(hit?.nameParts).toEqual([
      { text: "Demand", hit: true },
      { text: " letter", hit: false },
    ]);
  });
});
