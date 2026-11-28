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
  | { t: "title"; text: string }
  | { t: "h"; text: string }
  /** A paragraph. "\n" starts a new line in the same paragraph. */
  | { t: "p"; text: string }
  | { t: "ol"; items: string[] }
  | { t: "ul"; items: string[] }
  /** Signature lines, one per party. `name` is usually a {{blank}}. */
  | { t: "sign"; parties: { role: string; name?: string }[] }
  /** A grid filled in by hand, like a room-by-room checklist. */
  | { t: "grid"; columns: string[]; rows: string[] };

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
  /** Where the wording comes from, when it is based on a public-domain source. */
  basedOn?: string;
};

/** What a person typed, by field id. The same shape a saved draft will use. */
export type TemplateValues = Record<string, string>;

export type TemplateDraft = { slug: string; version: number; values: TemplateValues };

/** A signature added in the browser: a PNG drawn or typed by the signer, and the day they signed. */
export type SignatureMark = { image: string; signedOn: string };

/** Signatures by signer slot, keyed `${blockIndex}.${partyIndex}`. Kept in memory only. */
export type Signatures = Record<string, SignatureMark>;

/** The small "Made with PlainTerms" mark in the footer. Free plans show it; Pro removes it. */
export type Branding = { show: boolean; /** The logo as a PNG data URL, drawn in the browser. */ logo?: string };
