"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "pt_cookie_consent_v2";

type Props = {
  href: string;
  label: string;
};

/**
 * Mobile-only bottom CTA. The cookie banner occupies the same corner of the
 * screen on small viewports, so this stays hidden until a consent choice has
 * been stored, then appears in its place.
 */
export default function StickyMobileCta({ href, label }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function sync() {
      try {
        setVisible(Boolean(localStorage.getItem(CONSENT_KEY)));
      } catch {
        // Storage unavailable — show the CTA rather than hide it forever.
        setVisible(true);
      }
    }

    sync();
    window.addEventListener("pt:cookie-consent", sync);
    return () => window.removeEventListener("pt:cookie-consent", sync);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-[var(--pt-border)] bg-white p-3 shadow-[0_8px_40px_-12px_rgba(31,43,61,0.35)] sm:hidden">
      <Link
        href={href}
        className="pt-btn-primary flex w-full items-center justify-center px-5 py-3 text-sm font-semibold"
      >
        {label}
      </Link>
    </div>
  );
}
