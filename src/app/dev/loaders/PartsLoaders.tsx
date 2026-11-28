"use client";

import { useId, type CSSProperties } from "react";
import Mark, { SQ_A, SQ_B, SQ_XOR } from "@/components/loader/Mark";
import SpiralLoader from "@/components/loader/SpiralLoader";

export { SpiralLoader };

type P = { size?: number; label?: string };

/** D · Dock: the frame arrives as four corner brackets that lock together, then the squares slide in from the sides. */
export function DockLoader(props: P) {
  const bracket = (cls: string, d: string) => (
    <path className={`ld-dk-c ${cls}`} d={d} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="square" strokeLinejoin="miter" />
  );
  return (
    <Mark
      p="ld-dk"
      frame={
        <g>
          {bracket("ld-dk-c1", "M5,154V5H154")}
          {bracket("ld-dk-c2", "M153,5H302V154")}
          {bracket("ld-dk-c3", "M302,153V302H153")}
          {bracket("ld-dk-c4", "M154,302H5V153")}
        </g>
      }
      {...props}
    />
  );
}

/** E · Magnet: the squares strain toward each other from opposite corners, then snap together with a flash. */
export function MagnetLoader(props: P) {
  return (
    <Mark p="ld-mg" {...props}>
      <rect className="ld-mg-flash" x="92" y="92" width="123" height="115" rx="6" fill="currentColor" />
    </Mark>
  );
}

const STRIPS = 6;
const STRIP_H = 307 / STRIPS;

/** G · Slices: the finished mark, cut into strips that slide in from alternating sides and line up. */
export function SlicesLoader({ size = 44, label = "Loading" }: P) {
  const id = useId().replace(/:/g, "");
  return (
    <span role="status" className="ld-mark">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true" overflow="visible">
        <defs>
          {Array.from({ length: STRIPS }, (_, k) => (
            <clipPath key={k} id={`${id}-s${k}`}>
              <rect x="-500" y={k * STRIP_H - 0.5} width="1307" height={STRIP_H + 1} />
            </clipPath>
          ))}
        </defs>
        {Array.from({ length: STRIPS }, (_, k) => (
          <g
            key={k}
            className="ld-sl-strip"
            clipPath={`url(#${id}-s${k})`}
            style={{ "--dir": k % 2 ? 1 : -1, "--d": `${k * 70}ms` } as CSSProperties}
          >
            <rect x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />
            <path d={SQ_XOR} fillRule="evenodd" fill="currentColor" />
          </g>
        ))}
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** H · Interlock: the mark's two L-shaped halves tumble in from opposite sides and click together around the hole. */
export function InterlockLoader({ size = 44, label = "Loading" }: P) {
  const id = useId().replace(/:/g, "");
  return (
    <span role="status" className="ld-mark">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true" overflow="visible">
        <defs>
          <mask id={`${id}-a`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="1107" height="1107">
            <rect x="-400" y="-400" width="1107" height="1107" fill="#fff" />
            <path d={SQ_B} fill="#000" />
          </mask>
          <mask id={`${id}-b`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="1107" height="1107">
            <rect x="-400" y="-400" width="1107" height="1107" fill="#fff" />
            <path d={SQ_A} fill="#000" />
          </mask>
        </defs>
        <rect className="ld-il-frame" x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />
        <g className="ld-il-a" mask={`url(#${id}-a)`}>
          <path d={SQ_A} fill="currentColor" />
        </g>
        <g className="ld-il-b" mask={`url(#${id}-b)`}>
          <path d={SQ_B} fill="currentColor" />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** I · Layers: the frame, then each square, drops in from in front of the screen and lands, then they recede. */
export function LayersLoader(props: P) {
  return <Mark p="ld-ly" {...props} />;
}
