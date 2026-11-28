"use client";

import { useId, type ReactNode } from "react";
import "./loader.css";

export const SQ_A = "M39,17H193A22,22 0 0 1 215,39V185A22,22 0 0 1 193,207H39A22,22 0 0 1 17,185V39A22,22 0 0 1 39,17Z";
export const SQ_B = "M114,92H265A22,22 0 0 1 287,114V265A22,22 0 0 1 265,287H114A22,22 0 0 1 92,265V114A22,22 0 0 1 114,92Z";
/** Both squares as one shape; with fill-rule evenodd the overlap is knocked out, as in the logo. */
export const SQ_XOR = `${SQ_A} ${SQ_B}`;

type Props = { p: string; size?: number; label?: string; frame?: ReactNode; clip?: boolean; children?: ReactNode };

/**
 * The mark with hooks for animation. With `p` as the prefix: `p-frame` is the frame (unless `frame` replaces it),
 * and each square sits in three nested groups, `p-a` > `p-a2` > `p-a3` (and the same for b), so up to three
 * transforms can stack. Each square is masked by the other, and the masks carry the same classes, so the overlap
 * stays knocked out however the squares move.
 */
export default function Mark({ p, size = 44, label = "Loading", frame, clip, children }: Props) {
  const id = useId().replace(/:/g, "");
  const square = (d: string, k: "a" | "b", fill: string) => (
    <g className={`${p}-${k}`}>
      <g className={`${p}-${k}2`}>
        <path d={d} className={`${p}-${k}3`} fill={fill} />
      </g>
    </g>
  );
  return (
    <span role="status" className="ld-mark">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true" overflow="visible">
        <defs>
          <mask id={`${id}-a`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="1107" height="1107">
            <rect x="-400" y="-400" width="1107" height="1107" fill="#fff" />
            {square(SQ_B, "b", "#000")}
          </mask>
          <mask id={`${id}-b`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="1107" height="1107">
            <rect x="-400" y="-400" width="1107" height="1107" fill="#fff" />
            {square(SQ_A, "a", "#000")}
          </mask>
          {/* With `clip`, the squares only show inside the frame, so they seem to slide in from behind its edges. */}
          <clipPath id={`${id}-in`}>
            <rect x="10" y="10" width="287" height="287" />
          </clipPath>
        </defs>
        {frame ?? <rect className={`${p}-frame`} x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />}
        <g clipPath={clip ? `url(#${id}-in)` : undefined}>
          <g mask={`url(#${id}-a)`}>{square(SQ_A, "a", "currentColor")}</g>
          <g mask={`url(#${id}-b)`}>{square(SQ_B, "b", "currentColor")}</g>
        </g>
        {children}
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
