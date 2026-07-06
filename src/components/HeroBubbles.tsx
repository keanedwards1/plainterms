"use client";

import { useEffect, useRef } from "react";

// Elastic-blob physics adapted from the classic canvas blob: every vertex is a
// spring coupled to its neighbours, so a poke ripples around the ring and
// settles. Solid orange fill, anchored in place, unevenly scattered.
//
// On desktop the blobs animate + react to the cursor on the main thread. On
// touch devices we run the whole thing inside a Web Worker via OffscreenCanvas
// so the per-frame paint never contends with scrolling on the main thread
// (that contention is what made scrolling feel laggy). Where OffscreenCanvas
// isn't available (older iOS Safari) we fall back to a single lively frozen
// frame — no loop, so no scroll hitch.

const NUM_POINTS = 32;
const ELASTICITY = 0.001;
const FRICTION = 0.0085;
// How hard each cursor stroke pokes the surface (1 = original, lower = gentler).
const POKE = 0.65;
// Gentle continuous idle motion so the blobs keep jiggling without a cursor.
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

// ---------------------------------------------------------------------------
// Blob engine — pure, no DOM. Runs identically on the main thread or in a
// worker; it's fed a CanvasRenderingContext2D-shaped target and a size.
// This whole function is also stringified and shipped into the Worker below,
// so it MUST stay self-contained (no closures over module scope beyond the
// constants that are re-declared inside the worker bootstrap).
// ---------------------------------------------------------------------------
function createEngine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  color: string,
  cfg: {
    NUM_POINTS: number;
    ELASTICITY: number;
    FRICTION: number;
    POKE: number;
    AMBIENT: number;
    AMBIENT_INTERVAL: number;
    POSITIONS: { x: number; y: number }[];
  },
) {
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
          cfg.ELASTICITY -
          this.speed * cfg.FRICTION,
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
      const divisional = (Math.PI * 2) / cfg.NUM_POINTS;
      for (let i = 0; i < cfg.NUM_POINTS; i++) {
        this.points.push(new Point(divisional * (i + 1), this));
      }
    }
  }

  const blobs = cfg.POSITIONS.map((p) => new Blob(p.x, p.y));
  let W = 0;
  let H = 0;
  let frame = 0;
  const oldMouse = { x: 0, y: 0 };

  const setSize = (w: number, h: number) => {
    W = w;
    H = h;
    const radius = Math.max(46, Math.min(92, W * 0.05));
    for (const b of blobs) {
      b.radius = radius;
      b.cx = W * b.posX;
      b.cy = H * b.posY;
    }
  };

  const stepBlob = (b: Blob) => {
    const pts = b.points;
    const n = pts.length;
    pts[0].solveWith(pts[n - 1], pts[1]);
    for (let i = 1; i < n; i++) {
      pts[i].solveWith(pts[i - 1], pts[i + 1] || pts[0]);
    }
  };

  const step = () => {
    frame += 1;
    if (frame % cfg.AMBIENT_INTERVAL === 0) {
      for (const b of blobs) {
        const p = b.points[(Math.random() * b.points.length) | 0];
        p.applyAcceleration((Math.random() - 0.5) * cfg.AMBIENT);
      }
    }
    for (const b of blobs) stepBlob(b);
  };

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

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    for (const b of blobs) drawBlob(b);
  };

  // Poke the nearest vertex on cursor entry/exit so the surface ripples.
  const poke = (mx: number, my: number, clientX: number, clientY: number) => {
    let strength = Math.hypot(oldMouse.x - clientX, oldMouse.y - clientY) * 10;
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
        nearest?.applyAcceleration((strength / 100) * cfg.POKE * (b.hover ? -1 : 1));
      }
    }
    oldMouse.x = clientX;
    oldMouse.y = clientY;
  };

  const settle = () => {
    for (const b of blobs) {
      for (const p of b.points) {
        p.acceleration = 0;
        p.speed = 0;
        p.radialEffect = 0;
      }
    }
  };

  return { setSize, step, draw, poke, settle };
}

