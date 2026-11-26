"use client";

import { useRouter } from "next/navigation";

/** Closes the full-screen page: back to wherever it was opened from, or home when it was opened directly. */
export default function CloseButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Close"
      className="pt-new-close"
      onClick={() => {
        const fromHere = document.referrer && new URL(document.referrer).origin === window.location.origin;
        if (fromHere && window.history.length > 1) router.back();
        else router.push("/");
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
