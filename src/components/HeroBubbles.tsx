"use client";

import { useEffect, useRef } from "react";

// Elastic-blob physics adapted from the classic canvas blob: every vertex is a
// spring coupled to its neighbours, so a poke ripples around the ring and
// settles. Solid orange fill, anchored in place, unevenly scattered.

const NUM_POINTS = 32;
const ELASTICITY = 0.001;
const FRICTION = 0.0085;
// How hard each cursor stroke pokes the surface (1 = original, lower = gentler).
const POKE = 0.65;
// Gentle continuous idle motion so the blobs keep jiggling without a cursor
// (this is what keeps them alive on touch devices, where we disable the poke).
const AMBIENT = 0.3;
const AMBIENT_INTERVAL = 34; // frames between ambient nudges

// Uneven placement, kept clear of the centred headline. Fractions of the canvas.
const POSITIONS: { x: number; y: number }[] = [
  { x: 0.12, y: 0.3 },
  { x: 0.27, y: 0.7 },
  { x: 0.07, y: 0.52 },
  { x: 0.86, y: 0.32 },
  { x: 0.91, y: 0.73 },
];

class Point {
  azimuth: number;
  compX: number;
  compY: number;
  acceleration = 0;
  speed = 0;
  radialEffect = 0;
  parent: Blob;

  constructor(azimuth: number, parent: Blob) {
    this.parent = parent;
    this.azimuth = Math.PI - azimuth;
    this.compX = Math.cos(this.azimuth);
    this.compY = Math.sin(this.azimuth);
    this.applyAcceleration(-0.3 + Math.random() * 0.6);
  }

  // Mirrors the original setter chain: accel feeds speed feeds radialEffect.
  applyAcceleration(value: number) {
    this.acceleration = value;
    this.speed += value * 2;
    this.radialEffect += this.speed * 5;
  }

  solveWith(left: Point, right: Point) {
    this.applyAcceleration(
      (-0.3 * this.radialEffect +
        (left.radialEffect - this.radialEffect) +
        (right.radialEffect - this.radialEffect)) *
        ELASTICITY -
        this.speed * FRICTION,
    );
  }

  get x() {
    return this.parent.cx + this.compX * (this.parent.radius + this.radialEffect);
  }
  get y() {
    return this.parent.cy + this.compY * (this.parent.radius + this.radialEffect);
  }
}

class Blob {
  posX: number;
  posY: number;
  radius = 70;
  cx = 0;
  cy = 0;
  hover = false;
  points: Point[] = [];

  constructor(posX: number, posY: number) {
    this.posX = posX;
    this.posY = posY;
    const divisional = (Math.PI * 2) / NUM_POINTS;
    for (let i = 0; i < NUM_POINTS; i++) {
      this.points.push(new Point(divisional * (i + 1), this));
    }
  }
}

export default function HeroBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const orange =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--pt-accent-faded")
        .trim() || "#f1765d";

    const blobs = POSITIONS.map((p) => new Blob(p.x, p.y));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Touch / coarse-pointer devices: skip interaction and the animation loop
    // entirely so the canvas can't lag the phone (esp. during scroll).
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)");

    let W = 0;
    let H = 0;
    let raf = 0;
    let frame = 0;
    const oldMouse = { x: 0, y: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Shared, responsive radius — same for every blob.
      const radius = Math.max(46, Math.min(92, W * 0.05));
      for (const b of blobs) {
        b.radius = radius;
        b.cx = W * b.posX;
        b.cy = H * b.posY;
      }
    };

    // Advance one blob's spring physics by a single fixed step (no drawing).
    const stepBlob = (b: Blob) => {
      const pts = b.points;
      const n = pts.length;
      pts[0].solveWith(pts[n - 1], pts[1]);
      for (let i = 1; i < n; i++) {
        pts[i].solveWith(pts[i - 1], pts[i + 1] || pts[0]);
      }
    };

    // One fixed physics tick across everything: ambient nudge + spring solve.
    const step = () => {
      frame += 1;
      if (frame % AMBIENT_INTERVAL === 0) {
        for (const b of blobs) {
          const p = b.points[(Math.random() * b.points.length) | 0];
          p.applyAcceleration((Math.random() - 0.5) * AMBIENT);
        }
      }
      for (const b of blobs) stepBlob(b);
    };

    // Paint the blob's current state (no physics).
    const drawBlob = (b: Blob) => {
      b.cx = W * b.posX;
      b.cy = H * b.posY;
      const pts = b.points;
      const n = pts.length;

      const p0 = pts[n - 1];
      let p1 = pts[0];
      const startX = p1.x;
      const startY = p1.y;

      ctx.beginPath();
      ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);

      for (let i = 1; i < n; i++) {
        const p2 = pts[i];
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        p1 = p2;
      }

      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + startX) / 2, (p1.y + startY) / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // Fixed-timestep loop. The physics advances by wall-clock elapsed time, so
    // when the browser starves requestAnimationFrame during a touch-scroll
    // (RAF runs on the main thread; scrolling is prioritised on the compositor),
    // we catch up the dropped ticks on the next frame instead of freezing.
    const STEP_MS = 1000 / 60;
    const MAX_STEPS = 6; // cap catch-up so a long stall can't lock the frame
    let last = performance.now();
    let acc = 0;

    const render = (now: number) => {
      acc += now - last;
      last = now;
      if (acc > STEP_MS * 30) acc = STEP_MS * 30; // drop huge gaps (tab backgrounded)

      let steps = 0;
      while (acc >= STEP_MS && steps < MAX_STEPS) {
        step();
        acc -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS) acc = 0; // stayed behind — resync rather than spiral

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2;
      ctx.strokeStyle = orange;
      ctx.fillStyle = orange;
      for (const b of blobs) drawBlob(b);
      raf = requestAnimationFrame(render);
    };

    // Poke the nearest vertex on entry/exit so the surface ripples like liquid.
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let strength =
        Math.hypot(oldMouse.x - e.clientX, oldMouse.y - e.clientY) * 10;
      if (strength > 100) strength = 100;

      for (const b of blobs) {
        const dist = Math.hypot(mx - b.cx, my - b.cy);
        let angle: number | null = null;
        if (dist < b.radius && !b.hover) {
          angle = Math.atan2(my - b.cy, mx - b.cx);
          b.hover = true;
        } else if (dist > b.radius && b.hover) {
          angle = Math.atan2(my - b.cy, mx - b.cx);
          b.hover = false;
        }
        if (angle !== null) {
          let nearest: Point | null = null;
          let best = Infinity;
          for (const p of b.points) {
            const d = Math.abs(angle - p.azimuth);
            if (d < best) {
              best = d;
              nearest = p;
            }
          }
          nearest?.applyAcceleration((strength / 100) * POKE * (b.hover ? -1 : 1));
        }
      }

      oldMouse.x = e.clientX;
      oldMouse.y = e.clientY;
    };

    resize();

    if (reduce.matches) {
      // Respect reduced-motion: single static frame, no animation.
      for (const b of blobs) {
        for (const p of b.points) {
          p.acceleration = 0;
          p.speed = 0;
          p.radialEffect = 0;
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2;
      ctx.strokeStyle = orange;
      ctx.fillStyle = orange;
      for (const b of blobs) drawBlob(b);
      return;
    }

    // The blobs animate (and ambient-jiggle) on every device. Pointer
    // interaction is desktop-only — on touch it caused scroll lag.
    raf = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    if (!coarse.matches) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
