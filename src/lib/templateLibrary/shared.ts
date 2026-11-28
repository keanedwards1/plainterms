import type { TemplateField } from "@/lib/templateKit/types";

/** The usual closing clauses of a contract. Needs a {{governingState}} field. */
export const GENERAL_TERMS: string[] = [
  "Whole agreement. This agreement is the complete agreement between the parties about its subject and replaces any earlier promises, written or spoken, about the same thing.",
  "Changes. Any change to this agreement must be in writing and signed by both parties.",
  "Governing law. The laws of the State of {{governingState}} apply to this agreement.",
  "If part of it fails. If a court finds any part of this agreement unenforceable, the rest of the agreement still applies.",
  "No waiver. If a party does not enforce a right under this agreement right away, it can still enforce it later.",
  "Signing. The parties may sign this agreement in separate copies and electronically. Each signed copy counts as an original, and together they form one agreement.",
];

export const GOVERNING_STATE: TemplateField = {
  id: "governingState",
  label: "State whose law applies",
  type: "text",
  placeholder: "California",
  hint: "Usually the state where the work happens or where you live.",
};

/** Sender and recipient blanks for a letter. */
export const LETTER_FIELDS: TemplateField[] = [
  { id: "yourName", label: "Your name", type: "text", placeholder: "Jordan Lee" },
  { id: "yourAddress", label: "Your address", type: "long", placeholder: "48 Willow Ave, Apt 2\nPortland, OR 97214" },
  { id: "letterDate", label: "Date of the letter", type: "date" },
];