// Worker source: bootstraps the engine against a transferred OffscreenCanvas
// and runs a fixed-timestep loop entirely off the main thread. `createEngine`
// is injected by name at build time (see workerSource below).
function workerBody() {
  let engine: ReturnType<typeof createEngine> | null = null;
  let canvas: OffscreenCanvas | null = null;
  let ctx:
    | (OffscreenCanvasRenderingContext2D & { setTransform: CanvasRenderingContext2D["setTransform"] })
    | null = null;
  let running = false;
  const STEP_MS = 1000 / 60;
  const MAX_STEPS = 6;
  let last = 0;
  let acc = 0;

  const raf = (
    self as unknown as { requestAnimationFrame: typeof requestAnimationFrame }
  ).requestAnimationFrame.bind(self);

  const applySize = (w: number, h: number, dpr: number) => {
    if (!canvas || !ctx || !engine) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    engine.setSize(w, h);
  };

  const loop = (now: number) => {
    if (!engine || !running) return;
    if (!last) last = now;
    acc += now - last;
    last = now;
    if (acc > STEP_MS * 30) acc = STEP_MS * 30;
    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_STEPS) {
      engine.step();
      acc -= STEP_MS;
      steps += 1;
    }
    if (steps === MAX_STEPS) acc = 0;
    engine.draw();
    raf(loop);
  };

  self.onmessage = (e: MessageEvent) => {
    const d = e.data;
    if (d.type === "init") {
      canvas = d.canvas as OffscreenCanvas;
      ctx = canvas.getContext("2d") as typeof ctx;
      // The engine factory is injected onto the worker global under a stable
      // string key so minification of the outer module can't break the name.
      const make = (self as unknown as { __createEngine: typeof createEngine })
        .__createEngine;
      engine = make(ctx!, d.color, d.cfg);
      applySize(d.w, d.h, d.dpr);
      running = true;
      last = 0;
      raf(loop);
    } else if (d.type === "resize") {
      applySize(d.w, d.h, d.dpr);
    }
  };

  // Handshake: signal we're alive so the main thread only transfers the canvas
  // (an irreversible op) once it knows the worker script actually ran.
  (self as unknown as Worker).postMessage({ type: "ready" });
}

