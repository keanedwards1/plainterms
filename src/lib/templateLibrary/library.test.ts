import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cleanValue, displayValue, fileName, fill, infoRows, isSignatureImage, readDraft, readSignatures, runIn, tokensIn } from "@/lib/templateKit/fill";
import type { Block, TemplateDoc } from "@/lib/templateKit/types";
import { LIBRARY } from "@/lib/templateLibrary";
import { TEMPLATES, WRITTEN_TEMPLATES } from "@/lib/templates";

function textsOf(block: Block): string[] {
  switch (block.t) {
    case "title":
      return [block.text, block.aside ?? ""];
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
    case "boxes":
      return block.rows.flatMap((r) => r.flatMap((c) => [c.label, c.value]));
    case "amounts":
      return block.rows.flatMap((r) => [r.label, r.value]);
    case "letter":
      return [block.from, block.date, block.to, block.re];
    case "clause":
      return [block.title, block.text];
    case "table":
      return [...block.columns, ...block.rows.flat()];
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
    expect(fileName({ ...doc, title: "Change Order No. {{changeNumber}}" }, "pdf", "blank")).toBe("change-order-no-blank.pdf");
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

const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const exampleValues = (doc: TemplateDoc) =>
  Object.fromEntries(doc.fields.map((f) => [f.id, f.type === "date" ? "2027-03-05" : f.placeholder || f.label]));
const allSigned = (doc: TemplateDoc) =>
  Object.fromEntries(
    doc.body.flatMap((b, i) => (b.t === "sign" ? b.parties.map((_, j) => [`${i}.${j}`, { image: SIG, signedOn: "2027-03-05" }]) : []))
  );

describe("PDF download", () => {
  // The real PDF layout, blank and filled in with example answers: US Letter, 2 pages at most.
  it.each(LIBRARY.map((t) => [t.slug, t] as const))("%s fits on 2 Letter pages", async (_slug, doc) => {
    const { templatePdf } = await import("@/lib/templateKit/pdf");
    for (const [values, signatures] of [[{}, {}], [exampleValues(doc), allSigned(doc)]] as const) {
      const blob = await templatePdf(doc, values, signatures);
      const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
      expect(text.startsWith("%PDF-")).toBe(true);
      expect(text).toContain("/MediaBox [0 0 612. 792.]");
      const pages = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
      expect(pages).toBeGreaterThanOrEqual(1);
      expect(pages).toBeLessThanOrEqual(2);
    }
  });

  it("builds a Word file with signatures", async () => {
    const { templateDocx } = await import("@/lib/templateKit/docx");
    const doc = LIBRARY.find((t) => t.slug === "change-order")!;
    const blob = await templateDocx(doc, exampleValues(doc), allSigned(doc));
    expect(blob.size).toBeGreaterThan(2000);
  });
});

describe("signatures", () => {
  const doc = LIBRARY.find((t) => t.slug === "change-order")!;
  const signIndex = doc.body.findIndex((b) => b.t === "sign");

  it("keeps only real signer slots with PNG images", () => {
    expect(
      readSignatures(doc, {
        [`${signIndex}.0`]: { image: SIG, signedOn: "2027-03-05" },
        [`${signIndex}.9`]: { image: SIG, signedOn: "x" },
        "0.0": { image: SIG, signedOn: "x" },
        [`${signIndex}.1`]: { image: "javascript:alert(1)", signedOn: "x" },
        evil: { image: SIG, signedOn: "x" },
      })
    ).toEqual({ [`${signIndex}.0`]: { image: SIG, signedOn: "2027-03-05" } });
    expect(readSignatures(doc, "nope")).toEqual({});
    // A date on its own is kept; a date that isn't YYYY-MM-DD is dropped.
    expect(readSignatures(doc, { [`${signIndex}.1`]: { signedOn: "2027-03-05" } })).toEqual({ [`${signIndex}.1`]: { signedOn: "2027-03-05" } });
    expect(readSignatures(doc, { [`${signIndex}.1`]: { signedOn: "<b>soon</b>" } })).toEqual({});
  });

  it("only accepts PNG data URLs", () => {
    expect(isSignatureImage(SIG)).toBe(true);
    expect(isSignatureImage("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isSignatureImage(`data:image/png;base64,${"A".repeat(500_000)}`)).toBe(false);
  });
});

describe("form rows", () => {
  it("treats label-and-blank paragraphs as form rows", () => {
    expect(infoRows("Date: {{a}}\nOwner: {{b}}")).toEqual([
      { label: "Date", text: "{{a}}" },
      { label: "Owner", text: "{{b}}" },
    ]);
    expect(infoRows("Date: {{a}}\nBetween {{b}} and {{c}}")).toBeNull();
    expect(infoRows("Date: {{a}}")).toEqual([{ label: "Date", text: "{{a}}" }]);
    expect(infoRows("Paid: {{a}}.")).toBeNull();
  });
});

describe("list titles", () => {
  it("bolds short leading titles only", () => {
    expect(runIn("Whole agreement. This agreement is the complete agreement.")).toEqual({ title: "Whole agreement.", rest: "This agreement is the complete agreement." });
    expect(runIn("Food and belongings are not shared unless the owner says so.")).toBeNull();
    expect(runIn("is or becomes public through no fault of the recipient;")).toBeNull();
  });
});
