"use client";

import { useState, type ReactNode } from "react";

type TopFixesProps = {
  /** What to ask the other party for, most important first. */
  items: string[];
  /** Renders an item with glossary highlighting, when available. */
  renderItem?: (item: string, index: number) => ReactNode;
  onDraftEmail?: () => void;
  emptyMessage: string;
};

/**
 * The first thing a result shows: the few changes worth asking for, each
 * copyable, plus a one-click email draft. Shared by the real result page and
 * the sample report so both keep the same shape.
 */
export default function TopFixes({ items, renderItem, onDraftEmail, emptyMessage }: TopFixesProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fixes = items.slice(0, 3);

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1600);
    } catch {
      setCopiedIndex(null);
    }
  }

  return (
    <article className="rounded-xl border border-(--pt-line) bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-(--pt-ink)">Your top fixes</h3>
        {fixes.length && onDraftEmail ? (
          <button type="button" onClick={onDraftEmail} className="pt-btn pt-btn-outline px-3.5 py-1.5 text-sm">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
              <path d="M2.5 4.5L8 9l5.5-4.5" />
            </svg>
            Draft email with these
          </button>
        ) : null}
      </div>

      {fixes.length ? (
        <ol className="mt-3 space-y-2">
          {fixes.map((item, idx) => (
            <li key={`fix-${idx}`} className="flex items-start gap-3 rounded-lg border border-(--pt-line) bg-(--pt-surface-soft) px-3 py-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-(--pt-ink-soft) ring-1 ring-(--pt-line)">
                {idx + 1}
              </span>
              <p className="min-w-0 flex-1 text-[15px] leading-6 text-(--pt-ink)">{renderItem ? renderItem(item, idx) : item}</p>
              <button
                type="button"
                onClick={() => copy(item, idx)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-(--pt-muted) hover:bg-white hover:text-(--pt-ink)"
                aria-label={`Copy fix ${idx + 1}`}
              >
                {copiedIndex === idx ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-base text-emerald-900">{emptyMessage}</p>
      )}
      <span className="sr-only" role="status">
        {copiedIndex !== null ? "Copied to clipboard" : ""}
      </span>
    </article>
  );
}