export default function HeroBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const orange =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--pt-accent-faded")
        .trim() || "#f1765d";

    const cfg = {
      NUM_POINTS,
      ELASTICITY,
      FRICTION,
      POKE,
      AMBIENT,
      AMBIENT_INTERVAL,
      POSITIONS,
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      return {
        w: rect.width,
        h: rect.height,
        dpr: window.devicePixelRatio || 1,
      };
    };

    // ----- Reduced motion: one settled static frame, no loop. --------------
    if (reduce.matches) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h, dpr } = measure();
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const engine = createEngine(ctx, orange, cfg);
      engine.setSize(w, h);
      engine.settle();
      engine.draw();
      const onResize = () => {
        const m = measure();
        canvas.width = Math.round(m.w * m.dpr);
        canvas.height = Math.round(m.h * m.dpr);
        ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);
        engine.setSize(m.w, m.h);
        engine.settle();
        engine.draw();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    // ----- Main-thread animated loop. --------------------------------------
    // Used directly on desktop, and as the fallback whenever the worker path
    // isn't available (no OffscreenCanvas, or a CSP that blocks blob workers).
    // Returns its own cleanup fn.
    const startMainThread = (): (() => void) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return () => {};
      const engine = createEngine(ctx, orange, cfg);

      const applySize = () => {
        const { w, h, dpr } = measure();
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        engine.setSize(w, h);
      };
      applySize();

      const STEP_MS = 1000 / 60;
      const MAX_STEPS = 6;
      let last = performance.now();
      let acc = 0;
      let raf = 0;

      const render = (now: number) => {
        acc += now - last;
        last = now;
        if (acc > STEP_MS * 30) acc = STEP_MS * 30;
        let steps = 0;
        while (acc >= STEP_MS && steps < MAX_STEPS) {
          engine.step();
          acc -= STEP_MS;
          steps += 1;
        }
        if (steps === MAX_STEPS) acc = 0;
        engine.draw();
        raf = requestAnimationFrame(render);
      };

      const onMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        engine.poke(e.clientX - rect.left, e.clientY - rect.top, e.clientX, e.clientY);
      };

      raf = requestAnimationFrame(render);
      window.addEventListener("resize", applySize);
      window.addEventListener("pointermove", onMove, { passive: true });

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", applySize);
        window.removeEventListener("pointermove", onMove);
      };
    };

    // ----- Preferred path: render in a Worker via OffscreenCanvas. ---------
    // Keeps the per-frame paint off the main thread, so scrolling (even with a
    // finger held down) never contends with the animation — smooth on mobile.
    //
    // Two failure modes we must survive without a blank hero:
    //   1. No OffscreenCanvas support (older iOS).
    //   2. A CSP that blocks the blob-URL worker (fails ASYNChronously via
    //      onerror, not a throw).
    // Because transferControlToOffscreen() permanently detaches the canvas, we
    // must confirm the worker is alive BEFORE transferring. So we probe with a
    // handshake: the worker posts "ready"; only then do we transfer + init.
    const canOffscreen =
      typeof (canvas as HTMLCanvasElement & {
        transferControlToOffscreen?: () => OffscreenCanvas;
      }).transferControlToOffscreen === "function" &&
      typeof Worker !== "undefined";

    if (!canOffscreen) {
      return startMainThread();
    }

    let worker: Worker | null = null;
    let url = "";
    let onResize: (() => void) | null = null;
    let mainCleanup: (() => void) | null = null;
    let settled = false; // handshake resolved (either way) — don't double-handle

    const fallBackToMainThread = () => {
      if (settled) return;
      settled = true;
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (url) URL.revokeObjectURL(url);
      mainCleanup = startMainThread();
    };

    try {
      const workerSource = `
        self.__createEngine = ${createEngine.toString()};
        (${workerBody.toString()})();
      `;
      url = URL.createObjectURL(
        new Blob([workerSource], { type: "application/javascript" }),
      );
      worker = new Worker(url);

      // If the worker script is blocked (CSP) or throws, this fires — fall back.
      worker.onerror = () => fallBackToMainThread();

      worker.onmessage = (e: MessageEvent) => {
        if (settled) return;
        if (e.data?.type !== "ready" || !worker) return;
        settled = true;
        const offscreen = (
          canvas as HTMLCanvasElement & {
            transferControlToOffscreen: () => OffscreenCanvas;
          }
        ).transferControlToOffscreen();
        const { w, h, dpr } = measure();
        worker.postMessage(
          { type: "init", canvas: offscreen, w, h, dpr, color: orange, cfg },
          [offscreen as unknown as Transferable],
        );
        onResize = () => {
          const m = measure();
          worker?.postMessage({ type: "resize", w: m.w, h: m.h, dpr: m.dpr });
        };
        window.addEventListener("resize", onResize);
      };

      // Safety net: if no handshake arrives shortly (silent failure), fall back.
      const handshakeTimer = window.setTimeout(fallBackToMainThread, 1500);
      const clearTimer = () => window.clearTimeout(handshakeTimer);

      return () => {
        clearTimer();
        settled = true;
        if (onResize) window.removeEventListener("resize", onResize);
        if (worker) worker.terminate();
        if (url) URL.revokeObjectURL(url);
        if (mainCleanup) mainCleanup();
      };
    } catch {
      fallBackToMainThread();
      return () => {
        if (onResize) window.removeEventListener("resize", onResize);
        if (mainCleanup) mainCleanup();
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
