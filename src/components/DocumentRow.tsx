import Link from "next/link";
import type { DocumentSummary } from "@/lib/serverApi";
import { contractTitle } from "@/lib/contractText";
import LocalDate from "@/components/LocalDate";

/** A small page thumbnail showing the document's own first lines (or placeholder lines without text). */
export function DocThumb({ doc, roomForButton = false }: { doc: DocumentSummary; roomForButton?: boolean }) {
  const text = doc.preview?.trim() ?? "";
  if (!text) {
    return (
      <span className="pt-doc-thumb" aria-hidden="true">
        <span className={`truncate font-heading text-[0.8125rem] font-semibold ${roomForButton ? "pr-10" : ""}`}>{doc.fileName}</span>
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }
  const title = contractTitle(text, doc.fileName);
  const hasHeading = text.toLowerCase().startsWith(title.toLowerCase());
  return (
    <span className="pt-doc-thumb pt-doc-thumb-text" aria-hidden="true">
      {hasHeading ? <span className={`pt-doc-thumb-title ${roomForButton ? "pr-10" : ""}`}>{title}</span> : null}
      <span className="pt-doc-thumb-body">{hasHeading ? text.slice(title.length).trim() : text}</span>
    </span>
  );
}

const VERDICT_STYLES: Record<string, string> = {
  sign: "bg-(--pt-good-bg) text-(--pt-good)",
  negotiate: "bg-(--pt-warn-bg) text-(--pt-warn)",
  do_not_sign_yet: "bg-(--pt-bad-bg) text-(--pt-bad)",
};

const VERDICT_LABELS: Record<string, string> = {
  sign: "Looks fair",
  negotiate: "Negotiate",
  do_not_sign_yet: "Don't sign yet",
};

export const DATE_SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

export function formatDocumentDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function VerdictBadge({ action, refining }: { action: string; refining?: boolean }) {
  if (refining) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--pt-ink)_6%,transparent)] px-2.5 py-1 text-xs font-semibold text-(--pt-ink-soft)">
        <span className="pt-spinner text-[10px]" aria-hidden="true" />
        Analyzing
      </span>
    );
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_STYLES[action] ?? VERDICT_STYLES.negotiate}`}>
      {VERDICT_LABELS[action] ?? "Negotiate"}
    </span>
  );
}

/** One document in a list: name, date, verdict and risk. The whole row is the link. */
export default function DocumentRow({ doc, compact = false }: { doc: DocumentSummary; compact?: boolean }) {
  const refining = doc.status === "refining";
  return (
    <Link
      href={`/result/${encodeURIComponent(doc.id)}`}
      className="group flex items-center gap-3 rounded-(--pt-radius-pop) px-3 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--pt-ink)_4%,transparent)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--pt-surface-soft) text-(--pt-muted) ring-1 ring-(--pt-line)">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-(--pt-ink) group-hover:underline group-hover:underline-offset-4">
          {doc.fileName}
        </span>
        <span className="block text-sm text-(--pt-muted)">
          <LocalDate iso={doc.createdAt} options={DATE_SHORT} />
          {!compact && !refining ? ` · ${doc.flagCount} red flag${doc.flagCount === 1 ? "" : "s"}` : ""}
        </span>
      </span>
      {!compact && !refining ? (
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-semibold text-(--pt-ink)">{doc.riskScore}/100</span>
          <span className="block text-xs text-(--pt-muted)">risk</span>
        </span>
      ) : null}
      <VerdictBadge action={doc.recommendationAction} refining={refining} />
    </Link>
  );
}
