"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";

type ProUpgradeDialogProps = {
  open: boolean;
  onClose: () => void;
  /** What the person tried to open, e.g. "Revised draft". */
  feature: string | null;
  signedIn: boolean;
};

const PRO_PRICE_LABEL = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "$5/month";

const PRO_POINTS = [
  "Our most capable AI model on every document",
  "Track changes and a clean revised draft you can send",
  "Rewrite options and fallback positions",
  "Documents kept until you delete them",
];

/** Starts Pro checkout and returns the person to the page they were on. */
export async function startProCheckout(returnPath: string): Promise<string | null> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ returnPath }),
  });
  const json = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
  if (res.ok && json.checkoutUrl) {
    window.location.assign(json.checkoutUrl);
    return null;
  }
  return json.error ?? "Checkout couldn't be started. Please try again.";
}

export default function ProUpgradeDialog({ open, onClose, feature, signedIn }: ProUpgradeDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setPending(true);
    setError(null);
    const here = `${window.location.pathname}${window.location.search}`;
    const problem = await startProCheckout(here);
    if (problem) {
      setError(problem);
      setPending(false);
    }
  }

  function signIn() {
    const here = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/sign-in?returnTo=${encodeURIComponent(here)}`);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setError(null);
        onClose();
      }}
      dismissible={!pending}
      title={feature ? `${feature} is part of Pro` : "Upgrade to Pro"}
      description={`Pro is ${PRO_PRICE_LABEL}. Cancel anytime.`}
    >
      <ul className="space-y-2 text-[15px] text-(--pt-ink-soft)">
        {PRO_POINTS.map((point) => (
          <li key={point} className="flex gap-2.5">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-(--pt-good)">
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {point}
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="pt-alert-danger mt-4 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
        {signedIn ? (
          <button type="button" onClick={upgrade} disabled={pending} className="pt-btn pt-btn-solid px-5 py-3 text-base" autoFocus>
            {pending ? <span className="pt-spinner" aria-hidden="true" /> : null}
            {pending ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
        ) : (
          <button type="button" onClick={signIn} className="pt-btn pt-btn-solid px-5 py-3 text-base" autoFocus>
            Sign in to upgrade
          </button>
        )}
        <button type="button" onClick={onClose} disabled={pending} className="pt-btn pt-btn-outline px-5 py-3 text-base">
          Not now
        </button>
      </div>
    </Dialog>
  );
}
