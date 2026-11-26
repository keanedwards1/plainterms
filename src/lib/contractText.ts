/**
 * Helpers for showing extracted contract text: restoring paragraph breaks and
 * finding quoted passages despite differences in spacing, quote marks and dashes.
 */

/**
 * Re-inserts paragraph breaks into whitespace-collapsed extracted text. Only
 * inserts whitespace, so loose matching against the original still works.
 */
export function formatContractText(value: string): string {
  if (!value) return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/([^\d,\n])[ \t]+(\d{1,2}\.\s+[A-Z][a-z])/g, "$1\n\n$2")
    .replace(/[ \t]+(Signed:|Signed,|Signatures\b|IN WITNESS WHEREOF)/g, "\n\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type Paragraph = { start: number; end: number; text: string };

/** Splits text on blank lines, keeping each paragraph's offsets in the full text. */
export function paragraphs(text: string): Paragraph[] {
  const out: Paragraph[] = [];
  const re = /\n\s*\n/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ start: last, end: m.index, text: text.slice(last, m.index) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ start: last, end: text.length, text: text.slice(last) });
  return out;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const QUOTE_SINGLE = "['‘’‛′`]";
const QUOTE_DOUBLE = "[\"“”‟″]";
const DASH = "[-‐‑‒–—−]";

/** Builds a regex that matches `snippet` with any spacing, quote style, dash style or case. */
function looseRegex(snippet: string) {
  const body = snippet
    .trim()
    .split(/\s+/)
    .map((word) =>
      escapeRegex(word)
        .replace(/['‘’‛′`]/g, QUOTE_SINGLE)
        .replace(/["“”‟″]/g, QUOTE_DOUBLE)
        .replace(/[-‐‑‒–—−]/g, DASH)
    )
    .join("\\s+");
  return new RegExp(body, "gi");
}

/** Finds `snippet` in `text` and returns its range, skipping ranges already taken. */
export function findLoose(text: string, snippet: string, taken: Array<{ start: number; end: number }> = []) {
  if (!text || !snippet || snippet.trim().length < 3) return null;
  const re = looseRegex(snippet);
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const start = m.index;
    const end = start + m[0].length;
    if (!taken.some((t) => start < t.end && end > t.start)) return { start, end };
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return null;
}

/** A readable title from the contract's own heading (e.g. "Production services agreement"), else the file name. */
export function contractTitle(text: string, fileName?: string) {
  const first = text.split("\n")[0]?.match(/^([A-Z][A-Z &,'-]{6,60}?)(?=\s+(?:Date|This|THIS|Dated|Effective|\d)|$)/)?.[1];
  if (first && first === first.toUpperCase()) {
    const lower = first.trim().toLowerCase();
    return lower[0].toUpperCase() + lower.slice(1);
  }
  return (fileName ?? "Your contract").replace(/\.[a-z0-9]{2,5}$/i, "");
}
