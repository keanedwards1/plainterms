"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Clause catcher": a small pixel game for the wait while a contract is reviewed.
 * Slide the folder to catch green ticks (good clauses) and dodge red flags.
 */

const PX = 4; // one art pixel, in CSS pixels
const H = 240;
const BEST_KEY = "pt.clauseCatcherBest";

// 11 x 7 folder, 7 x 7 tick, 7 x 7 flag. "#" = filled.
const FOLDER = ["###........", "###########", "#.........#", "#.........#", "#.........#", "#.........#", "###########"];
const TICK = ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#....", "......."];
const FLAG = ["##.....", "#####..", "#######", "#####..", "##.....", "#......", "#......"];

type Item = { x: number; y: number; good: boolean; speed: number };
type Phase = "ready" | "playing" | "over";

function readColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function sprite(g: CanvasRenderingContext2D, rows: string[], x: number, y: number, color: string) {
  g.fillStyle = color;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) if (row[c] === "#") g.fillRect(Math.round(x + c * PX), Math.round(y + r * PX), PX, PX);
  });
}

function readBest() {
  try {
    return Number(window.sessionStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export default function WaitingGame({ onPlay }: { onPlay?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);

  const state = useRef({ x: 0, dir: 0, target: null as number | null, items: [] as Item[], score: 0, lives: 3, spawn: 0, w: 320 });

  useEffect(() => {
    const t = window.setTimeout(() => setBest(readBest()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const start = useCallback(() => {
    const s = state.current;
    s.items = [];
    s.score = 0;
    s.lives = 3;
    s.spawn = 0;
    s.x = s.w / 2 - (FOLDER[0].length * PX) / 2;
    setScore(0);
    setLives(3);
    setPhase("playing");
    wrapRef.current?.focus();
    onPlay?.();
  }, [onPlay]);

  // Size the canvas to its box and draw a still frame (also the reduced-motion view).
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const size = () => {
      const w = Math.floor(wrap.clientWidth);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = H * dpr;
      canvas.style.height = `${H}px`;
      const g = canvas.getContext("2d");
      g?.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.current.w = w;
      state.current.x = Math.min(state.current.x || w / 2, w - FOLDER[0].length * PX);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // The game loop, only while playing.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return undefined;
    const ink = readColor("--pt-ink", "#15322c");
    const good = readColor("--pt-good", "#23604a");
    const bad = readColor("--pt-bad", "#a63a1e");
    const dot = "rgba(21,50,44,0.12)";
    const folderW = FOLDER[0].length * PX;
    const folderY = H - FOLDER.length * PX - 8;
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      const s = state.current;
      g.clearRect(0, 0, s.w, H);
      g.fillStyle = dot;
      for (let y = 6; y < H; y += 12) for (let x = 6; x < s.w; x += 12) g.fillRect(x, y, 1.5, 1.5);
      for (const item of s.items) sprite(g, item.good ? TICK : FLAG, item.x, item.y, item.good ? good : bad);
      sprite(g, FOLDER, s.x, folderY, ink);
    };

    const frame = (now: number) => {
      const s = state.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const speedUp = 1 + s.score * 0.04;
      if (s.target !== null) s.x += Math.max(-1, Math.min(1, (s.target - folderW / 2 - s.x) / 24)) * 320 * dt;
      else s.x += s.dir * 300 * dt;
      s.x = Math.max(0, Math.min(s.w - folderW, s.x));

      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.items.push({ x: Math.random() * (s.w - 7 * PX), y: -7 * PX, good: Math.random() < 0.62, speed: (70 + Math.random() * 50) * speedUp });
        s.spawn = Math.max(0.35, 0.95 - s.score * 0.02);
      }
      const kept: Item[] = [];
      for (const item of s.items) {
        item.y += item.speed * dt;
        const caught = item.y + 7 * PX >= folderY && item.y <= folderY + 8 && item.x + 7 * PX > s.x && item.x < s.x + folderW;
        if (caught) {
          if (item.good) {
            s.score += 1;
            setScore(s.score);
          } else {
            s.lives -= 1;
            setLives(s.lives);
          }
        } else if (item.y < H) kept.push(item);
      }
      s.items = kept;
      draw();
      if (s.lives <= 0) {
        setPhase("over");
        setBest((b) => {
          const next = Math.max(b, s.score);
          try {
            window.sessionStorage.setItem(BEST_KEY, String(next));
          } catch {
            // Best score just isn't remembered.
          }
          return next;
        });
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    if (phase === "playing") raf = requestAnimationFrame(frame);
    else draw();
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  function onKey(e: React.KeyboardEvent, down: boolean) {
    const key = e.key.toLowerCase();
    const s = state.current;
    if (key === "arrowleft" || key === "a") s.dir = down ? -1 : s.dir === -1 ? 0 : s.dir;
    else if (key === "arrowright" || key === "d") s.dir = down ? 1 : s.dir === 1 ? 0 : s.dir;
    else return;
    s.target = null;
    e.preventDefault();
  }
  function onPointer(e: React.PointerEvent) {
    if (phase !== "playing" || (e.type === "pointermove" && e.buttons === 0 && e.pointerType !== "mouse")) return;
    const box = wrapRef.current?.getBoundingClientRect();
    if (box) state.current.target = e.clientX - box.left;
  }

  return (
    <div className="rv-game">
      <div className="rv-game-bar">
        <span className="rv-label">Clause catcher</span>
        <span className="rv-game-stats" aria-live="polite">
          Score {score} · {"♥".repeat(Math.max(0, lives))}
          {best ? ` · Best ${best}` : ""}
        </span>
      </div>
      <div
        ref={wrapRef}
        className="rv-game-field"
        tabIndex={0}
        role="application"
        aria-label="Clause catcher. Use the left and right arrow keys, or drag, to catch the green ticks and dodge the red flags."
        onKeyDown={(e) => onKey(e, true)}
        onKeyUp={(e) => onKey(e, false)}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={() => {
          state.current.target = null;
        }}
      >
        <canvas ref={canvasRef} className="block w-full" aria-hidden="true" />
        {phase !== "playing" ? (
          <div className="rv-game-overlay">
            <p className="font-semibold">{phase === "over" ? `You caught ${score}.` : "Catch the green ticks. Dodge the red flags."}</p>
            <button type="button" className="pt-btn pt-btn-solid h-10 px-5 text-sm" onClick={start}>
              {phase === "over" ? "Play again" : "Play while you wait"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
