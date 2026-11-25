"use client";

import { useEffect, useRef } from "react";

function TitleBar() {
  return (
    <div className="flex h-4 items-center gap-1 bg-(--pt-ink) px-1.5">
      <i className="h-[7px] w-[7px] bg-(--pt-accent)" />
      <i className="h-[7px] w-[7px] bg-(--pt-paper)" />
    </div>
  );
}

function Clock() {
  const hour = useRef<SVGPathElement>(null);
  const minute = useRef<SVGPathElement>(null);
  const second = useRef<SVGPathElement>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = d.getHours() % 12;
      const m = d.getMinutes();
      const s = d.getSeconds();
      hour.current?.setAttribute("transform", `rotate(${h * 30 + m / 2} 30 30)`);
      minute.current?.setAttribute("transform", `rotate(${m * 6} 30 30)`);
      second.current?.setAttribute("transform", `rotate(${s * 6} 30 30)`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <svg viewBox="0 0 60 60" className="block h-16 w-16">
      <circle cx="30" cy="30" r="25" fill="#fff" stroke="#15322C" strokeWidth="2" />
      <g stroke="#15322C" strokeWidth="2">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M30 8v4" transform={`rotate(${i * 30} 30 30)`} />
        ))}
      </g>
      <path ref={hour} d="M30 30V17" stroke="#15322C" strokeWidth="3" />
      <path ref={minute} d="M30 30V11" stroke="#15322C" strokeWidth="2" />
      <path ref={second} d="M30 32V9" stroke="#E9783A" strokeWidth="1.2" />
      <circle cx="30" cy="30" r="2.5" fill="#E9783A" />
    </svg>
  );
}

function Life() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return undefined;
    const N = 16;
    const S = 6;
    const seed = () => Array.from({ length: N * N }, () => (Math.random() < 0.28 ? 1 : 0));
    let cells = seed();
    [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([x, y]) => (cells[(y + 2) * N + x + 2] = 1));
    const draw = () => {
      ctx.fillStyle = "#FFFDF8";
      ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = "#15322C";
      cells.forEach((v, i) => v && ctx.fillRect((i % N) * S, Math.floor(i / N) * S, S - 1, S - 1));
    };
    const step = () => {
      const next = cells.map((v, i) => {
        const x = i % N;
        const y = Math.floor(i / N);
        let k = 0;
        for (let j = -1; j < 2; j++) for (let m = -1; m < 2; m++) if (j || m) k += cells[((y + j + N) % N) * N + ((x + m + N) % N)];
        return k === 3 || (v && k === 2) ? 1 : 0;
      });
      cells = next.some(Boolean) ? next : seed();
      draw();
    };
    draw();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = window.setInterval(step, 320);
    return () => window.clearInterval(id);
  }, []);

  return <canvas ref={ref} width={96} height={96} className="block h-24 w-24 [image-rendering:pixelated]" />;
}

/** Two small desk widgets that sit in the hero margins on wide screens. */
export default function HeroWidgets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden xl:block">
      <div className="absolute left-2 top-10 border-[1.5px] border-(--pt-ink) bg-(--pt-paper) shadow-[3px_3px_0_var(--pt-ink)]">
        <TitleBar />
        <div className="p-2">
          <Clock />
        </div>
      </div>
      <div className="absolute right-2 top-32 border-[1.5px] border-(--pt-ink) bg-(--pt-paper) shadow-[3px_3px_0_var(--pt-ink)]">
        <TitleBar />
        <div className="p-1.5">
          <Life />
        </div>
      </div>
    </div>
  );
}
