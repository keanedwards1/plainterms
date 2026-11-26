import MiniSearch, { type SearchOptions, type SearchResult } from "minisearch";
import type { DocumentSummary } from "@/lib/serverApi";
import { contractTitle } from "@/lib/contractText";

/**
 * Search over the user's documents, in the browser, as they type.
 *
 * - Every word must match (like Apple Notes), and each word matches as a prefix,
 *   so results narrow with each keystroke.
 * - Longer words forgive a typo; plurals and possessives match their base word.
 * - Titles, parties and file names count more than the contract text, recent
 *   documents get a small lift, and "quoted phrases" must appear as written.
 * - When nothing matches every word, it falls back to the closest results and
 *   offers a "did you mean" (like Google).
 */

export type SearchRecord = DocumentSummary & {
  parties: string[];
  verdict: string;
  issues: Array<{ title: string; why: string }>;
  deal: string[];
  gaps: string[];
  text: string;
};

export type Segment = { text: string; hit: boolean };

export type SearchHit = {
  record: SearchRecord;
  title: string;
  titleParts: Segment[];
  snippet: Segment[];
  /** Where the best match was found, for the small label under a result. */
  where: "title" | "parties" | "file" | "review" | "contract";
};

export type SearchOutcome = { hits: SearchHit[]; partial: boolean; suggestion: string | null };

type IndexedDoc = { id: string; title: string; fileName: string; parties: string; review: string; text: string };

const FIELDS = ["title", "fileName", "parties", "review", "text"] as const;
const BOOST = { title: 5, parties: 4, fileName: 4, review: 1.5, text: 1 };

/** Lowercase, no accents, straight quotes, so "Café" finds "cafe". */
export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‛′`]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .toLowerCase();
}

/** One indexed or searched word: normalized, possessives and simple plurals folded. */
export function processTerm(term: string): string | null {
  let t = normalize(term).replace(/^[^a-z0-9$%]+|[^a-z0-9%]+$/g, "");
  if (!t) return null;
  t = t.replace(/'s$/, "");
  if (t.length > 4 && t.endsWith("ies")) t = `${t.slice(0, -3)}y`;
  else if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us")) t = t.slice(0, -1);
  return t || null;
}

function toIndexed(r: SearchRecord): IndexedDoc {
  return {
    id: r.id,
    title: contractTitle(r.text, r.fileName),
    fileName: r.fileName.replace(/[._-]+/g, " "),
    parties: r.parties.join(" "),
    review: [r.verdict, ...r.issues.flatMap((i) => [i.title, i.why]), ...r.deal, ...r.gaps].join(" "),
    text: r.text,
  };
}

export type DocumentIndex = { mini: MiniSearch<IndexedDoc>; records: Map<string, SearchRecord>; titles: Map<string, string> };

export function buildIndex(records: SearchRecord[]): DocumentIndex {
  const mini = new MiniSearch<IndexedDoc>({ fields: [...FIELDS], storeFields: [], processTerm });
  const docs = records.map(toIndexed);
  mini.addAll(docs);
  return {
    mini,
    records: new Map(records.map((r) => [r.id, r])),
    titles: new Map(docs.map((d) => [d.id, d.title])),
  };
}

/** Splits a query into loose words and "exact phrases". */
export function parseQuery(query: string): { words: string; phrases: string[] } {
  const phrases: string[] = [];
  const words = query.replace(/["“”]([^"“”]+)["“”]?/g, (_m, phrase: string) => {
    if (phrase.trim()) phrases.push(phrase.trim());
    return ` ${phrase} `;
  });
  return { words: words.trim(), phrases };
}

// Words too common to narrow anything, ignored unless they're all you typed.
const STOP_WORDS = new Set(["a", "an", "the", "of", "and", "or", "to", "in", "for", "on", "with", "by", "is", "are", "be", "at", "as", "it"]);

/** The words worth searching for: single letters and filler words drop out. */
export function meaningfulWords(words: string): string[] {
  const all = words.split(/\s+/).filter((w) => (processTerm(w) ?? "").length >= 2);
  const kept = all.filter((w) => !STOP_WORDS.has(normalize(w)));
  return kept.length ? kept : all;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A regex that finds the matched words (and their plural or longer forms) in raw text. */
function hitRegex(terms: string[]): RegExp | null {
  const forms = new Set<string>();
  for (const term of terms) {
    if (!term || term.length < 2) continue;
    forms.add(escapeRegex(term));
    if (term.endsWith("y")) forms.add(`${escapeRegex(term.slice(0, -1))}ies`);
  }
  if (!forms.size) return null;
  const sorted = [...forms].sort((a, b) => b.length - a.length);
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${sorted.join("|")})[\\p{L}\\p{N}'’]*`, "giu");
}

/** Splits text into plain and highlighted parts. */
export function highlight(text: string, terms: string[]): Segment[] {
  const re = hitRegex(terms);
  if (!re || !text) return text ? [{ text, hit: false }] : [];
  const out: Segment[] = [];
  let last = 0;
  for (const m of normalize(text).matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: text.slice(last, start), hit: false });
    out.push({ text: text.slice(start, start + m[0].length), hit: true });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}

