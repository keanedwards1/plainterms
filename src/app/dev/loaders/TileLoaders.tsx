"use client";

import ScatterLoader from "@/components/loader/ScatterLoader";
import TileMark, { GRID, HOLE, MARK_TILES, PALETTE, rand, type Tile } from "@/components/loader/tiles";

export { ScatterLoader };

type P = { size?: number; label?: string };

const ms = (n: number) => `${Math.round(n)}ms`;
const fromHole = (t: Tile) => Math.hypot(t.cx - HOLE.x, t.cy - HOLE.y);

/** Rain: the tiles fall into the frame and stack up from the bottom row, then the whole mark drains away. */
export function RainLoader(props: P) {
  return (
    <TileMark
      p="ld-ra"
      clip
      tiles={MARK_TILES}
      vars={(t) => ({ "--d": ms((8 - t.j) * 120 + rand(t.i, t.j) * 140), "--c": t.color })}
      {...props}
    />
  );
}

/** Ripple: the mark stays whole while rings spread out from the hole, turning tiles into little diamonds. */
export function RippleLoader(props: P) {
  return (
    <TileMark
      p="ld-rp"
      tiles={MARK_TILES}
      vars={(t) => ({ "--d": ms(fromHole(t) * 4.2), "--c": t.color })}
      {...props}
    />
  );
}

/** Flipboard: every tile flips like a departure board through two palette colours before landing on orange. */
export function FlipboardLoader(props: P) {
  return (
    <TileMark
      p="ld-fb"
      tiles={MARK_TILES}
      vars={(t) => ({
        "--d": ms(t.i * 70 + t.j * 35 + rand(t.i, t.j) * 90),
        "--c1": PALETTE[Math.floor(rand(t.i, t.j, 1) * PALETTE.length)],
        "--c2": PALETTE[Math.floor(rand(t.i, t.j, 2) * PALETTE.length)],
      })}
      {...props}
    />
  );
}

/** The mark's tiles in reading order, snaking left to right then right to left. */
const SERPENTINE = [...MARK_TILES].sort((a, b) => a.j - b.j || (a.j % 2 ? b.i - a.i : a.i - b.i));

/** Snake: the mark sits faint while a bright head winds through every tile, leaving a fading tail. */
export function SnakeLoader(props: P) {
  const period = 3600;
  const n = SERPENTINE.length;
  return (
    <TileMark
      p="ld-sn"
      tiles={SERPENTINE}
      vars={(t, k) => ({ "--d": ms((k / n - 1) * period), "--c": t.color })}
      {...props}
    />
  );
}

/** Emerge: the frame starts full of colourful tiles; everything that isn't the mark shrinks away, leaving it. */
export function EmergeLoader(props: P) {
  return (
    <TileMark
      p="ld-em"
      tiles={GRID}
      tileClass={(t) => (t.inMark ? "ld-em-in" : "ld-em-out")}
      vars={(t) => ({ "--d": ms(fromHole(t) * 2.6), "--c": t.color })}
      {...props}
    />
  );
}
