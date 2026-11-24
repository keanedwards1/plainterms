"use client";

import { useId, useState } from "react";
import Dialog from "@/components/ui/Dialog";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccount({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Your account couldn't be deleted. Please try again.");
      }
      // End the session; the sign-out route sends the browser home.
      const form = document.createElement("form");
      form.method = "post";
      form.action = "/sign-out";
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your account couldn't be deleted. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="pt-btn pt-btn-outline px-5 py-2.5 text-(--pt-bad)">
        Delete account
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setTyped("");
          setError(null);
        }}
        dismissible={!deleting}
        title="Delete your account?"
        description={
          <>
            This permanently deletes your account and every document and analysis in it.
            {isPro ? " Your Pro subscription is cancelled immediately." : ""} This can&apos;t be undone.
          </>
        }
      >
        <label htmlFor={inputId} className="block text-sm font-semibold text-(--pt-ink)">
          Type {CONFIRM_WORD} to confirm
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoFocus
          className="mt-2 w-full rounded-xl border border-(--pt-line) bg-(--pt-surface-soft) px-3 py-2.5 text-(--pt-ink)"
        />
        {error ? (
          <p role="alert" className="pt-alert-danger mt-3 px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
          <button
            type="button"
            onClick={deleteAccount}
            disabled={typed.trim() !== CONFIRM_WORD || deleting}
            className="pt-btn pt-btn-danger px-5 py-2.5"
          >
            {deleting ? <span className="pt-spinner" aria-hidden="true" /> : null}
            {deleting ? "Deleting…" : "Delete everything"}
          </button>
          <button type="button" onClick={() => setOpen(false)} disabled={deleting} className="pt-btn pt-btn-outline px-5 py-2.5">
            Cancel
          </button>
        </div>
      </Dialog>
    </>
  );
}
