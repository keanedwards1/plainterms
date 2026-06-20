"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "pt_cookie_consent";

function grantConsent() {
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    } else if (stored === "accepted") {
      grantConsent();
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    grantConsent();
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[500] mx-auto max-w-xl rounded-2xl border border-[var(--pt-border)] bg-white p-4 shadow-[0_8px_40px_-12px_rgba(31,43,61,0.35)] sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <p className="text-sm leading-relaxed text-[var(--pt-muted)]">
        We use analytics cookies to understand how visitors use PlainTerms and to measure ad
        performance. See our{" "}
        <Link href="/privacy" className="font-semibold text-[var(--pt-ink)] underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={accept}
          className="pt-btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={decline}
          className="flex-1 rounded-lg border border-[var(--pt-border)] px-4 py-2 text-sm font-semibold text-[var(--pt-muted)] transition-colors hover:border-[var(--pt-ink)]/30 hover:text-[var(--pt-ink)]"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
