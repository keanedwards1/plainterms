"use client";

import type { CSSProperties } from "react";
import "./loader.css";

/** The mark's two squares, as boxes in the 307-unit logo grid. */
const A = { x0: 17, y0: 17, x1: 215, y1: 207 };
const B = { x0: 92, y0: 92, x1: 287, y1: 287 };
export const COLS = 9;
export const STEP = (287 - 17) / COLS;
export const GAP = 5;
export const TILE = STEP - GAP;
export const PALETTE = ["var(--pt-sky)", "var(--pt-leaf)", "var(--pt-butter)", "var(--pt-peach)"];
/** The middle of the knocked-out overlap. */
export const HOLE = { x: (92 + 215) / 2, y: (92 + 207) / 2 };

const inside = (b: typeof A, x: number, y: number) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

/** A stable 0-1 number per tile, the same on the server and in the browser. */
export function rand(i: number, j: number, k = 0) {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263) ^ Math.imul(k + 1, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type Tile = { i: number; j: number; x: number; y: number; cx: number; cy: number; inMark: boolean; color: string };

/** Every cell of the grid; `inMark` is true where the cell sits in exactly one square, as in the logo. */
export const GRID: Tile[] = Array.from({ length: COLS * COLS }, (_, k) => {
  const i = k % COLS;
  const j = Math.floor(k / COLS);
  const cx = 17 + STEP * (i + 0.5);
  const cy = 17 + STEP * (j + 0.5);
  return {
    i,
    j,
    x: 17 + STEP * i + GAP / 2,
    y: 17 + STEP * j + GAP / 2,
    cx,
    cy,
    inMark: inside(A, cx, cy) !== inside(B, cx, cy),
    color: PALETTE[(i * 3 + j * 5) % PALETTE.length],
  };
});
export const MARK_TILES = GRID.filter((t) => t.inMark);

type Props = {
  p: string;
  tiles: Tile[];
  vars: (t: Tile, k: number) => Record<string, string>;
  tileClass?: (t: Tile) => string;
  clip?: boolean;
  overflow?: boolean;
  size?: number;
  label?: string;
};

/** The frame plus a set of tiles, each carrying its own CSS variables for the animation to use. */
export default function TileMark({ p, tiles, vars, tileClass, clip, overflow, size = 44, label = "Loading" }: Props) {
  const clipId = `${p}-clip`;
  return (
    <span role="status" className="ld-tiles">
      <svg viewBox="0 0 307 307" width={size} height={size} aria-hidden="true" overflow={overflow ? "visible" : undefined}>
        {clip ? (
          <defs>
            <clipPath id={clipId}>
              <rect x="10" y="10" width="287" height="287" />
            </clipPath>
          </defs>
        ) : null}
        <rect className={`${p}-frame`} x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />
        <g clipPath={clip ? `url(#${clipId})` : undefined}>
          {tiles.map((t, k) => (
            <rect
              key={`${t.i}-${t.j}`}
              className={`${p}-tile ${tileClass?.(t) ?? ""}`}
              x={t.x}
              y={t.y}
              width={TILE}
              height={TILE}
              rx="4"
              style={vars(t, k) as CSSProperties}
            />
          ))}
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
