"use client";

import { useEffect, useState, type ComponentType } from "react";
import LogoLoader from "@/components/LogoLoader";
import MosaicLoader from "./MosaicLoader";
import SwapLoader from "./SwapLoader";
import {
  DockClampLoader,
  DockConvergeLoader,
  DockSettleLoader,
  DockSpinLoader,
  FrameClickLoader,
  FrameDropLoader,
  FrameSettleLoader,
  FrameSlideLoader,
} from "./DockLoaders";
import { DockLoader, InterlockLoader, LayersLoader, MagnetLoader, SlicesLoader, SpiralLoader } from "./PartsLoaders";
import { EmergeLoader, FlipboardLoader, RainLoader, RippleLoader, ScatterLoader, SnakeLoader } from "./TileLoaders";
import TraceLoader from "./TraceLoader";
import "./loaders.css";

type Loader = ComponentType<{ size?: number }>;

const OPTIONS: { key: string; name: string; note: string; Loader: Loader }[] = [
  {
    key: "original",
    name: "Original",
    note: "The previous splash: the two squares slide apart and back together on a loop.",
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
  {
    key: "swap",
    name: "C · Swap",
    note: "The squares slide all the way through each other and trade corners, then trade back. The mark nearly vanishes as they cross.",
    Loader: SwapLoader,
  },
  {
    key: "dock",
    name: "D · Dock",
    note: "The frame arrives as four corner brackets that lock together, then one square slides in from each side and docks.",
    Loader: DockLoader,
  },
  {
    key: "dock-clamp",
    name: "D2 · Dock: Clamp",
    note: "Reversed order: the squares slide in and dock first, then the four corners clamp in around them and give them a little squeeze.",
    Loader: DockClampLoader,
  },
  {
    key: "dock-converge",
    name: "D3 · Dock: Converge",
    note: "Every part flies in from its own corner at almost the same moment, with a springy overshoot, like a quick implosion.",
    Loader: DockConvergeLoader,
  },
  {
    key: "dock-spin",
    name: "D4 · Dock: Spin-in",
    note: "The corners swing into place, pivoting on their tips, and the squares drop in from above and below with a bounce.",
    Loader: DockSpinLoader,
  },
  {
    key: "dock-settle",
    name: "D5 · Dock: Settle",
    note: "Dock's assembly plays once, then the finished logo holds with a slow breath (corners easing out, squares easing apart) instead of coming apart.",
    Loader: DockSettleLoader,
  },
  {
    key: "frame-slide",
    name: "E1 · Whole frame: Slide",
    note: "The frame stays whole and still. The squares slide in from behind its left and right edges, overshoot a touch and dock, then slide back out.",
    Loader: FrameSlideLoader,
  },
  {
    key: "frame-drop",
    name: "E2 · Whole frame: Drop",
    note: "The frame stays whole. One square drops in from behind the top edge and the other rises from the bottom, each landing with a small bounce.",
    Loader: FrameDropLoader,
  },
  {
    key: "frame-click",
    name: "E3 · Whole frame: Click",
    note: "The squares glide in from their own corners, and the instant they lock, the whole logo gives one firm click.",
    Loader: FrameClickLoader,
  },
  {
    key: "frame-settle",
    name: "E4 · Whole frame: Settle",
    note: "Slide plays once, then the finished logo holds, with the squares slowly breathing apart and back together while the page loads.",
    Loader: FrameSettleLoader,
  },
  {
    key: "magnet",
    name: "E · Magnet",
    note: "The squares strain toward each other from opposite corners, then snap together with a flash in the gap, and pull apart again.",
    Loader: MagnetLoader,
  },
  {
    key: "spiral",
    name: "F · Spiral (live)",
    note: "The squares orbit the centre, spiralling inward while staying upright, and settle into the mark. Then they spin back out.",
    Loader: SpiralLoader,
  },
  {
    key: "slices",
    name: "G · Slices",
    note: "The finished mark is cut into strips that slide in from alternating sides and line up into the logo.",
    Loader: SlicesLoader,
  },
  {
    key: "interlock",
    name: "H · Interlock",
    note: "The mark's two L-shaped halves tumble in from opposite sides and click together around the hole.",
    Loader: InterlockLoader,
  },
  {
    key: "layers",
    name: "I · Layers",
    note: "The frame, then each square, drops in from in front of the screen and lands in place, then they recede.",
    Loader: LayersLoader,
  },
  {
    key: "scatter",
    name: "J · Scatter",
    note: "Tiles fly in from all over, spinning, and lock into the mark. Then it blows apart and does it again.",
    Loader: ScatterLoader,
  },
  {
    key: "rain",
    name: "K · Rain",
    note: "Tiles fall into the frame and stack up from the bottom row with a little bounce, then the whole mark drains away.",
    Loader: RainLoader,
  },
  {
    key: "ripple",
    name: "L · Ripple",
    note: "The mark stays whole while rings spread out from the hole in the middle, turning tiles into colourful diamonds as they pass.",
    Loader: RippleLoader,
  },
  {
    key: "flipboard",
    name: "M · Flipboard",
    note: "Every tile flips like an airport departure board, through two palette colours, before landing on orange.",
    Loader: FlipboardLoader,
  },
  {
    key: "snake",
    name: "N · Snake",
    note: "The mark sits faint while a bright head winds back and forth through every tile, leaving a fading tail of colour.",
    Loader: SnakeLoader,
  },
  {
    key: "emerge",
    name: "O · Emerge",
    note: "The frame starts packed with colourful tiles. Everything that isn't the mark shrinks away, leaving it standing in orange.",
    Loader: EmergeLoader,
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
