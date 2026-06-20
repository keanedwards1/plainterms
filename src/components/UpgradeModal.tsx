"use client";

import { useEffect } from "react";
import {
  REPORT_TIER_DESCRIPTIONS,
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";
import { prettyFileSize } from "@/lib/contractSubmit";

// Optional inline upload step shown after a tier is chosen, so the user can
// upload their contract without leaving the page. When omitted, the modal
// behaves as a plain tier selector.
export type UploadStage = {
  tierName: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onStart: () => void;
  onBack: () => void;
  fallbackHref?: string;
};

const TIER_ORDER: ReportTierOption[] = ["scan_39", "report_69", "protect_99"];

const TIER_FEATURES: Record<ReportTierOption, string[]> = {
  scan_39: ["Priority risk summary", "Top issue spotting", "Sign-or-negotiate guidance"],
  report_69: ["Full red-flag review", "Clause-by-clause breakdown", "Questions to ask"],
  protect_99: ["Rewrite options", "Negotiation plan", "Ready-to-send email draft"],
};

export type CheckoutProcessing = {
  tier: ReportTierOption;
  stepNames: string[];
  stepIndex: number;
  stepLabel: string;
  stepDescription: string;
};

type UpgradeModalProps = {
  open: boolean;
  featureTitle: string;
  featureDescription: string;
  recommendedTier?: ReportTierOption;
  ctaPrefix?: string;
  processing?: CheckoutProcessing | null;
  error?: string | null;
  uploadStage?: UploadStage | null;
  onSelectTier: (tier: ReportTierOption) => void;
  onClose: () => void;
};

export default function UpgradeModal({
  open,
  featureTitle,
  featureDescription,
  recommendedTier = "report_69",
  ctaPrefix = "Unlock with",
  processing = null,
  error = null,
  uploadStage = null,
  onSelectTier,
  onClose,
}: UpgradeModalProps) {
  const isProcessing = Boolean(processing);
  const showUpload = !isProcessing && Boolean(uploadStage);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isProcessing, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close upgrade dialog"
        onClick={() => {
          if (!isProcessing) onClose();
        }}
        className="fixed inset-0 bg-[#1f2b3d]/55 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={featureTitle}
        className="relative z-10 w-full max-w-[860px] overflow-hidden rounded-2xl border border-[var(--pt-border)] bg-white shadow-[0_40px_90px_-30px_rgba(31,43,61,0.6)]"
      >
        {/* Header band */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#fff8f4] via-[#fef3ec] to-[#fdeae0] px-6 py-5 sm:px-8">
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[var(--pt-accent)]/10 blur-2xl" />
          <div className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-[#ffd4c2]/40 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--pt-accent)]/12 ring-1 ring-[var(--pt-accent)]/20">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-[var(--pt-accent)]">
                  <path
                    d="M4 9l3.5 2.5L12 5l4.5 6.5L20 9l-1.5 9h-13z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pt-accent)]">
                  Unlock with a plan
                </p>
                <h2 className="mt-1 text-2xl font-semibold leading-tight text-[var(--pt-ink)]">{featureTitle}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--pt-muted)]">{featureDescription}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isProcessing) onClose();
              }}
              disabled={isProcessing}
              aria-label="Close"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pt-ink)]/8 text-[var(--pt-muted)] transition-colors hover:bg-[var(--pt-ink)]/14 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {isProcessing && processing ? (
            <div className="mx-auto max-w-md py-6">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pt-accent)] opacity-40" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--pt-accent)]" />
                </span>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">{processing.stepLabel}</p>
              </div>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">{processing.stepDescription}</p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--pt-border)]">
                <div
                  className="h-full rounded-full bg-[var(--pt-accent)] transition-all duration-500"
                  style={{
                    width: `${((processing.stepIndex + 1) / processing.stepNames.length) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-4 grid gap-2">
                {processing.stepNames.map((name, idx) => {
                  const completed = idx < processing.stepIndex;
                  const active = idx === processing.stepIndex;
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          completed
                            ? "bg-emerald-500"
                            : active
                              ? "animate-pulse bg-[var(--pt-accent)]"
                              : "bg-[var(--pt-border)]"
                        }`}
                      />
                      <span className={`text-xs ${completed || active ? "text-[var(--pt-ink)]" : "text-[var(--pt-muted)]"}`}>
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 flex items-center gap-1.5 text-xs text-[var(--pt-muted)]">
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
                  <path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Encrypted, secure checkout via Stripe.
              </p>
            </div>
          ) : showUpload && uploadStage ? (
            <div className="mx-auto max-w-lg py-2">
              <button
                type="button"
                onClick={uploadStage.onBack}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--pt-muted)] transition-colors hover:text-[var(--pt-ink)]"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
                  <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to plans
              </button>

              <p className="mt-3 text-sm text-[var(--pt-muted)]">
                Selected plan: <span className="font-semibold text-[var(--pt-ink)]">{uploadStage.tierName}</span>
              </p>

              <label className="mt-3 block text-sm font-semibold text-[var(--pt-ink)]">
                Contract file (PDF or DOCX)
              </label>
              <div className="mt-2 rounded-2xl border-2 border-dashed border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-5">
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => uploadStage.onFileChange(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[var(--pt-ink)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--pt-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--pt-accent-ink)] hover:file:brightness-95"
                />
                {uploadStage.file ? (
                  <p className="mt-3 text-sm text-[var(--pt-muted)]">
                    Selected:{" "}
                    <span className="font-semibold text-[var(--pt-ink)]">{uploadStage.file.name}</span>{" "}
                    ({prettyFileSize(uploadStage.file.size)})
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="mt-3 rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={uploadStage.onStart}
                disabled={!uploadStage.file}
                className="pt-btn-primary mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start secure analysis
              </button>

              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs text-[var(--pt-muted)]">
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
                  <path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Private upload · secure Stripe checkout · not legal advice.
                {uploadStage.fallbackHref ? (
                  <a href={uploadStage.fallbackHref} className="font-semibold text-[var(--pt-ink)] underline">
                    Use the full upload page
                  </a>
                ) : null}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {TIER_ORDER.map((tier) => {
                  const recommended = tier === recommendedTier;
                  return (
                    <article
                      key={tier}
                      className={`relative flex flex-col rounded-xl border p-4 transition-colors ${
                        recommended
                          ? "border-[#de8f79] bg-[#fff6f1] shadow-[0_18px_36px_-28px_rgba(222,143,121,0.9)]"
                          : "border-[var(--pt-border)] bg-white"
                      }`}
                    >
                      {recommended ? (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-[#de8f79] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Most popular
                        </span>
                      ) : null}
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-base font-semibold text-[var(--pt-ink)]">{REPORT_TIER_NAMES[tier]}</p>
                        <p className="text-xl font-semibold text-[var(--pt-ink)]">{REPORT_TIER_PRICES[tier]}</p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--pt-muted)]">
                        {REPORT_TIER_DESCRIPTIONS[tier]}
                      </p>
                      <ul className="mt-3 flex-1 space-y-1.5 text-xs text-[var(--pt-ink)]/80">
                        {TIER_FEATURES[tier].map((item) => (
                          <li key={`${tier}-${item}`} className="flex items-start gap-1.5">
                            <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2ba59f]">
                              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => onSelectTier(tier)}
                        className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
                          recommended ? "pt-btn-primary" : "pt-btn-secondary"
                        }`}
                      >
                        {ctaPrefix} {REPORT_TIER_NAMES[tier]}
                      </button>
                    </article>
                  );
                })}
              </div>

              {error ? (
                <p className="mt-4 rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">
                  {error}
                </p>
              ) : null}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--pt-muted)]">
                <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
                  <path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                One-time payment · secure Stripe checkout · informational only, not legal advice.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
