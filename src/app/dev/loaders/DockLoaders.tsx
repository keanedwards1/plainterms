"use client";

import Mark from "@/components/loader/Mark";

type P = { size?: number; label?: string };

/**
 * The frame as four corner brackets that together make the full frame. Each bracket sits in a wrapper group
 * (`p-cw p-cwN`) so an idle motion can stack on top of the arrival (`p-c p-cN`).
 */
function Brackets({ p }: { p: string }) {
  const paths = ["M5,154V5H154", "M153,5H302V154", "M302,153V302H153", "M154,302H5V153"];
  return (
    <g>
      {paths.map((d, k) => (
        <g key={d} className={`${p}-cw ${p}-cw${k + 1}`}>
          <path
            className={`${p}-c ${p}-c${k + 1}`}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </g>
      ))}
    </g>
  );
}

/** D2 · Clamp: the squares dock first, then the four corners clamp in around them and give them a squeeze. */
export function DockClampLoader(props: P) {
  return <Mark p="ld-dc" frame={<Brackets p="ld-dc" />} {...props} />;
}

/** D3 · Converge: every part flies in from its own corner at once, with a springy overshoot. */
export function DockConvergeLoader(props: P) {
  return <Mark p="ld-dv" frame={<Brackets p="ld-dv" />} {...props} />;
}

/** D4 · Spin-in: the corners swing in, pivoting on their tips, and the squares drop in from above and below. */
export function DockSpinLoader(props: P) {
  return <Mark p="ld-ds" frame={<Brackets p="ld-ds" />} {...props} />;
}

/** D5 · Settle: Dock's assembly plays once, then the finished logo holds with a slow breath instead of looping. */
export function DockSettleLoader(props: P) {
  return <Mark p="ld-dh" frame={<Brackets p="ld-dh" />} {...props} />;
}

/** E1 · Slide: the frame stays whole; the squares slide in from behind its left and right edges and dock. */
export function FrameSlideLoader(props: P) {
  return <Mark p="ld-fs" clip {...props} />;
}

/** E2 · Drop: the frame stays whole; one square drops in from the top edge, the other rises from the bottom. */
export function FrameDropLoader(props: P) {
  return <Mark p="ld-fd" clip {...props} />;
}

/** E3 · Click: the squares come in from their own corners, and the whole frame gives one firm click as they lock. */
export function FrameClickLoader(props: P) {
  return <Mark p="ld-fc" clip {...props} />;
}

/** E4 · Settle: Slide plays once, then the finished logo holds with the squares slowly breathing apart and together. */
export function FrameSettleLoader(props: P) {
  return <Mark p="ld-fh" clip {...props} />;
}
