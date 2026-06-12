"use client";

import { type ReactNode } from "react";

type LockedSummarySectionProps = {
  title: string;
  onUnlock: () => void;
  children: ReactNode;
};

export default function LockedSummarySection({ title, onUnlock, children }: LockedSummarySectionProps) {
  return (
    <article className="pt-card-soft p-3">
      <h3 className="text-lg font-semibold text-[var(--pt-ink)]">{title}</h3>
      <button
        type="button"
        onClick={onUnlock}
        aria-label={`Unlock ${title}`}
        className="group relative mt-2 block w-full text-left"
      >
        <div className="pointer-events-none select-none blur-[3px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_96%)]">
          {children}
        </div>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pt-border)] bg-white/95 px-3.5 py-1.5 text-sm font-semibold text-[var(--pt-ink)] shadow-sm transition-colors group-hover:border-[var(--pt-accent)] group-hover:text-[var(--pt-accent)]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
              <path
                d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Unlock to view
          </span>
        </span>
      </button>
    </article>
  );
}
