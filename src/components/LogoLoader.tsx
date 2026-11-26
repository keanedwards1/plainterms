"use client";

import { useId } from "react";

const A = "M39,17H193A22,22 0 0 1 215,39V185A22,22 0 0 1 193,207H39A22,22 0 0 1 17,185V39A22,22 0 0 1 39,17Z";
const B = "M114,92H265A22,22 0 0 1 287,114V265A22,22 0 0 1 265,287H114A22,22 0 0 1 92,265V114A22,22 0 0 1 114,92Z";

/**
 * The PlainTerms mark, animated: the two squares slide together and apart inside the frame, and the part
 * where they overlap stays knocked out, as in the logo. Each square is masked by the other.
 */
export default function LogoLoader({ size = 44, label = "Loading", className = "" }: { size?: number; label?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span role="status" className={`pt-logo-loader ${className}`}>
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true">
        <defs>
          <mask id={`${id}-a`} maskUnits="userSpaceOnUse" x="0" y="0" width="307" height="307">
            <rect width="307" height="307" fill="#fff" />
            <path d={B} className="pt-ll-b" fill="#000" />
          </mask>
          <mask id={`${id}-b`} maskUnits="userSpaceOnUse" x="0" y="0" width="307" height="307">
            <rect width="307" height="307" fill="#fff" />
            <path d={A} className="pt-ll-a" fill="#000" />
          </mask>
        </defs>
        <rect x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />
        {/* The mask sits on an unmoving group, so it stays put while the square inside it slides. */}
        <g mask={`url(#${id}-a)`}>
          <path d={A} className="pt-ll-a" fill="currentColor" />
        </g>
        <g mask={`url(#${id}-b)`}>
          <path d={B} className="pt-ll-b" fill="currentColor" />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
