/**
 * A fill-in template: fixed text with {{blanks}}. Templates never branch on answers or add
 * clauses; people fill blanks, and an empty blank prints as a line to fill in by hand.
 */

export type FieldType = "text" | "long" | "date" | "money" | "email" | "phone" | "number";

export type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
};

export type FieldGroup = { title: string; fields: string[] };

export type Block =
  /** The document title. `aside` sits at the top right, e.g. "No. {{number}}". */
  | { t: "title"; text: string; aside?: string }
  | { t: "h"; text: string }
  /** A paragraph. "\n" starts a new line in the same paragraph. */
  | { t: "p"; text: string }
  | { t: "ol"; items: string[] }
  | { t: "ul"; items: string[] }
  /** Signature lines, one per party. `name` is usually a {{blank}}. */
  | { t: "sign"; parties: { role: string; name?: string }[] }
  /** A grid filled in by hand, like a room-by-room checklist. */
  | { t: "grid"; columns: string[]; rows: string[] }
  /** Bordered form boxes, like a printed business form: rows of 1 to 3 labelled cells. */
  | { t: "boxes"; rows: { label: string; value: string }[][] }
  /** A money table: labels on the left, amounts right-aligned, an optional bold total row. */
  | { t: "amounts"; rows: { label: string; value: string; total?: boolean }[] }
  /** The top of a standard business letter: sender, date, recipient and a bold "Re:" line. */
  | { t: "letter"; from: string; date: string; to: string; re: string }
  /**
   * A table whose cells can hold blanks, like invoice line items. `widths` are fractions of the page
   * width; `align` puts a column's text on the right (amounts). An empty cell string is left blank.
   */
  | { t: "table"; columns: string[]; widths: number[]; align?: ("left" | "right")[]; rows: string[][] }
  /** A contract section with its heading run into the text: "1. Payment. The client will…" */
  | { t: "clause"; title: string; text: string };

export type TemplateDoc = {
  slug: string;
  /** Bump when the wording changes, so a saved draft knows which text it was made from. */
  version: number;
  title: string;
  /** One line under the page title. */
  summary: string;
  fields: TemplateField[];
  groups: FieldGroup[];
  body: Block[];
  /** Plain warnings shown before downloading: when this template may not fit. */
  notes: string[];
  /** How empty blanks print: ruled lines (forms and contracts) or [bracketed labels] (letters, which are typed). */
  blanks?: "lines" | "brackets";
  /** Where the wording comes from, when it is based on a public-domain source. */
  basedOn?: string;
};

/** What a person typed, by field id. The same shape a saved draft will use. */
export type TemplateValues = Record<string, string>;

export type TemplateDraft = { slug: string; version: number; values: TemplateValues };

/**
 * A signer's line: the signature (a PNG drawn or typed in the browser) and the date beside it
 * (YYYY-MM-DD). Either can be filled without the other.
 */
export type SignatureMark = { image?: string; signedOn?: string };

/** Signatures by signer slot, keyed `${blockIndex}.${partyIndex}`. Kept in memory only. */
export type Signatures = Record<string, SignatureMark>;

/** The small "Made with PlainTerms" mark in the footer. Free plans show it; Pro removes it. */
export type Branding = { show: boolean; /** The logo as a PNG data URL, drawn in the browser. */ logo?: string };
