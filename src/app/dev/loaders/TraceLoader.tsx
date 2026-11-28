"use client";

import { useId } from "react";

const A = "M39,17H193A22,22 0 0 1 215,39V185A22,22 0 0 1 193,207H39A22,22 0 0 1 17,185V39A22,22 0 0 1 39,17Z";
const B = "M114,92H265A22,22 0 0 1 287,114V265A22,22 0 0 1 265,287H114A22,22 0 0 1 92,265V114A22,22 0 0 1 114,92Z";

/**
 * Option A, "Trace": the frame draws itself, the first square grows out of the top-left corner, the second out of the
 * bottom-right, and the overlap knocks out as they meet. Then it rests on the finished mark with a slow breath.
 */
export default function TraceLoader({ size = 44, label = "Loading" }: { size?: number; label?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span role="status" className="ld-trace">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true">
        <defs>
          <mask id={`${id}-a`} maskUnits="userSpaceOnUse" x="0" y="0" width="307" height="307">
            <rect width="307" height="307" fill="#fff" />
            <g className="ld-tr-in-b">
              <path d={B} className="ld-tr-idle-b" fill="#000" />
            </g>
          </mask>
          <mask id={`${id}-b`} maskUnits="userSpaceOnUse" x="0" y="0" width="307" height="307">
            <rect width="307" height="307" fill="#fff" />
            <g className="ld-tr-in-a">
              <path d={A} className="ld-tr-idle-a" fill="#000" />
            </g>
          </mask>
        </defs>
        <rect className="ld-tr-frame" x="5" y="5" width="297" height="297" pathLength={1} fill="none" stroke="currentColor" strokeWidth="10" />
        <g mask={`url(#${id}-a)`}>
          <g className="ld-tr-in-a">
            <path d={A} className="ld-tr-idle-a" fill="currentColor" />
          </g>
        </g>
        <g mask={`url(#${id}-b)`}>
          <g className="ld-tr-in-b">
            <path d={B} className="ld-tr-idle-b" fill="currentColor" />
          </g>
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
