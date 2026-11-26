"use client";

import { buildIndex, type DocumentIndex, type SearchRecord } from "@/lib/documentSearch";

/**
 * Loads the signed-in user's search index once and keeps it in memory, so
 * every keystroke after that searches locally with no network round trip.
 * Refreshed when it is older than `maxAgeMs`, or after a change (invalidate).
 */

const MAX_AGE_MS = 2 * 60 * 1000;
const MAX_PAGES = 25;

let cached: { index: DocumentIndex; records: SearchRecord[]; loadedAt: number } | null = null;
let inflight: Promise<{ index: DocumentIndex; records: SearchRecord[] }> | null = null;

function isRecord(value: unknown): value is SearchRecord {
  const r = value as SearchRecord;
  return Boolean(r) && typeof r.id === "string" && typeof r.fileName === "string" && typeof r.text === "string" && Array.isArray(r.parties);
}

async function fetchAll(): Promise<SearchRecord[]> {
  const records: SearchRecord[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await fetch(`/api/documents/search-index${query}`, { cache: "no-store" });
    if (!res.ok) throw new Error("search_index_failed");
    const body = (await res.json()) as { documents?: unknown[]; nextCursor?: string | null };
    records.push(...(body.documents ?? []).filter(isRecord));
    cursor = body.nextCursor ?? null;
    if (!cursor) break;
  }
  return records;
}

export function peekDocumentIndex() {
  return cached;
}

export function loadDocumentIndex({ maxAgeMs = MAX_AGE_MS } = {}) {
  if (cached && Date.now() - cached.loadedAt < maxAgeMs) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetchAll()
    .then((records) => {
      cached = { index: buildIndex(records), records, loadedAt: Date.now() };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateDocumentIndex() {
  cached = null;
}
