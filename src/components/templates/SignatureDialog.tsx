"use client";

import { Mrs_Saint_Delafield } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { isSignatureImage } from "@/lib/templateKit/fill";

const script = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"], display: "swap", preload: false });

const INK = "#14213d";
const WIDTH = 520;
const HEIGHT = 170;

/** Crops a canvas to its ink, with a little padding, and returns a PNG data URL (or null if blank). */
function trimmed(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  const pad = Math.round(8 * (window.devicePixelRatio || 1));
  const w = Math.min(width, right - left + 1 + pad * 2);
  const h = Math.min(height, bottom - top + 1 + pad * 2);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")?.drawImage(canvas, Math.max(0, left - pad), Math.max(0, top - pad), w, h, 0, 0, w, h);
  const url = out.toDataURL("image/png");
  return isSignatureImage(url) ? url : null;
}

function setUpCanvas(canvas: HTMLCanvasElement) {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = WIDTH * ratio;
  canvas.height = HEIGHT * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  return ctx;
}

function DrawPad({ onInk }: { onInk: (canvas: HTMLCanvasElement | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(false);

  useEffect(() => {
    if (ref.current) setUpCanvas(ref.current);
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * WIDTH, y: ((e.clientY - r.top) / r.height) * HEIGHT };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = point(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = e.pointerType === "pen" ? 1.6 + e.pressure * 2 : 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, (last.current.x + p.x) / 2, (last.current.y + p.y) / 2);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!inked) {
      setInked(true);
      onInk(e.currentTarget);
    }
  };
  const up = () => {
    last.current = null;
  };

  const clear = () => {
    if (ref.current) setUpCanvas(ref.current);
    setInked(false);
    onInk(null);
  };

  return (
    <div className="pt-sigpad">
      <canvas
        ref={ref}
        className="pt-sigpad-canvas"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        aria-label="Draw your signature here"
        role="img"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <span className="pt-sigpad-line" aria-hidden="true" />
      {inked ? (
        <button type="button" className="pt-sigpad-clear" onClick={clear}>
          Clear
        </button>
      ) : (
        <span className="pt-sigpad-hint" aria-hidden="true">
          Sign here
        </span>
      )}
    </div>
  );
}

/** Draw or type a signature. The image stays on this device and only goes into this document. */
export default function SignatureDialog({
  open,
  role,
  suggestedName,
  onClose,
  onAdopt,
}: {
  open: boolean;
  role: string;
  suggestedName: string;
  onClose: () => void;
  onAdopt: (image: string) => void;
}) {
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState(suggestedName);
  const [drawn, setDrawn] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastName, setLastName] = useState(suggestedName);
  if (suggestedName !== lastName) {
    setLastName(suggestedName);
    setTyped(suggestedName);
  }

  const adoptTyped = useCallback(async () => {
    const name = typed.trim().slice(0, 60);
    if (!name) return null;
    const family = script.style.fontFamily;
    try {
      await document.fonts.load(`64px ${family}`);
    } catch {
      // Falls back to the browser's cursive font.
    }
    const canvas = document.createElement("canvas");
    const ctx = setUpCanvas(canvas);
    if (!ctx) return null;
    let size = 72;
    ctx.font = `${size}px ${family}, cursive`;
    while (ctx.measureText(name).width > WIDTH - 40 && size > 28) {
      size -= 4;
      ctx.font = `${size}px ${family}, cursive`;
    }
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText(name, 20, HEIGHT / 2);
    return trimmed(canvas);
  }, [typed]);

  const adopt = async () => {
    setError(null);
    const image = tab === "draw" ? (drawn ? trimmed(drawn) : null) : await adoptTyped();
    if (!image) {
      setError(tab === "draw" ? "Draw your signature in the box first." : "Type your name first.");
      return;
    }
    onAdopt(image);
    setDrawn(null);
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Sign as ${role}`} description="Draw your signature or type your name. It is added to this document only and stays on your device.">
      <div className="pt-sigdlg">
        <div className="pt-sigtabs" role="tablist" aria-label="How to sign">
          <button type="button" role="tab" aria-selected={tab === "draw"} onClick={() => setTab("draw")}>
            Draw
          </button>
          <button type="button" role="tab" aria-selected={tab === "type"} onClick={() => setTab("type")}>
            Type
          </button>
        </div>

        {tab === "draw" ? (
          <DrawPad onInk={setDrawn} />
        ) : (
          <div className="pt-sigtype">
            <label className="pt-sigtype-label">
              Your full name
              <input value={typed} maxLength={60} onChange={(e) => setTyped(e.target.value)} className="pt-tform-input" autoComplete="name" />
            </label>
            <p className={`pt-sigtype-preview ${script.className}`} aria-hidden="true">
              {typed.trim() || "Your name"}
            </p>
          </div>
        )}

        <p className="pt-sigdlg-consent">
          By selecting Add signature, you agree this is your electronic signature and that it means the same as signing on paper.
        </p>
        {error ? (
          <p role="alert" className="pt-sigdlg-error">
            {error}
          </p>
        ) : null}
        <div className="pt-sigdlg-actions">
          <button type="button" className="pt-btn pt-btn-ghost px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="pt-btn pt-btn-solid px-4 py-2 text-sm" onClick={adopt}>
            Add signature
          </button>
        </div>
      </div>
    </Dialog>
  );
}
