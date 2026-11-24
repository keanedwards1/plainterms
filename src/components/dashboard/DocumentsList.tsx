"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DocumentRow from "@/components/DocumentRow";
import Dialog from "@/components/ui/Dialog";
import type { DocumentSummary, DocumentsPage } from "@/lib/serverApi";

type DocumentsListProps = {
  initial: DocumentsPage | null;
  isPro: boolean;
};

function daysLeft(expiresAt: number | null) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt * 1000 - Date.now()) / 86_400_000));
}

export default function DocumentsList({ initial, isPro }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initial?.documents ?? []);
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null);
  const [query, setQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(initial ? null : "Your documents couldn't be loaded. Refresh to try again.");
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? documents.filter((doc) => doc.fileName.toLowerCase().includes(q)) : documents;
  }, [documents, query]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const page = (await res.json()) as DocumentsPage;
      setDocuments((current) => [...current, ...page.documents.filter((d) => !current.some((c) => c.id === d.id))]);
      setCursor(page.nextCursor);
    } catch {
      setError("More documents couldn't be loaded. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDocuments((current) => current.filter((doc) => doc.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch {
      setError("That document couldn't be deleted. Please try again.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!documents.length && !error) {
    return (
      <div className="pt-panel flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--pt-surface-soft) text-(--pt-action) ring-1 ring-(--pt-line)">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 12v6M9 15h6" />
          </svg>
        </span>
        <h2 className="mt-4 text-2xl text-(--pt-ink)">No documents yet</h2>
        <p className="mt-2 max-w-sm text-(--pt-muted)">
          Analyze a contract and it&apos;s saved here, so you can come back to it any time.
        </p>
        <Link href="/" className="pt-btn pt-btn-solid mt-6 px-6 py-3">
          Analyze a contract
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-panel p-2 sm:p-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2 pt-1 sm:px-3">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search documents</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--pt-muted)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name"
            className="w-full rounded-full border border-(--pt-line) bg-(--pt-surface-soft) py-2 pl-9 pr-4 text-sm text-(--pt-ink) placeholder:text-(--pt-muted)"
          />
        </label>
        <p className="text-sm text-(--pt-muted)">
          {isPro ? "Kept until you delete them" : "Free documents are kept for 30 days"}
        </p>
      </div>

      {error ? (
        <p role="alert" className="pt-alert-danger mx-2 my-2 px-3 py-2 text-sm sm:mx-3">
          {error}
        </p>
      ) : null}

      {visible.length ? (
        <ul className="divide-y divide-(--pt-line)">
          {visible.map((doc) => {
            const left = isPro ? null : daysLeft(doc.expiresAt);
            return (
              <li key={doc.id} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <DocumentRow doc={doc} />
                </div>
                {left !== null && left <= 7 ? (
                  <span className="hidden shrink-0 text-xs font-medium text-(--pt-warn) md:inline">
                    {left === 0 ? "Expires today" : `${left} day${left === 1 ? "" : "s"} left`}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPendingDelete(doc)}
                  className="shrink-0 rounded-lg p-2 text-(--pt-muted) transition-colors hover:bg-(--pt-bad-bg) hover:text-(--pt-bad)"
                  aria-label={`Delete ${doc.fileName}`}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3 py-8 text-center text-sm text-(--pt-muted)">No documents match &ldquo;{query}&rdquo;.</p>
      )}

      {cursor && !query ? (
        <div className="flex justify-center p-3">
          <button type="button" onClick={loadMore} disabled={loadingMore} className="pt-btn pt-btn-outline px-5 py-2 text-sm">
            {loadingMore ? <span className="pt-spinner" aria-hidden="true" /> : null}
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        </div>
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        dismissible={!deleting}
        title="Delete this document?"
        description={
          pendingDelete ? (
            <>
              <span className="font-semibold text-(--pt-ink)">{pendingDelete.fileName}</span> and its analysis will be
              permanently deleted. This can&apos;t be undone.
            </>
          ) : null
        }
      >
        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <button type="button" onClick={confirmDelete} disabled={deleting} className="pt-btn pt-btn-danger px-5 py-2.5">
            {deleting ? <span className="pt-spinner" aria-hidden="true" /> : null}
            Delete
          </button>
          <button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="pt-btn pt-btn-outline px-5 py-2.5" autoFocus>
            Keep it
          </button>
        </div>
      </Dialog>
    </div>
  );
}
