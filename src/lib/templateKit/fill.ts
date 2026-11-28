import type { FieldType, TemplateDoc, TemplateDraft, TemplateField, TemplateValues } from "@/lib/templateKit/types";

/** The longest answer each kind of field accepts. Keeps documents and drafts a sane size. */
export const MAX_LENGTH: Record<FieldType, number> = {
  text: 200,
  long: 2000,
  date: 10,
  money: 40,
  email: 254,
  phone: 40,
  number: 20,
};

export type Piece = { kind: "text"; text: string } | { kind: "blank"; field: TemplateField; value: string };

const TOKEN = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;

/** Every {{blank}} id used in a piece of template text. */
export function tokensIn(text: string): string[] {
  return [...text.matchAll(TOKEN)].map((m) => m[1]);
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** How an answer reads in the document: dates spelled out, plain amounts as dollars. */
export function displayValue(field: TemplateField, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (field.type === "date") {
    const m = DATE.exec(value);
    if (!m) return value;
    const month = MONTHS[Number(m[2]) - 1];
    return month ? `${month} ${Number(m[3])}, ${m[1]}` : value;
  }
  if (field.type === "money" && /^\d{1,12}(\.\d{1,2})?$/.test(value.replace(/,/g, ""))) {
    const n = Number(value.replace(/,/g, ""));
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
  }
  return value;
}

/**
 * Splits template text into fixed text and blanks. Answers stay plain strings: they are only ever
 * rendered as text (React text nodes, Word text runs), never as markup.
 */
export function fill(text: string, doc: TemplateDoc, values: TemplateValues): Piece[] {
  const byId = new Map(doc.fields.map((f) => [f.id, f]));
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    const field = byId.get(m[1]);
    if (field) out.push({ kind: "blank", field, value: displayValue(field, values[field.id] ?? "") });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Strips control characters (keeping new lines in long answers) and caps the length. */
export function cleanValue(field: TemplateField, raw: unknown): string {
  if (typeof raw !== "string") return "";
  const keepLines = field.type === "long";
  const stripped = raw.replace(keepLines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "");
  return stripped.slice(0, MAX_LENGTH[field.type]);
}

/**
 * Checks a draft from anywhere outside this page (session storage today, an account later):
 * only known fields, only strings, only within the length limits. Anything else is dropped.
 */
export function readDraft(doc: TemplateDoc, input: unknown): TemplateDraft | null {
  if (!input || typeof input !== "object") return null;
  const draft = input as Partial<TemplateDraft>;
  if (draft.slug !== doc.slug || typeof draft.version !== "number") return null;
  if (!draft.values || typeof draft.values !== "object") return null;
  const values: TemplateValues = {};
  for (const field of doc.fields) {
    const v = cleanValue(field, (draft.values as Record<string, unknown>)[field.id]);
    if (v) values[field.id] = v;
  }
  return { slug: doc.slug, version: draft.version, values };
}

/** A safe file name for a download: letters, digits and dashes only. */
export function fileName(doc: TemplateDoc, ext: "docx"): string {
  const base = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "document";
  return `${base}.${ext}`;
}
