"use client";

import { useState } from "react";
import { startProCheckout } from "@/components/ProUpgradeDialog";

/** Upgrade (Stripe Checkout) or manage an existing subscription (Stripe portal). */
export default function BillingActions({ isPro, hasBillingAccount }: { isPro: boolean; hasBillingAccount: boolean }) {
  const [pending, setPending] = useState<"upgrade" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ returnPath: "/dashboard/billing" }),
      });
      const json = (await res.json().catch(() => ({}))) as { portalUrl?: string; error?: string };
      if (!res.ok || !json.portalUrl) throw new Error(json.error ?? "Billing couldn't be opened. Please try again.");
      window.location.assign(json.portalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing couldn't be opened. Please try again.");
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {!isPro ? (
          <button type="button" onClick={upgrade} disabled={pending !== null} className="pt-btn pt-btn-solid px-6 py-3">
            {pending === "upgrade" ? <span className="pt-spinner" aria-hidden="true" /> : null}
            {pending === "upgrade" ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
        ) : null}
        {hasBillingAccount ? (
          <button type="button" onClick={openPortal} disabled={pending !== null} className="pt-btn pt-btn-outline px-6 py-3">
            {pending === "portal" ? <span className="pt-spinner" aria-hidden="true" /> : null}
            {isPro ? "Manage subscription" : "Billing history"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="pt-alert-danger mt-3 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
