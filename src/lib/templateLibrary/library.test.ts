import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cleanValue, displayValue, fileName, fill, readDraft, tokensIn } from "@/lib/templateKit/fill";
import type { Block, TemplateDoc } from "@/lib/templateKit/types";
import { LIBRARY } from "@/lib/templateLibrary";
import { TEMPLATES, WRITTEN_TEMPLATES } from "@/lib/templates";

function textsOf(block: Block): string[] {
  switch (block.t) {
    case "title":
    case "h":
    case "p":
      return [block.text];
    case "ol":
    case "ul":
      return block.items;
    case "sign":
      return block.parties.flatMap((p) => [p.role, p.name ?? ""]);
    case "grid":
      return [...block.columns, ...block.rows];
  }
}

const tokensOf = (doc: TemplateDoc) => new Set(doc.body.flatMap(textsOf).flatMap(tokensIn));

describe("template library", () => {
  it("matches the written list on the templates page, one entry each", () => {
    const slugs = LIBRARY.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(slugs)).toEqual(WRITTEN_TEMPLATES);
    for (const slug of slugs) {
      const info = TEMPLATES.find((t) => t.slug === slug);
      expect(info, slug).toBeDefined();
      expect(info?.href).toBe(`/templates/${slug}`);
    }
  });

  it.each(LIBRARY.map((t) => [t.slug, t] as const))("%s: every blank is a field, every field is used and asked once", (_slug, doc) => {
    const ids = doc.fields.map((f) => f.id);
    expect(new Set(ids).size, "duplicate field ids").toBe(ids.length);
    const used = tokensOf(doc);
    for (const token of used) expect(ids, `{{${token}}} has no field`).toContain(token);
    for (const id of ids) expect(used.has(id), `field ${id} is never used`).toBe(true);
    const asked = doc.groups.flatMap((g) => g.fields);
    expect([...asked].sort(), "every field in exactly one group").toEqual([...ids].sort());
    expect(doc.notes.length).toBeGreaterThan(0);
  });
});

describe("template filling", () => {
  const doc = LIBRARY.find((t) => t.slug === "bill-of-sale")!;
  const field = (id: string) => doc.fields.find((f) => f.id === id)!;

  it("keeps answers as plain text and leaves empty blanks open", () => {
    const pieces = fill("Sold to {{buyerName}} for {{price}}.", doc, { buyerName: "<script>alert(1)</script>" });
    expect(pieces).toEqual([
      { kind: "text", text: "Sold to " },
      { kind: "blank", field: field("buyerName"), value: "<script>alert(1)</script>" },
      { kind: "text", text: " for " },
      { kind: "blank", field: field("price"), value: "" },
      { kind: "text", text: "." },
    ]);
  });

  it("formats dates and plain dollar amounts", () => {
    expect(displayValue(field("saleDate"), "2027-03-05")).toBe("March 5, 2027");
    expect(displayValue(field("price"), "650")).toBe("$650");
    expect(displayValue(field("price"), "1,234.5")).toBe("$1,234.50");
    expect(displayValue(field("price"), "about $600")).toBe("about $600");
  });

  it("strips control characters and caps length", () => {
    expect(cleanValue(field("buyerName"), "Sam\u0000 Rivera\n")).toBe("Sam Rivera");
    expect(cleanValue(field("itemDescription"), "line one\nline two")).toBe("line one\nline two");
    expect(cleanValue(field("buyerName"), "x".repeat(500))).toHaveLength(200);
    expect(cleanValue(field("buyerName"), 42)).toBe("");
  });

  it("accepts only a matching draft with known string fields", () => {
    expect(readDraft(doc, null)).toBeNull();
    expect(readDraft(doc, { slug: "nda", version: 1, values: {} })).toBeNull();
    expect(readDraft(doc, { slug: "bill-of-sale", version: 1, values: { buyerName: "Sam", evil: "x", price: { a: 1 } } })).toEqual({
      slug: "bill-of-sale",
      version: 1,
      values: { buyerName: "Sam" },
    });
  });

  it("makes safe file names", () => {
    expect(fileName({ ...doc, title: "../../etc/Bill of Sale!" }, "docx")).toBe("etc-bill-of-sale.docx");
  });
});

describe("Word download", () => {
  it.each(LIBRARY.map((t) => [t.slug, t] as const))("%s builds a Word file, filled and empty", async (_slug, doc) => {
    const { templateDocx } = await import("@/lib/templateKit/docx");
    const filled = Object.fromEntries(doc.fields.map((f) => [f.id, f.type === "date" ? "2027-03-05" : `${f.label} & <b>"x"</b>\nsecond line`]));
    for (const values of [{}, filled]) {
      const blob = await templateDocx(doc, values);
      expect(blob.size).toBeGreaterThan(2000);
    }
  });
});
