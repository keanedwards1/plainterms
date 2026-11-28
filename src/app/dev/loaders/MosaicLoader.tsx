"use client";

import type { CSSProperties } from "react";

/** The mark's two squares, as boxes in the 307-unit logo grid. */
const A = { x0: 17, y0: 17, x1: 215, y1: 207 };
const B = { x0: 92, y0: 92, x1: 287, y1: 287 };
const COLS = 9;
const STEP = (287 - 17) / COLS;
const GAP = 5;
const PALETTE = ["var(--pt-sky)", "var(--pt-leaf)", "var(--pt-butter)", "var(--pt-peach)"];

const inside = (b: typeof A, x: number, y: number) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

/** Every cell whose centre is in exactly one square, so the overlap stays knocked out as in the logo. */
const TILES = Array.from({ length: COLS * COLS }, (_, k) => {
  const i = k % COLS;
  const j = Math.floor(k / COLS);
  const cx = 17 + STEP * (i + 0.5);
  const cy = 17 + STEP * (j + 0.5);
  if (inside(A, cx, cy) === inside(B, cx, cy)) return null;
  return { i, j, x: 17 + STEP * i + GAP / 2, y: 17 + STEP * j + GAP / 2, color: PALETTE[(i * 3 + j * 5) % PALETTE.length] };
}).filter((t) => t !== null);

/**
 * Option B, "Mosaic": the mark assembles from small tiles in the Meadow palette, popping in along the diagonal and
 * settling to the accent colour. While it waits, a soft wave of colour keeps passing through the tiles.
 */
export default function MosaicLoader({ size = 44, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <span role="status" className="ld-mosaic">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true">
        <rect x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" className="ld-mo-frame" />
        {TILES.map((t) => (
          <rect
            key={`${t.i}-${t.j}`}
            className="ld-mo-tile"
            x={t.x}
            y={t.y}
            width={STEP - GAP}
            height={STEP - GAP}
            rx="4"
            style={{ "--d": `${(t.i + t.j) * 50}ms`, "--c": t.color } as CSSProperties}
          />
        ))}
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
