"use client";

import { useEffect, useRef } from "react";

/**
 * The wait screen's centrepiece: a living 3D network drawn on a canvas.
 *
 * Nodes sit on a shape (cloud, sphere, torus, helix, galaxy) and glide to the next one, while a 3D flow field keeps
 * everything gently liquid. Each node links to its nearest neighbours, and packets of light hop along the links,
 * making nodes flare as they arrive. Each visit gets one of the presets at random. Decorative only; it pauses when
 * off screen or in a background tab, and holds still under reduced motion.
 */

type RGB = [number, number, number];
type Shape = "cloud" | "sphere" | "torus" | "helix" | "galaxy";
type Look = {
  nodes: number;
  dust: number;
  linkDistance: number;
  maxLinks: number;
  linkOpacity: number;
  nodeSize: number;
  dustSize: number;
  packetRate: number;
  packetSpeed: number;
  packetSize: number;
  packetHops: number;
  packetTrail: number;
  flowSpeed: number;
  turbulence: number;
  rotation: number;
  tilt: number;
  zoom: number;
  trails: number;
  glow: number;
  /** A fixed shape, or "auto" to glide from shape to shape every `morphSeconds`. */
  shape: Shape | "auto";
  morphSeconds: number;
  /** "lighter" adds light where things overlap (glowing); "source-over" paints plainly. */
  blend: "lighter" | "source-over";
  nodeColor: RGB;
  linkColor: RGB;
  packetColor: RGB;
  dustColor: RGB;
};

const INK: RGB = [21, 50, 44];
const MUTED: RGB = [94, 107, 102];

const ACCENT: RGB = [233, 120, 58];

const DEFAULT: Look = {
  nodes: 220, dust: 700, linkDistance: 0.32, maxLinks: 5, linkOpacity: 0.4, nodeSize: 1.7, dustSize: 0.9,
  packetRate: 9, packetSpeed: 1.2, packetSize: 2.4, packetHops: 5, packetTrail: 0.6,
  flowSpeed: 0.5, turbulence: 0.22, rotation: 0.18, tilt: 0.35, zoom: 1, trails: 0.35, glow: 0.55, shape: "auto", morphSeconds: 14, blend: "source-over",
  nodeColor: INK, linkColor: MUTED, packetColor: ACCENT, dustColor: MUTED,
};
const NAVY_INK: Look = {
  nodes: 220, dust: 750, linkDistance: 0.32, maxLinks: 6, linkOpacity: 0.4, nodeSize: 1.7, dustSize: 0.9,
  packetRate: 9, packetSpeed: 1.2, packetSize: 2.4, packetHops: 5, packetTrail: 0.5,
  flowSpeed: 0.5, turbulence: 0.22, rotation: 0.18, tilt: 0.35, zoom: 0.8, trails: 0.72, glow: 0.55, shape: "auto", morphSeconds: 14, blend: "lighter",
  nodeColor: INK, linkColor: INK, packetColor: [28, 47, 146], dustColor: [0, 0, 0],
};
const EMBER_GALAXY: Look = {
  nodes: 220, dust: 850, linkDistance: 0.7, maxLinks: 3, linkOpacity: 0.68, nodeSize: 3, dustSize: 0.9,
  packetRate: 15, packetSpeed: 0.4, packetSize: 1.8, packetHops: 10, packetTrail: 0.38,
  flowSpeed: 1.6, turbulence: 0.51, rotation: -0.21, tilt: -1.12, zoom: 0.55, trails: 0.03, glow: 0.54, shape: "galaxy", morphSeconds: 23, blend: "lighter",
  nodeColor: [29, 27, 26], linkColor: [138, 127, 117], packetColor: [255, 106, 31], dustColor: [84, 79, 74],
};
const MONO_SPHERE: Look = {
  nodes: 220, dust: 750, linkDistance: 0.29, maxLinks: 4, linkOpacity: 0.16, nodeSize: 4.2, dustSize: 2.9,
  packetRate: 12, packetSpeed: 4.6, packetSize: 2.6, packetHops: 2, packetTrail: 0.76,
  flowSpeed: 1.15, turbulence: 0.94, rotation: -0.07, tilt: 0.11, zoom: 0.75, trails: 0.14, glow: 0.37, shape: "sphere", morphSeconds: 6, blend: "lighter",
  nodeColor: INK, linkColor: INK, packetColor: INK, dustColor: MUTED,
};

const PRESETS: Look[] = [DEFAULT, NAVY_INK, EMBER_GALAXY, MONO_SPHERE];

const TAU = Math.PI * 2;
const MAX_NODES = 240;
const MAX_DUST = 900;
const MAX_PACKETS = 200;
const SHAPES: Shape[] = ["cloud", "sphere", "torus", "helix", "galaxy"];

