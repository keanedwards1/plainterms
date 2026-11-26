export type DiffPart = { type: "eq" | "del" | "ins"; text: string };

/** Splits into words with their trailing spaces, so joining the parts restores the text exactly. */
function tokens(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

const MAX_CELLS = 600_000;

function push(parts: DiffPart[], type: DiffPart["type"], text: string) {
  if (!text) return;
  const last = parts[parts.length - 1];
  if (last && last.type === type) last.text += text;
  else parts.push({ type, text });
}

/**
 * Word-level diff of two passages (LCS). Meant for clause-sized text; very long
 * inputs fall back to "all removed, all added".
 */
export function diffWords(before: string, after: string): DiffPart[] {
  if (before === after) return before ? [{ type: "eq", text: before }] : [];
  const a = tokens(before);
  const b = tokens(after);
  const key = (t: string) => t.trim().toLowerCase();

  // Trim the common start and end; most clause edits touch the middle.
  let start = 0;
  while (start < a.length && start < b.length && key(a[start]) === key(b[start])) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && key(a[endA - 1]) === key(b[endB - 1])) {
    endA -= 1;
    endB -= 1;
  }

  const parts: DiffPart[] = [];
  push(parts, "eq", a.slice(0, start).join(""));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  if (midA.length * midB.length > MAX_CELLS) {
    push(parts, "del", midA.join(""));
    push(parts, "ins", midB.join(""));
  } else {
    const n = midA.length;
    const m = midB.length;
    const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        table[i][j] = key(midA[i]) === key(midB[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (key(midA[i]) === key(midB[j])) {
        push(parts, "eq", midB[j]);
        i += 1;
        j += 1;
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        push(parts, "del", midA[i]);
        i += 1;
      } else {
        push(parts, "ins", midB[j]);
        j += 1;
      }
    }
    while (i < n) push(parts, "del", midA[i++]);
    while (j < m) push(parts, "ins", midB[j++]);
  }

  push(parts, "eq", b.slice(endB).join(""));
  return parts;
}

/** The text a diff produces when every change is accepted. */
export function acceptAll(parts: DiffPart[]): string {
  return parts.filter((p) => p.type !== "del").map((p) => p.text).join("");
}