/** The ~180-character stretch of `text` with the most different matched words, trimmed to whole words. */
export function bestSnippet(text: string, terms: string[], width = 180): Segment[] {
  const re = hitRegex(terms);
  if (!re || !text) return [];
  const hits = [...normalize(text).matchAll(re)].map((m) => ({ at: m.index ?? 0, word: m[0] }));
  if (!hits.length) return [];
  let best = { start: hits[0].at, score: -1 };
  for (let i = 0; i < hits.length; i += 1) {
    const words = new Set<string>();
    for (let j = i; j < hits.length && hits[j].at - hits[i].at < width - 20; j += 1) words.add(hits[j].word);
    if (words.size > best.score) best = { start: hits[i].at, score: words.size };
  }
  let start = Math.max(0, best.start - 50);
  let end = Math.min(text.length, start + width);
  if (start > 0) start = text.indexOf(" ", start) + 1 || start;
  if (end < text.length) end = text.lastIndexOf(" ", end) > start ? text.lastIndexOf(" ", end) : end;
  const parts = highlight(text.slice(start, end), terms);
  if (start > 0) parts.unshift({ text: "…", hit: false });
  if (end < text.length) parts.push({ text: "…", hit: false });
  return parts;
}

function options(combineWith: "AND" | "OR", now: number, records: Map<string, SearchRecord>): SearchOptions {
  return {
    combineWith,
    boost: BOOST,
    // Every word matches as a prefix, so "termin" already finds "termination".
    prefix: (term) => term.length >= 2,
    // Long words forgive one typo; short ones don't, or "cost" would match "most".
    fuzzy: (term) => (term.length >= 6 ? 0.2 : false),
    weights: { fuzzy: 0.45, prefix: 0.75 },
    // Newer documents get up to a 15% lift.
    boostDocument: (id) => {
      const created = Date.parse(records.get(String(id))?.createdAt ?? "");
      if (!Number.isFinite(created)) return 1;
      return 1 + 0.15 * Math.exp(-(now - created) / (180 * 86_400_000));
    },
  };
}

function whereMatched(result: SearchResult): SearchHit["where"] {
  const fields = new Set(Object.values(result.match).flat());
  if (fields.has("title")) return "title";
  if (fields.has("parties")) return "parties";
  if (fields.has("fileName")) return "file";
  if (fields.has("review")) return "review";
  return "contract";
}

export function searchDocuments(index: DocumentIndex, query: string, { limit = 30, now = Date.now() } = {}): SearchOutcome {
  const parsed = parseQuery(query);
  const { phrases } = parsed;
  const terms = meaningfulWords(parsed.words);
  if (!terms.length) return { hits: [], partial: false, suggestion: null };
  const words = terms.join(" ");

  let partial = false;
  let results = index.mini.search(words, options("AND", now, index.records));
  if (phrases.length) {
    const wanted = phrases.map((p) => normalize(p).replace(/\s+/g, " "));
    results = results.filter((r) => {
      const rec = index.records.get(String(r.id));
      const hay = normalize([index.titles.get(String(r.id)), rec?.fileName, rec?.parties.join(" "), rec?.text, rec?.issues.map((i) => `${i.title} ${i.why}`).join(" ")].join(" ")).replace(/\s+/g, " ");
      return wanted.every((p) => hay.includes(p));
    });
  }
  // Only fall back to "some of your words" when those words are real words, not fragments.
  if (!results.length && !phrases.length && terms.length > 1 && terms.every((t) => t.length >= 3)) {
    results = index.mini.search(words, options("OR", now, index.records));
    partial = results.length > 0;
  }

  // "Did you mean": one corrected word per typed word, for real words only.
  let suggestion: string | null = null;
  if ((!results.length || partial) && terms.length <= 4 && terms.every((t) => t.length >= 4)) {
    const corrected = terms.map((t) => {
      const best = index.mini.autoSuggest(t, { fuzzy: 0.34, prefix: false, processTerm })[0]?.terms?.[0];
      return best ?? normalize(t);
    });
    const guess = corrected.join(" ");
    if (guess !== terms.map((t) => normalize(t)).join(" ")) suggestion = guess;
  }

  const hits = results.slice(0, limit).flatMap((r): SearchHit[] => {
    const record = index.records.get(String(r.id));
    if (!record) return [];
    const title = index.titles.get(record.id) ?? record.fileName;
    const terms = r.terms;
    const where = whereMatched(r);
    const issueText = record.issues.map((i) => `${i.title}. ${i.why}`).join(" ");
    const snippet =
      where === "review"
        ? bestSnippet(issueText || [record.verdict, ...record.deal].join(" "), terms)
        : where === "contract"
          ? bestSnippet(record.text, terms)
          : where === "parties"
            ? highlight(record.parties.join(" and "), terms)
            : bestSnippet(record.text, terms);
    return [{ record, title, titleParts: highlight(title, terms), snippet, where }];
  });

  return { hits, partial, suggestion };
}