const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r | 0},${g | 0},${b | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const spriteCache = new Map<string, HTMLCanvasElement>();
function glowSprite(c: RGB): HTMLCanvasElement {
  // Rounded so a colour that's easing between looks doesn't make a new sprite every frame.
  const key = c.map((v) => Math.round(v / 8) * 8).join(",");
  let s = spriteCache.get(key);
  if (!s) {
    s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${key},0.9)`);
    grad.addColorStop(0.3, `rgba(${key},0.35)`);
    grad.addColorStop(1, `rgba(${key},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    spriteCache.set(key, s);
  }
  return s;
}

function gaussian() {
  return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(TAU * Math.random());
}

/** Target positions for every shape, in one shared random order so any prefix of nodes covers each shape evenly. */
function buildShapes(): Record<Shape, Float32Array> {
  const out = Object.fromEntries(SHAPES.map((s) => [s, new Float32Array(MAX_NODES * 3)])) as Record<Shape, Float32Array>;
  const order = Array.from({ length: MAX_NODES }, (_, i) => i).sort(() => Math.random() - 0.5);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let k = 0; k < MAX_NODES; k++) {
    const i = order[k] * 3;
    {
      const r = Math.pow(Math.random(), 0.55);
      const th = TAU * Math.random();
      const ph = Math.acos(2 * Math.random() - 1);
      out.cloud.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.85, r * Math.sin(ph) * Math.sin(th)], i);
    }
    {
      const y = 1 - (2 * (k + 0.5)) / MAX_NODES;
      const r = Math.sqrt(1 - y * y);
      out.sphere.set([r * Math.cos(golden * k) * 0.9, y * 0.9, r * Math.sin(golden * k) * 0.9], i);
    }
    {
      const u = TAU * Math.random();
      const v = TAU * Math.random();
      out.torus.set([(0.68 + 0.27 * Math.cos(v)) * Math.cos(u), 0.27 * Math.sin(v), (0.68 + 0.27 * Math.cos(v)) * Math.sin(u)], i);
    }
    {
      const t = Math.random();
      const a = t * TAU * 2.2;
      const y = (t - 0.5) * 1.9;
      if (Math.random() < 0.18) {
        const f = Math.random() * 2 - 1;
        out.helix.set([0.45 * Math.cos(a) * f, y, 0.45 * Math.sin(a) * f], i);
      } else {
        const strand = Math.random() < 0.5 ? 0 : Math.PI;
        out.helix.set([0.45 * Math.cos(a + strand), y, 0.45 * Math.sin(a + strand)], i);
      }
    }
    {
      const core = Math.random() < 0.18;
      const r = core ? Math.abs(gaussian()) * 0.12 : 0.15 + Math.pow(Math.random(), 0.8) * 0.85;
      const arm = Math.floor(Math.random() * 3);
      const a = arm * (TAU / 3) + r * 3.6 + gaussian() * 0.18;
      out.galaxy.set([r * Math.cos(a), gaussian() * 0.05 * (1.2 - r), r * Math.sin(a)], i);
    }
  }
  return out;
}

/** A smooth 3D flow: three domain-warped sine fields, one per axis, so motion curls instead of just waving. */
function flow(x: number, y: number, z: number, t: number, out: Float32Array) {
  out[0] = Math.sin(1.9 * y + 0.8 * t + Math.sin(1.4 * z - 0.5 * t));
  out[1] = Math.sin(1.7 * z - 0.7 * t + Math.cos(1.6 * x + 0.4 * t));
  out[2] = Math.sin(2.1 * x + 0.6 * t + Math.sin(1.3 * y + 0.9 * t));
}

