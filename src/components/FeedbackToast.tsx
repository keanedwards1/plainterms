"use client";

import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

type Stage = "prompt" | "testimonial";
type Variant = "banner" | "modal";

interface Props {
  resultId: string;
  /** When this flips true, open the centered modal immediately (e.g. first Full Report tab visit). */
  externalTrigger?: boolean;
}

export default function FeedbackToast({ resultId, externalTrigger = false }: Props) {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>("banner");
  const [stage, setStage] = useState<Stage>("prompt");
  const [rating, setRating] = useState<0 | 1 | null>(null);
  const [text, setText] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dismissed = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Timer trigger → non-intrusive bottom banner after 45 seconds.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!dismissed.current) {
        setVariant("banner");
        setOpen(true);
      }
    }, 45_000);
    return () => clearTimeout(id);
  }, []);

  // External trigger (e.g. first Full Report tab click) → centered modal.
  useEffect(() => {
    if (externalTrigger && !dismissed.current) {
      setVariant("modal");
      setOpen(true);
    }
  }, [externalTrigger]);

  // Modal variant locks body scroll. Escape closes either variant.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeFeedback();
    }
    window.addEventListener("keydown", onKeyDown);

    let restore: (() => void) | undefined;
    if (variant === "modal") {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      restore = () => { document.body.style.overflow = previous; };
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      restore?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant]);

  useEffect(() => {
    if (stage === "testimonial") inputRef.current?.focus();
  }, [stage]);

  function closeFeedback() {
    dismissed.current = true;
    setOpen(false);
  }

  async function submitRating(r: 0 | 1) {
    dismissed.current = true;
    setRating(r);
    setStage("testimonial");
    // fire-and-forget the rating; testimonial submission happens on next step
    void fetch(`${getApiBaseUrl()}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result_id: resultId, rating: r }),
    }).catch(() => {/* best-effort */});
  }

  async function submitTestimonial() {
    if (submitting) return;
    setSubmitting(true);
    if (text.trim()) {
      await fetch(`${getApiBaseUrl()}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_id: resultId,
          rating,
          testimonial: text.trim(),
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
        }),
      }).catch(() => {/* best-effort */});
    }
    setSubmitting(false);
    closeFeedback();
  }

  function skipTestimonial() {
    closeFeedback();
  }

  if (!open) return null;

  // ── Shared stage bodies ───────────────────────────────────────────────────
  const testimonialFields = (
    <>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="&ldquo;PlainTerms saved me from signing a bad deal…&rdquo;"
        className="w-full resize-none rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-sm text-[var(--pt-ink)] placeholder:text-[var(--pt-muted)]/60 focus:border-[var(--pt-accent)] focus:outline-none"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={60}
          placeholder="First name (optional)"
          className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-sm text-[var(--pt-ink)] placeholder:text-[var(--pt-muted)]/60 focus:border-[var(--pt-accent)] focus:outline-none"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          maxLength={60}
          placeholder="Last name (optional)"
          className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-sm text-[var(--pt-ink)] placeholder:text-[var(--pt-muted)]/60 focus:border-[var(--pt-accent)] focus:outline-none"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={skipTestimonial}
          className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={submitTestimonial}
          disabled={submitting || !text.trim()}
          className="pt-btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
      </div>
    </>
  );

  // ── Banner variant (timer) ────────────────────────────────────────────────
  if (variant === "banner") {
    return (
      <div
        role="dialog"
        aria-label="Experience feedback"
        className="fixed bottom-5 left-1/2 z-[200] w-[min(92vw,440px)] -translate-x-1/2 rounded-lg border border-[var(--pt-border)] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(31,43,61,0.55)]"
      >
        {stage === "prompt" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--pt-ink)]">How was your experience?</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => submitRating(0)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pt-border)] bg-white text-xl transition-colors hover:border-red-300 hover:bg-red-50"
                aria-label="Poor experience"
              >
                ☹️
              </button>
              <button
                type="button"
                onClick={() => submitRating(1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pt-border)] bg-white text-xl transition-colors hover:border-emerald-400 hover:bg-emerald-50"
                aria-label="Good experience"
              >
                😊
              </button>
              <button
                type="button"
                onClick={closeFeedback}
                className="rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {stage === "testimonial" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">
                  {rating === 1 ? "Glad to hear it! 🎉" : "Thanks for letting us know."}
                </p>
                <p className="mt-0.5 text-xs text-[var(--pt-muted)]">
                  Want to leave a quick quote? We may feature it on the site.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFeedback}
                className="shrink-0 rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
              >
                Close
              </button>
            </div>
            <div className="mt-3">{testimonialFields}</div>
          </>
        )}
      </div>
    );
  }

  // ── Modal variant (Full Report first click) ───────────────────────────────
  const header = (() => {
    if (stage === "testimonial") {
      return {
        eyebrow: "Thank you",
        title: rating === 1 ? "Glad to hear it!" : "Thanks for the honesty.",
        description: "Want to leave a quick quote? We may feature it on the site.",
      };
    }
    return {
      eyebrow: "Your feedback",
      title: "How was your experience?",
      description: "It takes one tap — and helps us improve PlainTerms.",
    };
  })();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close feedback dialog"
        onClick={closeFeedback}
        className="fixed inset-0 bg-[#1f2b3d]/55 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={header.title}
        className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--pt-border)] bg-white shadow-[0_40px_90px_-30px_rgba(31,43,61,0.6)]"
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
                    d="M4 5h16v11H8l-4 3z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pt-accent)]">
                  {header.eyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-semibold leading-tight text-[var(--pt-ink)]">{header.title}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--pt-muted)]">{header.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeFeedback}
              aria-label="Close"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pt-ink)]/8 text-[var(--pt-muted)] transition-colors hover:bg-[var(--pt-ink)]/14"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {stage === "prompt" && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                type="button"
                onClick={() => submitRating(0)}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--pt-border)] bg-white text-3xl transition-colors hover:border-red-300 hover:bg-red-50"
                aria-label="Poor experience"
              >
                ☹️
              </button>
              <button
                type="button"
                onClick={() => submitRating(1)}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--pt-border)] bg-white text-3xl transition-colors hover:border-emerald-400 hover:bg-emerald-50"
                aria-label="Good experience"
              >
                😊
              </button>
            </div>
          )}

          {stage === "testimonial" && testimonialFields}
        </div>
      </div>
    </div>
  );
}
