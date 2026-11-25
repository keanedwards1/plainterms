"use client";

import { useEffect, useRef } from "react";

/**
 * Pixel art drawn on a canvas at CSS-pixel resolution.
 *  - "ribbon" and "domes": semi-random stipple over a faint dot grid, one ink.
 *  - "glow": a sun glow, Floyd–Steinberg dithered at 2px.
 * Purely decorative; it never moves, so it needs no reduced-motion handling.
 */
export type StippleKind = "ribbon" | "domes" | "glow";

const SS = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const s = (t: number) => t * t * (3 - 2 * t);
  const sx = s(x - xi);
  const sy = s(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const fbm = (x: number, y: number) => valueNoise(x, y) * 0.55 + valueNoise(x * 2.1, y * 2.1) * 0.28 + valueNoise(x * 4.3, y * 4.3) * 0.17;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

type Field = (u: number, v: number) => number;

function ribbon(): Field {
  return (u, v) => {
    const fade = SS(0.36, 0.52, u);
    const yc = 0.42 + 0.18 * Math.sin(u * 4 + 0.5);
    const tw = Math.sin(u * 7 + 0.3);
    const hw = 0.04 + 0.13 * Math.abs(tw);
    const d = (v - yc) / hw;
    if (Math.abs(d) <= 1) {
      let val = tw > 0 ? 0.22 + 0.5 * (0.5 + 0.5 * d) : 0.78 - 0.45 * (0.5 + 0.5 * d);
      if (1 - Math.abs(d) < 0.08) val = 1;
      return val * fade;
    }
    const sd = (v - yc - 0.08) / hw;
    return Math.abs(sd) < 1 ? 0.2 * (1 - Math.abs(sd)) * fade : 0;
  };
}

function domes(aspect: number): Field {
  const L = [-0.55, 0.45, 0.7];
  const n = Math.hypot(...L);
  const l = L.map((x) => x / n);
  const set: [number, number, number][] = [
    [0.78, 0.52, 0.42],
    [0.5, 0.8, 0.2],
    [0.96, 0.82, 0.17],
  ];
  return (u, v) => {
    const X = u * aspect;
    let best = 0;
    for (const [fx, cy, r] of set) {
      const dx = (X - fx * aspect) / r;
      const dy = (v - cy) / r;
      const q = dx * dx + dy * dy;
      if (q <= 1) {
        const nz = Math.sqrt(1 - q);
        const sh = Math.max(0, dx * l[0] + dy * l[1] + nz * l[2]);
        best = Math.max(best, (1 - sh) * 0.95 + 0.05);
      }
    }
    return best * SS(0.3, 0.5, u);
  };
}

function glow(aspect: number): Field {
  return (u, v) => {
    const d = Math.hypot((u - 0.5) * aspect, v - 1.08);
    let val = Math.pow(Math.max(0, 1 - d / 1.05), 1.5) * 1.05;
    val *= 0.86 + 0.14 * Math.sin(d * 46);
    if (v > 0.955) val = Math.max(val, 0.92);
    return val;
  };
}

function drawStipple(ctx: CanvasRenderingContext2D, W: number, H: number, field: Field, ink: string, grid: string) {
  const ramp = ["#5E8C80", "#3C7A6B", ink, "#15322C"];
  const rnd = seeded(21);
  const C = 3;
  ctx.fillStyle = grid;
  for (let y = 3; y < H; y += 6) for (let x = 3; x < W; x += 6) ctx.fillRect(x, y, 1.2, 1.2);
  for (let cy = 0; cy < H; cy += C) {
    for (let cx = 0; cx < W; cx += C) {
      const jx = cx + rnd() * C;
      const jy = cy + rnd() * C;
      let t = field(jx / W, jy / H);
      const sw = fbm(cx / 90, cy / 60);
      if (t <= 0.01) {
        if (rnd() < 0.035 * Math.pow(sw, 3) * (jx / W)) t = 0.5;
        else continue;
      }
      t = Math.min(1, t * (0.8 + 0.45 * sw));
      if (t < 1 && rnd() > Math.min(1, Math.pow(t, 0.8) * 1.12)) continue;
      const i = Math.max(0, Math.min(3, Math.floor(t * 4 + (rnd() - 0.5) * 1.1)));
      ctx.fillStyle = ramp[i];
      const z = t > 0.97 ? 2.4 : 2;
      ctx.fillRect(Math.round(jx), Math.round(jy), z, z);
    }
  }
}

function drawDither(ctx: CanvasRenderingContext2D, Wpx: number, Hpx: number, field: Field, ink: string) {
  const P = 2;
  const W = Math.ceil(Wpx / P);
  const H = Math.ceil(Hpx / P);
  const buf = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buf[y * W + x] = field(x / W, y / H);
  ctx.fillStyle = ink;
  for (let y = 0; y < H; y++) {
    const rev = y % 2 === 1;
    const dir = rev ? -1 : 1;
    for (let k = 0; k < W; k++) {
      const x = rev ? W - 1 - k : k;
      const i = y * W + x;
      const old = buf[i];
      const on = old > 0.5 ? 1 : 0;
      const err = old - on;
      if (on) ctx.fillRect(x * P, y * P, P, P);
      if (x + dir >= 0 && x + dir < W) buf[i + dir] += (err * 7) / 16;
      if (y + 1 < H) {
        if (x - dir >= 0 && x - dir < W) buf[i + W - dir] += (err * 3) / 16;
        buf[i + W] += (err * 5) / 16;
        if (x + dir >= 0 && x + dir < W) buf[i + W + dir] += err / 16;
      }
    }
  }
}

export default function Stipple({
  kind,
  ink = "#2F6B5E",
  grid = "rgba(21,50,44,.16)",
  className = "",
}: {
  kind: StippleKind;
  ink?: string;
  grid?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    let frame = 0;
    let lastWidth = 0;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const W = Math.ceil(rect.width);
      const H = Math.ceil(rect.height);
      if (!W || !H || W === lastWidth) return;
      lastWidth = W;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const aspect = W / H;
      if (kind === "glow") drawDither(ctx, W, H, glow(aspect), ink);
      else drawStipple(ctx, W, H, kind === "ribbon" ? ribbon() : domes(aspect), ink, grid);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });
    observer.observe(canvas);
    paint();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [kind, ink, grid]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}

