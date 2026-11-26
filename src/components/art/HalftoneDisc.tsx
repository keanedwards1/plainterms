"use client";

import { useEffect, useRef } from "react";

/** A small pale halftone disc with a faint dot trail. Decorative only. */
export default function HalftoneDisc({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    function paint() {
      if (!cv) return;
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.ceil(r.width);
      const H = Math.ceil(r.height);
      if (!W) return;
      cv.width = W * dpr;
      cv.height = H * dpr;
      const g = cv.getContext("2d");
      if (!g) return;
      g.scale(dpr, dpr);
      g.clearRect(0, 0, W, H);
      let s = 17;
      const rnd = () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
      const R = H * 0.36;
      const cx = W - R - 6;
      const cy = H * 0.5;
      for (let y = 2; y < H; y += 4) {
        for (let x = 2; x < W; x += 4) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= R) {
            const t = 0.25 + 0.6 * ((x - cx + (y - cy)) / (2 * R) + 0.5);
            if (rnd() < t) {
              g.fillStyle = t > 0.7 ? "#5E8C80" : "#8FB0A4";
              g.fillRect(x, y, 1.6, 1.6);
            }
          } else if (x % 8 === 2 && y % 8 === 2) {
            const f = Math.max(0, 1 - (d - R) / (W * 0.55));
            if (rnd() < f * 0.5) {
              g.fillStyle = "rgba(94,140,128,.45)";
              g.fillRect(x, y, 1.2, 1.2);
            }
          }
        }
      }
    }
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
