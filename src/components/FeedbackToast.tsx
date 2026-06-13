"use client";

import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

type Stage = "prompt" | "testimonial" | "done";

interface Props {
  resultId: string;
}

export default function FeedbackToast({ resultId }: Props) {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<Stage>("prompt");
  const [rating, setRating] = useState<0 | 1 | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show after 18 seconds
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 18_000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (stage === "testimonial") inputRef.current?.focus();
  }, [stage]);

  async function submitRating(r: 0 | 1) {
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
        body: JSON.stringify({ result_id: resultId, rating, testimonial: text.trim() }),
      }).catch(() => {/* best-effort */});
    }
    setStage("done");
    setSubmitting(false);
    setTimeout(() => setVisible(false), 2500);
  }

  if (!visible) return null;

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
              onClick={() => submitRating(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pt-border)] bg-white text-xl transition-colors hover:border-emerald-400 hover:bg-emerald-50"
              aria-label="Good experience"
            >
              😊
            </button>
            <button
              type="button"
              onClick={() => submitRating(0)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pt-border)] bg-white text-xl transition-colors hover:border-red-300 hover:bg-red-50"
              aria-label="Poor experience"
            >
              😞
            </button>
            <button
              type="button"
              onClick={() => setVisible(false)}
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
              onClick={() => setVisible(false)}
              className="shrink-0 rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
            >
              Close
            </button>
          </div>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="&ldquo;PlainTerms saved me from signing a bad deal…&rdquo;"
            className="mt-3 w-full resize-none rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-sm text-[var(--pt-ink)] placeholder:text-[var(--pt-muted)]/60 focus:border-[var(--pt-accent)] focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setStage("done"); setTimeout(() => setVisible(false), 2500); }}
              className="rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={submitTestimonial}
              disabled={submitting || !text.trim()}
              className="rounded-md border border-[#d9654f] bg-[var(--pt-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Submit"}
            </button>
          </div>
        </>
      )}

      {stage === "done" && (
        <p className="text-sm text-[var(--pt-muted)]">
          Thanks for the feedback — it helps us improve. ✨
        </p>
      )}
    </div>
  );
}
