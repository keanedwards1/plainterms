"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "pt_cookie_consent_v2";

type ConsentPrefs = {
  analytics: boolean;
  advertising: boolean;
};

function applyConsent(prefs: ConsentPrefs) {
  window.gtag?.("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.advertising ? "granted" : "denied",
    ad_user_data: prefs.advertising ? "granted" : "denied",
    ad_personalization: prefs.advertising ? "granted" : "denied",
  });
}

function loadStored(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentPrefs;
  } catch {
    return null;
  }
}

function savePrefs(prefs: ConsentPrefs) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

// Toggle switch — necessary cookies are always locked on
function Toggle({
  id,
  label,
  description,
  checked,
  locked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--pt-ink)]">
          {label}
          {locked && (
            <span className="ml-2 rounded-full bg-[var(--pt-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--pt-muted)]">
              Always on
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--pt-muted)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={locked}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pt-accent)] disabled:opacity-60 ${
          checked ? "bg-[var(--pt-accent)]" : "bg-[var(--pt-border)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
        <span className="sr-only">{checked ? "Enabled" : "Disabled"}</span>
      </button>
    </div>
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPrefs>({ analytics: true, advertising: true });

  useEffect(() => {
    const stored = loadStored();
    if (!stored) {
      setVisible(true);
    } else {
      applyConsent(stored);
    }
  }, []);

  const acceptAll = () => {
    const p = { analytics: true, advertising: true };
    savePrefs(p);
    applyConsent(p);
    setVisible(false);
    setShowPrefs(false);
  };

  const rejectAll = () => {
    const p = { analytics: false, advertising: false };
    savePrefs(p);
    applyConsent(p);
    setVisible(false);
    setShowPrefs(false);
  };

  const saveSelected = () => {
    savePrefs(prefs);
    applyConsent(prefs);
    setVisible(false);
    setShowPrefs(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop when preferences panel is open */}
      {showPrefs && (
        <div
          aria-hidden
          className="fixed inset-0 z-[498] bg-[#1f2b3d]/40 backdrop-blur-sm"
          onClick={() => setShowPrefs(false)}
        />
      )}

      <div
        role="dialog"
        aria-modal={showPrefs}
        aria-label="Cookie preferences"
        className={`fixed z-[499] transition-all duration-200 ${
          showPrefs
            ? "bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:rounded-2xl"
            : "bottom-4 left-4 right-4 mx-auto max-w-xl rounded-2xl sm:left-auto sm:right-6 sm:max-w-sm"
        } border border-[var(--pt-border)] bg-white shadow-[0_8px_40px_-12px_rgba(31,43,61,0.35)]`}
      >
        {showPrefs ? (
          /* ── Preferences panel ── */
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[var(--pt-ink)]">Cookie preferences</h2>
              <button
                type="button"
                onClick={() => setShowPrefs(false)}
                aria-label="Close preferences"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--pt-border)]/60 text-[var(--pt-muted)] transition-colors hover:bg-[var(--pt-border)]"
              >
                <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
                  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[var(--pt-muted)]">
              We use cookies to keep the service running and to understand how it's used. Choose
              which optional cookies you allow. See our{" "}
              <Link href="/privacy" className="font-semibold text-[var(--pt-ink)] underline">
                Privacy Policy
              </Link>{" "}
              for full details.
            </p>

            <div className="mt-3 divide-y divide-[var(--pt-border)]">
              <Toggle
                id="cookie-necessary"
                label="Strictly necessary"
                description="Required for the site to function — checkout, security, and session handling. Cannot be disabled."
                checked
                locked
              />
              <Toggle
                id="cookie-analytics"
                label="Analytics"
                description="Google Analytics — helps us understand which pages are visited and how the funnel performs. No personal data is sold."
                checked={prefs.analytics}
                onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
              <Toggle
                id="cookie-advertising"
                label="Advertising"
                description="Google Ads conversion tracking — lets us measure which ads lead to purchases so we can improve campaigns. No cross-site ad profiles are built."
                checked={prefs.advertising}
                onChange={(v) => setPrefs((p) => ({ ...p, advertising: v }))}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={saveSelected}
                className="pt-btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 rounded-lg border border-[var(--pt-border)] px-4 py-2 text-sm font-semibold text-[var(--pt-muted)] transition-colors hover:border-[var(--pt-ink)]/30 hover:text-[var(--pt-ink)]"
              >
                Accept all
              </button>
            </div>
          </div>
        ) : (
          /* ── Initial banner ── */
          <div className="p-4">
            <p className="text-sm leading-relaxed text-[var(--pt-muted)]">
              We use cookies to run the site and measure how it's used. See our{" "}
              <Link href="/privacy" className="font-semibold text-[var(--pt-ink)] underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="pt-btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="flex-1 rounded-lg border border-[var(--pt-border)] px-4 py-2 text-sm font-semibold text-[var(--pt-muted)] transition-colors hover:border-[var(--pt-ink)]/30 hover:text-[var(--pt-ink)]"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() => setShowPrefs(true)}
                className="w-full text-center text-xs font-semibold text-[var(--pt-muted)] underline transition-colors hover:text-[var(--pt-ink)]"
              >
                Manage preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
