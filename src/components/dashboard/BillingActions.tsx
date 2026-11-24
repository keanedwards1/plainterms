"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/components/ui/Dialog";
import { startProCheckout } from "@/components/ProUpgradeDialog";

type BillingActionsProps = {
  isPro: boolean;
  hasBillingAccount: boolean;
  cancelAtPeriodEnd: boolean;
  /** Human-readable end of the current paid period, e.g. "December 24, 2026". */
  periodEndLabel: string | null;
};

const REASONS = [
  { value: "", label: "Choose a reason (optional)" },
  { value: "too_expensive", label: "It's too expensive" },
  { value: "unused", label: "I don't use it enough" },
  { value: "missing_features", label: "It's missing something I need" },
  { value: "low_quality", label: "The analysis wasn't good enough" },
  { value: "switched_service", label: "I'm using something else" },
  { value: "other", label: "Something else" },
] as const;

type Pending = "upgrade" | "portal" | "cancel" | "resume" | null;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Something went wrong. Please try again.");
  return json;
}

/** Upgrade, cancel or resume Pro, and open Stripe only for card and invoice changes. */
export default function BillingActions({ isPro, hasBillingAccount, cancelAtPeriodEnd, periodEndLabel }: BillingActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const reasonId = useId();
  const commentId = useId();

  async function upgrade() {
    setPending("upgrade");
    setError(null);
    const problem = await startProCheckout("/dashboard/billing");
    if (problem) {
      setError(problem);
      setPending(null);
    }
  }

  async function openPortal() {
    setPending("portal");
    setError(null);
    try {
      const json = await postJson("/api/billing/portal", { returnPath: "/dashboard/billing" });
      if (typeof json.portalUrl !== "string") throw new Error("Billing couldn't be opened. Please try again.");
      window.location.assign(json.portalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing couldn't be opened. Please try again.");
      setPending(null);
    }
  }

  async function cancel() {
    setPending("cancel");
    setError(null);
    try {
      await postJson("/api/billing/cancel", {
        ...(reason ? { feedback: reason } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setCancelOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your subscription couldn't be cancelled. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function resume() {
    setPending("resume");
    setError(null);
    try {
      await postJson("/api/billing/resume", {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your subscription couldn't be resumed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;
  const spinner = <span className="pt-spinner" aria-hidden="true" />;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {!isPro ? (
          <button type="button" onClick={upgrade} disabled={busy} className="pt-btn pt-btn-solid px-6 py-3">
            {pending === "upgrade" ? spinner : null}
            {pending === "upgrade" ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
        ) : cancelAtPeriodEnd ? (
          <button type="button" onClick={resume} disabled={busy} className="pt-btn pt-btn-solid px-6 py-3">
            {pending === "resume" ? spinner : null}
            Keep Pro
          </button>
        ) : (
          <button type="button" onClick={() => setCancelOpen(true)} disabled={busy} className="pt-btn pt-btn-outline px-6 py-3">
            Cancel subscription
          </button>
        )}
        {hasBillingAccount ? (
          <button type="button" onClick={openPortal} disabled={busy} className="pt-btn pt-btn-ghost px-4 py-3">
            {pending === "portal" ? spinner : null}
            Payment method &amp; invoices
          </button>
        ) : null}
      </div>

      {error && !cancelOpen ? (
        <p role="alert" className="pt-alert-danger mt-3 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <Dialog
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setError(null);
        }}
        dismissible={pending !== "cancel"}
        title="Cancel Pro?"
        description={
          periodEndLabel
            ? `You'll keep Pro until ${periodEndLabel}, and you won't be charged again. After that your account moves to Free and documents are kept for 30 days.`
            : "You won't be charged again. When your paid period ends, your account moves to Free and documents are kept for 30 days."
        }
      >
        <label htmlFor={reasonId} className="block text-sm font-semibold text-(--pt-ink)">
          Why are you cancelling?
        </label>
        <select
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 w-full rounded-xl border border-(--pt-line) bg-(--pt-surface-soft) px-3 py-2.5 text-(--pt-ink)"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <label htmlFor={commentId} className="mt-4 block text-sm font-semibold text-(--pt-ink)">
          Anything we could do better? <span className="font-normal text-(--pt-muted)">(optional)</span>
        </label>
        <textarea
          id={commentId}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-2 w-full resize-y rounded-xl border border-(--pt-line) bg-(--pt-surface-soft) px-3 py-2.5 text-(--pt-ink)"
        />
        {error ? (
          <p role="alert" className="pt-alert-danger mt-3 px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
          <button type="button" onClick={cancel} disabled={pending === "cancel"} className="pt-btn pt-btn-danger px-5 py-2.5">
            {pending === "cancel" ? spinner : null}
            {pending === "cancel" ? "Cancelling…" : "Cancel subscription"}
          </button>
          <button
            type="button"
            onClick={() => setCancelOpen(false)}
            disabled={pending === "cancel"}
            className="pt-btn pt-btn-outline px-5 py-2.5"
            autoFocus
          >
            Keep Pro
          </button>
        </div>
      </Dialog>
    </div>
  );
}