export default function PlexusLoader() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = wrap.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!box || !canvas || !ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let ready = false;
    const resize = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ready) draw(performance.now());
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const shapes = buildShapes();
    const p: Look = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    let shapeIndex = p.shape === "auto" ? 0 : SHAPES.indexOf(p.shape);
    let shapeSince = 0;
    const cur = new Float32Array(shapes[SHAPES[shapeIndex]]);
    const pos = new Float32Array(MAX_NODES * 3);
    const sx = new Float32Array(MAX_NODES);
    const sy = new Float32Array(MAX_NODES);
    const sp = new Float32Array(MAX_NODES);
    const flare = new Float32Array(MAX_NODES);
    const linkCount = new Uint8Array(MAX_NODES);
    const neighbours: number[][] = Array.from({ length: MAX_NODES }, () => []);
    const links: number[] = [];
    const dust = new Float32Array(MAX_DUST * 3);
    for (let i = 0; i < MAX_DUST; i++) {
      const r = 0.3 + Math.pow(Math.random(), 0.7) * 1.1;
      const th = TAU * Math.random();
      const ph = Math.acos(2 * Math.random() - 1);
      dust.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    type Packet = { from: number; to: number; progress: number; hops: number; trail: number[] };
    let packets: Packet[] = [];
    let packetDebt = 0;
    const fv = new Float32Array(3);
    const dsx = new Float32Array(1);
    const dsy = new Float32Array(1);
    const dsp = new Float32Array(1);

    let flowT = 0;
    let spin = 0;
    const start = performance.now();
    let last = start;

    const spawnPacket = () => {
      if (packets.length >= MAX_PACKETS) return;
      const N = Math.min(Math.round(p.nodes), MAX_NODES);
      for (let tries = 0; tries < 12; tries++) {
        const a = Math.floor(Math.random() * N);
        const nb = neighbours[a];
        if (!nb.length) continue;
        packets.push({ from: a, to: nb[Math.floor(Math.random() * nb.length)], progress: 0, hops: Math.round(p.packetHops), trail: [] });
        return;
      }
    };

    const draw = (now: number) => {
      // A frame's timestamp can be a little earlier than the time taken at mount, so never let either go negative.
      const t = Math.max(0, (now - start) / 1000);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;

      // ---- shape: fixed, or the next one every few seconds
      if (p.shape === "auto" && t - shapeSince > p.morphSeconds) {
        shapeIndex = (shapeIndex + 1) % SHAPES.length;
        shapeSince = t;
      }
      const N = Math.min(Math.round(p.nodes), MAX_NODES);
      const tgt = shapes[SHAPES[shapeIndex]];
      const k = 1 - Math.exp(-dt * 0.9);
      for (let i = 0; i < N * 3; i++) cur[i] += (tgt[i] - cur[i]) * k;

      // ---- motion
      flowT += dt * p.flowSpeed;
      spin += dt * p.rotation;
      const turb = p.turbulence;
      const R = Math.min(w, h) * 0.42 * p.zoom;
      const cx = w / 2;
      const cy = h / 2;
      const cosY = Math.cos(spin), sinY = Math.sin(spin), cosX = Math.cos(p.tilt), sinX = Math.sin(p.tilt);
      const fov = 2.8;
      const project = (x: number, y: number, z: number, i: number, xs: Float32Array, ys: Float32Array, ps: Float32Array) => {
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const s = fov / (fov + z2);
        xs[i] = cx + x1 * R * s;
        ys[i] = cy + y1 * R * s;
        ps[i] = s;
      };
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        flow(cur[o] * 1.5, cur[o + 1] * 1.5, cur[o + 2] * 1.5, flowT, fv);
        pos[o] = cur[o] + fv[0] * turb * 0.25;
        pos[o + 1] = cur[o + 1] + fv[1] * turb * 0.25;
        pos[o + 2] = cur[o + 2] + fv[2] * turb * 0.25;
        project(pos[o], pos[o + 1], pos[o + 2], i, sx, sy, sp);
      }

      // ---- links: nearest neighbours within reach, capped per node
      links.length = 0;
      linkCount.fill(0, 0, N);
      for (let i = 0; i < N; i++) neighbours[i].length = 0;
      const maxLinks = Math.round(p.maxLinks);
      const L = p.linkDistance;
      const L2 = L * L;
      for (let i = 0; i < N; i++) {
        if (linkCount[i] >= maxLinks) continue;
        const ox = pos[i * 3], oy = pos[i * 3 + 1], oz = pos[i * 3 + 2];
        for (let j = i + 1; j < N; j++) {
          const dx = pos[j * 3] - ox, dy = pos[j * 3 + 1] - oy, dz = pos[j * 3 + 2] - oz;
          if (dx * dx + dy * dy + dz * dz < L2 && linkCount[j] < maxLinks) {
            links.push(i, j);
            linkCount[i]++;
            linkCount[j]++;
            neighbours[i].push(j);
            neighbours[j].push(i);
            if (linkCount[i] >= maxLinks) break;
          }
        }
      }

      // ---- draw
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${1 - p.trails})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = p.blend;
      const depthOf = (s: number) => Math.max(0, Math.min(1, (s - 0.72) / 0.55));

      // dust
      const D = Math.min(Math.round(p.dust), MAX_DUST);
      ctx.fillStyle = rgba(p.dustColor, 1);
      for (let i = 0; i < D; i++) {
        const o = i * 3;
        const drift = Math.sin(flowT * 0.6 + i) * 0.03 * p.turbulence;
        project(dust[o] + drift, dust[o + 1], dust[o + 2], 0, dsx, dsy, dsp);
        const dd = depthOf(dsp[0]);
        ctx.globalAlpha = 0.08 + 0.3 * dd;
        const s = p.dustSize * (0.6 + dd);
        ctx.fillRect(dsx[0] - s / 2, dsy[0] - s / 2, s, s);
      }

      // links
      ctx.lineCap = "round";
      ctx.strokeStyle = rgba(p.linkColor, 1);
      for (let l = 0; l < links.length; l += 2) {
        const a = links[l], b = links[l + 1];
        const dd = (depthOf(sp[a]) + depthOf(sp[b])) / 2;
        const dist = Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]);
        ctx.globalAlpha = Math.min(1, p.linkOpacity * (1 - dist / L) * (0.35 + 0.65 * dd));
        ctx.lineWidth = 0.5 + dd * 0.9;
        ctx.beginPath();
        ctx.moveTo(sx[a], sy[a]);
        ctx.lineTo(sx[b], sy[b]);
        ctx.stroke();
      }

      // nodes
      for (let i = 0; i < N; i++) {
        flare[i] *= Math.pow(0.05, dt);
        const dd = depthOf(sp[i]);
        const f = flare[i];
        const r = p.nodeSize * (0.55 + dd * 0.9) * (1 + f * 1.4);
        const col = f > 0.05 ? mix(p.nodeColor, p.packetColor, Math.min(1, f)) : p.nodeColor;
        if (p.glow > 0.01 && (dd > 0.35 || f > 0.1)) {
          ctx.globalAlpha = p.glow * (0.18 + 0.5 * f) * (0.4 + dd);
          const g = r * (4 + f * 4);
          ctx.drawImage(glowSprite(col), sx[i] - g, sy[i] - g, g * 2, g * 2);
        }
        ctx.globalAlpha = 0.35 + 0.6 * dd + 0.3 * f;
        ctx.fillStyle = rgba(col, 1);
        ctx.beginPath();
        ctx.arc(sx[i], sy[i], r, 0, TAU);
        ctx.fill();
      }

      // packets: spawn, travel along links, hop onward from node to node
      packetDebt += dt * p.packetRate;
      while (packetDebt >= 1) {
        spawnPacket();
        packetDebt -= 1;
      }
      const trailLen = Math.round(2 + p.packetTrail * 14);
      packets = packets.filter((pk) => {
        if (pk.from >= N || pk.to >= N) return false;
        const dist = Math.hypot(pos[pk.from * 3] - pos[pk.to * 3], pos[pk.from * 3 + 1] - pos[pk.to * 3 + 1], pos[pk.from * 3 + 2] - pos[pk.to * 3 + 2]) || 0.05;
        pk.progress += (dt * p.packetSpeed * 0.45) / dist;
        if (pk.progress >= 1) {
          flare[pk.to] = 1;
          const options = neighbours[pk.to].filter((n) => n !== pk.from);
          if (--pk.hops <= 0 || !options.length) return false;
          pk.from = pk.to;
          pk.to = options[Math.floor(Math.random() * options.length)];
          pk.progress = 0;
        }
        const x = sx[pk.from] + (sx[pk.to] - sx[pk.from]) * pk.progress;
        const y = sy[pk.from] + (sy[pk.to] - sy[pk.from]) * pk.progress;
        pk.trail.push(x, y);
        if (pk.trail.length > trailLen * 2) pk.trail.splice(0, pk.trail.length - trailLen * 2);
        return true;
      });
      const packetSprite = glowSprite(p.packetColor);
      for (const pk of packets) {
        const tr = pk.trail;
        const n = tr.length / 2;
        if (n > 1 && p.packetTrail > 0) {
          ctx.strokeStyle = rgba(p.packetColor, 1);
          for (let i = 1; i < n; i++) {
            ctx.globalAlpha = (i / n) * 0.7;
            ctx.lineWidth = p.packetSize * 0.55 * (i / n);
            ctx.beginPath();
            ctx.moveTo(tr[i * 2 - 2], tr[i * 2 - 1]);
            ctx.lineTo(tr[i * 2], tr[i * 2 + 1]);
            ctx.stroke();
          }
        }
        const x = tr[tr.length - 2];
        const y = tr[tr.length - 1];
        const s = p.packetSize;
        if (p.glow > 0.01) {
          ctx.globalAlpha = 0.25 + p.glow * 0.6;
          ctx.drawImage(packetSprite, x - s * 5, y - s * 5, s * 10, s * 10);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = rgba(p.packetColor, 1);
        ctx.beginPath();
        ctx.arc(x, y, s * 0.75, 0, TAU);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let running = false;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running || reduceMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    if (reduceMotion) for (let i = 0; i < 40; i++) draw(start + i * 33);
    ready = true;

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && !document.hidden) play();
      else pause();
    });
    io.observe(box);
    const onVisibility = () => (document.hidden || !onScreen ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);
    play();
    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={wrap} className="rv-plexus" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
