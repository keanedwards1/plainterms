"use client";

import { useId } from "react";

const A = "M39,17H193A22,22 0 0 1 215,39V185A22,22 0 0 1 193,207H39A22,22 0 0 1 17,185V39A22,22 0 0 1 39,17Z";
const B = "M114,92H265A22,22 0 0 1 287,114V265A22,22 0 0 1 265,287H114A22,22 0 0 1 92,265V114A22,22 0 0 1 114,92Z";

/**
 * Option C, "Swap": the squares slide all the way through each other and trade corners, then trade back. Each
 * square is masked by the other, and the masks move with them, so the overlap stays knocked out as they cross and
 * the mark nearly vanishes at the midpoint.
 */
export default function SwapLoader({ size = 44, label = "Loading" }: { size?: number; label?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span role="status" className="ld-swap">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true">
        <defs>
          <mask id={`${id}-a`} maskUnits="userSpaceOnUse" x="-100" y="-100" width="507" height="507">
            <rect x="-100" y="-100" width="507" height="507" fill="#fff" />
            <path d={B} className="ld-sw-b" fill="#000" />
          </mask>
          <mask id={`${id}-b`} maskUnits="userSpaceOnUse" x="-100" y="-100" width="507" height="507">
            <rect x="-100" y="-100" width="507" height="507" fill="#fff" />
            <path d={A} className="ld-sw-a" fill="#000" />
          </mask>
        </defs>
        <rect x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />
        <g mask={`url(#${id}-a)`}>
          <path d={A} className="ld-sw-a" fill="currentColor" />
        </g>
        <g mask={`url(#${id}-b)`}>
          <path d={B} className="ld-sw-b" fill="currentColor" />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
