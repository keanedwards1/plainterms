"use client";

import { useEffect, useState, type ComponentType } from "react";
import LogoLoader from "@/components/LogoLoader";
import MosaicLoader from "./MosaicLoader";
import TraceLoader from "./TraceLoader";
import "./loaders.css";

type Loader = ComponentType<{ size?: number }>;

const OPTIONS: { key: string; name: string; note: string; Loader: Loader }[] = [
  {
    key: "current",
    name: "Current",
    note: "The two squares slide apart and back together on a loop.",
    Loader: LogoLoader,
  },
  {
    key: "trace",
    name: "A · Trace",
    note: "The frame draws in, each square grows from its own corner and the overlap knocks out. Then it rests on the finished mark with a slow breath.",
    Loader: TraceLoader,
  },
  {
    key: "mosaic",
    name: "B · Mosaic",
    note: "The mark assembles from tiles in the Meadow palette, settling to orange, with a soft wave of colour passing through while it waits.",
    Loader: MosaicLoader,
  },
];

/** How long the full-screen preview holds before fading, about what a typical first load shows. */
const SPLASH_HOLD_MS = 1800;
const FADE_MS = 450;

export default function LoaderLab() {
  const [runs, setRuns] = useState<Record<string, number>>({});
  const [splash, setSplash] = useState<{ key: string; state: "in" | "out" } | null>(null);

  useEffect(() => {
    if (!splash || splash.state !== "in") return undefined;
    const out = window.setTimeout(() => setSplash((s) => (s ? { ...s, state: "out" } : s)), SPLASH_HOLD_MS);
    return () => window.clearTimeout(out);
  }, [splash]);

  useEffect(() => {
    if (!splash || splash.state !== "out") return undefined;
    const gone = window.setTimeout(() => setSplash(null), FADE_MS);
    return () => window.clearTimeout(gone);
  }, [splash]);

  const replay = (key: string) => setRuns((r) => ({ ...r, [key]: (r[key] ?? 0) + 1 }));
  const replayAll = () => setRuns((r) => Object.fromEntries(OPTIONS.map((o) => [o.key, (r[o.key] ?? 0) + 1])));
  const active = OPTIONS.find((o) => o.key === splash?.key);

  return (
    <main className="pt-page-pad py-8">
      <div className="pt-container-wide">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--pt-ink)]">Loader options</h1>
            <p className="mt-1 text-[var(--pt-muted)]">The first-visit splash, side by side.</p>
          </div>
          <button type="button" className="pt-btn pt-btn-outline px-4 py-2 text-sm" onClick={replayAll}>
            Replay all
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {OPTIONS.map(({ key, name, note, Loader }) => (
            <section key={key} className="flex flex-col gap-3">
              <div className="ld-lab-stage" key={runs[key] ?? 0}>
                <Loader size={96} />
                <div className="ld-lab-sizes">
                  <Loader size={40} />
                  <Loader size={24} />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-[var(--pt-ink)]">{name}</h2>
                <p className="mt-1 text-sm text-[var(--pt-muted)]">{note}</p>
              </div>
              <div className="mt-auto flex gap-2">
                <button type="button" className="pt-btn pt-btn-outline px-3 py-1.5 text-sm" onClick={() => replay(key)}>
                  Replay
                </button>
                <button type="button" className="pt-btn pt-btn-solid px-3 py-1.5 text-sm" onClick={() => setSplash({ key, state: "in" })}>
                  Full screen
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>

      {active && splash ? (
        <div
          className="pt-splash"
          data-state={splash.state}
          style={{ animation: "none" }}
          onClick={() => setSplash({ ...splash, state: "out" })}
        >
          <active.Loader size={72} />
        </div>
      ) : null}
    </main>
  );
}
