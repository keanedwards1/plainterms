"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getOrCreateFunnelId } from "@/lib/funnelMetrics";
import {
  REPORT_TIER_DESCRIPTIONS,
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";
import {
  ContractSubmitError,
  FREE_STEP_ORDER,
  PAID_STEP_ORDER,
  prettyFileSize,
  stepLabel,
  submitContract,
  SUBMIT_STEP_DESCRIPTIONS,
  type ReviewChoice,
  type SubmitStep,
} from "@/lib/contractSubmit";

const TIER_ORDER: ReportTierOption[] = ["scan_39", "report_69", "protect_99"];
const LOCAL_STORAGE_REPORT_TIER_KEY = "pt.reportTier";

export default function AnalyzePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<SubmitStep | null>(null);
  const [checkoutCanceled, setCheckoutCanceled] = React.useState(false);
  const [reviewChoice, setReviewChoice] = React.useState<ReviewChoice>("report_69");
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const ACCEPTED_EXT = /\.(pdf|docx)$/i;

  function acceptDroppedFile(dropped: File | undefined) {
    if (!dropped) return;
    if (!ACCEPTED_EXT.test(dropped.name)) {
      setError("Please choose a PDF or DOCX file.");
      return;
    }
    setError(null);
    setFile(dropped);
  }

  const stepOrder = reviewChoice === "free" ? FREE_STEP_ORDER : PAID_STEP_ORDER;

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setCheckoutCanceled(url.searchParams.get("canceled") === "1");
  }, []);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_REPORT_TIER_KEY);
      if (stored && TIER_ORDER.includes(stored as ReportTierOption)) {
        setReviewChoice(stored as ReportTierOption);
      }
      // One-time handoff from the sample/preview pages; free stays the default afterward.
      window.localStorage.removeItem(LOCAL_STORAGE_REPORT_TIER_KEY);
    } catch {
      // Ignore storage failures; default stays on the free preview.
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose a contract file.");
      return;
    }

    setIsSubmitting(true);
    setStep("requesting-upload-url");

    try {
      const outcome = await submitContract({
        file,
        reviewChoice,
        funnelId: getOrCreateFunnelId(),
        onStep: setStep,
      });
      window.location.assign(outcome.url);
    } catch (err) {
      if (err instanceof ContractSubmitError) {
        setError(`${stepLabel(err.step)}: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setIsSubmitting(false);
      setStep(null);
    }
  }

  return (
    <main className="pt-page-pad pb-12 pt-8 3xl:pb-16 3xl:pt-12">
      <div className="pt-container-wide">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)] 3xl:text-base">
          ← Back to home
        </Link>

      <section className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] 3xl:mt-8 3xl:gap-8">
        <div>
          <p className="pt-kicker mb-3">
            Free risk preview
          </p>
          <h1 className="text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl 3xl:text-6xl">
            See the risk score before you pay.
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--pt-muted)] 3xl:text-lg 3xl:mt-6 3xl:max-w-2xl">
            Upload your renovation or contractor agreement as a PDF or DOCX and get a free risk
            score and red-flag count in minutes. Decide what level of review you need after you
            see the result.
          </p>
        </div>

        <aside className="flex flex-col rounded-[var(--pt-radius)] border border-[#cfe4fb] bg-[#eaf3fe] p-5 text-sm text-[var(--pt-muted)] shadow-[0_14px_26px_-24px_var(--pt-shadow)] 3xl:p-7">
          <div className="flex items-center gap-3">
            <Image
              src="/graphics/icon-shield.svg"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-xl border border-[#cfe4fb] bg-white p-2"
            />
            <h2 className="text-lg text-[var(--pt-ink)] 3xl:text-xl">Secure review flow</h2>
          </div>
          <ul className="mt-4 space-y-3 3xl:text-base">
            {[
              "Private upload and validation",
              "Free risk score before checkout",
              "Details unlock only after payment",
              "Informational only, not legal advice",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="mt-8 3xl:mt-10 3xl:grid 3xl:grid-cols-[1fr_0.52fr] 3xl:items-stretch 3xl:gap-8">
      <div className="pt-card p-6 3xl:p-8">
        <form onSubmit={onSubmit}>
          <label className="mb-3 block text-sm font-semibold text-[var(--pt-ink)] 3xl:text-base">
            Contract file (PDF or DOCX)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              acceptDroppedFile(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors 3xl:p-8 ${
              isDragging
                ? "border-[#0071e3] bg-[#eaf3fe]"
                : file
                  ? "border-[#2ba59f] bg-[#edf8f5]"
                  : "border-[var(--pt-border)] bg-[var(--pt-surface-soft)] hover:border-[var(--pt-accent)]"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="h-9 w-9 shrink-0 text-[#2ba59f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 2h8l4 4v16H6z" strokeLinejoin="round" />
                  <path d="M14 2v4h4" strokeLinejoin="round" />
                  <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[var(--pt-ink)] 3xl:text-base">{file.name}</p>
                  <p className="text-xs text-[var(--pt-muted)]">{prettyFileSize(file.size)} · click to replace</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="h-9 w-9 text-[var(--pt-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 15V3m0 0L8 7m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm text-[var(--pt-ink)] 3xl:text-base">
                  <span className="font-semibold text-[var(--pt-accent)]">Choose a file</span> or drag it here
                </p>
                <p className="text-xs text-[var(--pt-muted)]">PDF or DOCX</p>
              </div>
            )}
          </div>

          <fieldset className="mt-6">
            <legend className="mb-3 block text-sm font-semibold text-[var(--pt-ink)] 3xl:text-base">
              Choose your review
            </legend>
            <div className="grid gap-3 pt-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReviewChoice("free")}
                aria-pressed={reviewChoice === "free"}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  reviewChoice === "free"
                    ? "border-[var(--pt-accent)] bg-[#fff6f1] ring-1 ring-[var(--pt-accent)]"
                    : "border-[var(--pt-border)] bg-white hover:border-[var(--pt-accent)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--pt-ink)]">Free risk preview</p>
                  <p className="text-base font-semibold text-[#2ba59f]">$0</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--pt-muted)]">
                  Risk score and red-flag counts. Decide what to unlock after you see it.
                </p>
              </button>

              {TIER_ORDER.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setReviewChoice(tier)}
                  aria-pressed={reviewChoice === tier}
                  className={`relative rounded-xl border p-4 text-left transition-all ${
                    reviewChoice === tier
                      ? "border-[var(--pt-accent)] bg-[#fff6f1] ring-1 ring-[var(--pt-accent)]"
                      : "border-[var(--pt-border)] bg-white hover:border-[var(--pt-accent)]"
                  }`}
                >
                  {tier === "report_69" ? (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-[var(--pt-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--pt-accent-ink)] shadow-sm">
                      Most popular
                    </span>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--pt-ink)]">{REPORT_TIER_NAMES[tier]}</p>
                    <p className="text-base font-semibold text-[var(--pt-ink)]">{REPORT_TIER_PRICES[tier]}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--pt-muted)]">{REPORT_TIER_DESCRIPTIONS[tier]}</p>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap items-center gap-3 3xl:mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="pt-btn-primary px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 3xl:px-8 3xl:py-4 3xl:text-base"
            >
              {isSubmitting
                ? "Working..."
                : reviewChoice === "free"
                  ? "Check my contract risk"
                  : `Continue with ${REPORT_TIER_NAMES[reviewChoice]} ${REPORT_TIER_PRICES[reviewChoice]}`}
            </button>
            {isSubmitting && step && <p className="text-sm text-[var(--pt-muted)]">{stepLabel(step)}...</p>}
          </div>

          {isSubmitting && step && (
            <div className="mt-5 pt-card-soft p-4">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pt-accent)] opacity-35" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--pt-accent)]" />
                </span>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">{stepLabel(step)}</p>
              </div>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">{SUBMIT_STEP_DESCRIPTIONS[step]}</p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--pt-border)]">
                <div
                  className="h-full rounded-full bg-[var(--pt-accent)] transition-all duration-500"
                  style={{
                    width: `${((stepOrder.indexOf(step) + 1) / stepOrder.length) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-3 grid gap-2">
                {stepOrder.map((item, idx) => {
                  const currentIndex = stepOrder.indexOf(step);
                  const completed = idx < currentIndex;
                  const active = idx === currentIndex;
                  return (
                    <div key={item} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          completed
                            ? "bg-emerald-500"
                            : active
                              ? "animate-pulse bg-[var(--pt-accent)]"
                              : "bg-[var(--pt-border)]"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          completed || active ? "text-[var(--pt-ink)]" : "text-[var(--pt-muted)]"
                        }`}
                      >
                        {stepLabel(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="pt-alert-danger mt-5 p-3 text-sm">
              {error}
            </div>
          )}

          {checkoutCanceled && !error && (
            <div className="pt-alert-warn mt-5 p-3 text-sm">
              Checkout was canceled. Your free preview can be unlocked again when ready.
            </div>
          )}

        </form>
      </div>

      <aside className="hidden 3xl:block">
        <div className="pt-card h-full p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--pt-muted)">Clauses we cover</p>
          <p className="mt-1 text-sm text-(--pt-muted)">Every contract is analyzed across these areas.</p>
          <ul className="mt-5 space-y-2">
            {[
              "Who's Involved",
              "Scope of Work",
              "Deposit & Payment Schedule",
              "Change Orders",
              "Completion Timeline & Delays",
              "Mechanics Liens & Waivers",
              "Workmanship Warranty",
              "Permits & Inspections",
              "Liability & Indemnity",
              "Disputes & Governing Law",
              "Questions & Missing Info",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-(--pt-accent)" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-dashed border-(--pt-border) p-4">
            <p className="text-xs font-semibold text-(--pt-muted) uppercase tracking-[0.14em]">Your report also includes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Risk score", "Recommendation", "Red flags", "Negotiation points", "Questions to ask"].map((tag) => (
                <span key={tag} className="rounded-full border border-(--pt-border) bg-(--pt-surface-soft) px-2.5 py-1 text-xs font-semibold text-(--pt-muted)">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      </section>
      </div>
    </main>
  );
}
