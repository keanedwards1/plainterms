"use client";

import TileMark, { MARK_TILES, rand } from "./tiles";

const ms = (n: number) => `${Math.round(n)}ms`;
const px = (n: number) => `${Math.round(n)}px`;

/**
 * The PlainTerms mark built from tiles: they fly in from all over, spinning, in the Meadow palette, lock into the
 * logo and settle to orange, then blow apart and do it again.
 */
export default function ScatterLoader(props: { size?: number; label?: string }) {
  return (
    <TileMark
      p="ld-sc"
      overflow
      tiles={MARK_TILES}
      vars={(t) => {
        const a = rand(t.i, t.j, 1) * Math.PI * 2;
        const b = rand(t.i, t.j, 2) * Math.PI * 2;
        const r1 = 160 + rand(t.i, t.j, 3) * 160;
        const r2 = 160 + rand(t.i, t.j, 4) * 160;
        return {
          "--sx": px(Math.cos(a) * r1),
          "--sy": px(Math.sin(a) * r1),
          "--ex": px(Math.cos(b) * r2),
          "--ey": px(Math.sin(b) * r2),
          "--rs": `${Math.round((rand(t.i, t.j, 5) - 0.5) * 540)}deg`,
          "--re": `${Math.round((rand(t.i, t.j, 6) - 0.5) * 540)}deg`,
          "--d": ms(rand(t.i, t.j, 7) * 260),
          "--c": t.color,
        };
      }}
      {...props}
    />
  );
}
