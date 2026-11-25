"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDocumentDate, VerdictBadge } from "@/components/DocumentRow";
import Dialog from "@/components/ui/Dialog";
import type { DocumentSummary, DocumentsPage } from "@/lib/serverApi";

type Filter = "all" | "do_not_sign_yet" | "negotiate" | "sign";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "do_not_sign_yet", label: "Don't sign yet" },
  { key: "negotiate", label: "Negotiate" },
  { key: "sign", label: "Looks fair" },
];

function daysLeft(expiresAt: number | null) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt * 1000 - Date.now()) / 86_400_000));
}

function DocumentCard({ doc, isPro, onDelete }: { doc: DocumentSummary; isPro: boolean; onDelete: () => void }) {
  const refining = doc.status === "refining";
  const left = isPro ? null : daysLeft(doc.expiresAt);
  return (
    <li className="pt-doc relative">
      <Link href={`/result/${encodeURIComponent(doc.id)}`} className="grid gap-1 after:absolute after:inset-0 after:content-['']">
        <span className="pt-doc-thumb" aria-hidden="true">
          <span className="truncate pr-10 font-heading text-[0.8125rem] font-semibold">{doc.fileName}</span>
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="truncate font-medium">{doc.fileName}</span>
        <span className="text-sm text-(--pt-muted)">
          {formatDocumentDate(doc.createdAt)}
          {left !== null && left <= 7 ? (
            <span className="text-(--pt-warn)"> · {left === 0 ? "Expires today" : `${left} day${left === 1 ? "" : "s"} left`}</span>
          ) : null}
        </span>
      </Link>
      <span className="mt-2 flex items-center justify-between gap-2">
        <VerdictBadge action={doc.recommendationAction} refining={refining} />
        {refining ? null : (
          <span className="text-sm text-(--pt-muted)">
            Risk {doc.riskScore} · {doc.flagCount} flag{doc.flagCount === 1 ? "" : "s"}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${doc.fileName}`}
        className="absolute right-5 top-5 z-10 grid h-8 w-8 place-items-center rounded-(--pt-radius-control) border border-(--pt-line) bg-white text-(--pt-muted) transition-colors hover:border-(--pt-bad) hover:bg-(--pt-bad-bg) hover:text-(--pt-bad)"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
        </svg>
      </button>
    </li>
  );
}

export default function DocumentsBoard({ initial, isPro }: { initial: DocumentsPage | null; isPro: boolean }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initial?.documents ?? []);
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(initial ? null : "Your documents couldn't be loaded. Refresh to try again.");
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter(
      (doc) =>
        (!q || doc.fileName.toLowerCase().includes(q)) &&
        (filter === "all" || (doc.status !== "refining" && doc.recommendationAction === filter)),
    );
  }, [documents, query, filter]);

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
      <div className="pt-legal-pad flex flex-col items-start py-12">
        <h2 className="text-[1.75rem] tracking-[-0.045em]">Nothing here yet</h2>
        <p className="mt-2 max-w-md text-(--pt-muted)">Read a contract, lease or bid and it&apos;s saved here, so you can come back to it any time.</p>
        <Link href="/#start" className="pt-btn pt-btn-solid mt-6 h-11 px-5">
          Review a document
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Search documents</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--pt-muted)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name"
            className="h-10 w-full rounded-(--pt-radius-control) border-[1.5px] border-(--pt-ink) bg-white pl-10 pr-4 text-[0.9375rem] text-(--pt-ink) placeholder:text-(--pt-muted) focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Filter by verdict" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className="pt-btn-tag" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="pt-alert-danger mt-4 px-3.5 py-2.5 text-sm">
          {error}
        </p>
      ) : null}

      {visible.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} isPro={isPro} onDelete={() => setPendingDelete(doc)} />
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-center text-(--pt-muted)">
          {query ? <>No documents match &ldquo;{query}&rdquo;.</> : "No documents with that verdict."}
        </p>
      )}

      {cursor && !query && filter === "all" ? (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className="pt-btn pt-btn-outline h-10 px-5 text-sm">
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
