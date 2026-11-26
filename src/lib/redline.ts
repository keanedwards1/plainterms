import type { PtReviewIssue } from "@/lib/plainterms-schema";
import { findLoose, paragraphs, type Paragraph } from "@/lib/contractText";
import { diffWords, type DiffPart } from "@/lib/wordDiff";

export type LocatedRedline = { issue: PtReviewIssue; start: number; end: number };

/** Finds where each issue's redline applies in the displayed contract text. */
export function locateRedlines(text: string, issues: PtReviewIssue[]): LocatedRedline[] {
  const taken: Array<{ start: number; end: number }> = [];
  const out: LocatedRedline[] = [];
  for (const issue of issues) {
    if (!issue.redline) continue;
    const range = findLoose(text, issue.redline.before, taken);
    if (!range) continue;
    taken.push(range);
    out.push({ issue, ...range });
  }
  return out.sort((a, b) => a.start - b.start);
}

export type RedlineBlock = { paragraph: Paragraph; items: LocatedRedline[] };

/** Groups the contract into paragraphs, each with the redlines that fall inside it. */
export function redlineBlocks(text: string, located: LocatedRedline[]): RedlineBlock[] {
  return paragraphs(text).map((paragraph) => ({
    paragraph,
    items: located.filter((r) => r.start >= paragraph.start && r.end <= paragraph.end),
  }));
}

/**
 * The paragraph as diff parts: unchanged text, plus removed/added words for
 * each included change. `edits` holds the user's own wording for a change.
 */
export function blockParts(block: RedlineBlock, included: Set<string>, edits: Record<string, string>): DiffPart[] {
  const { paragraph } = block;
  const parts: DiffPart[] = [];
  let cursor = paragraph.start;
  const source = paragraph.text;
  const slice = (from: number, to: number) => source.slice(from - paragraph.start, to - paragraph.start);
  for (const item of block.items) {
    if (item.start > cursor) parts.push({ type: "eq", text: slice(cursor, item.start) });
    const before = slice(item.start, item.end);
    if (included.has(item.issue.id)) {
      const after = edits[item.issue.id] ?? item.issue.redline?.after ?? before;
      parts.push(...diffWords(before, after));
    } else {
      parts.push({ type: "eq", text: before });
    }
    cursor = item.end;
  }
  if (cursor < paragraph.end) parts.push({ type: "eq", text: slice(cursor, paragraph.end) });
  return parts;
}
