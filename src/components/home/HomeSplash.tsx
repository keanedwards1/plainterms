"use client";

import { useEffect, useRef, useState } from "react";
import SpiralLoader from "@/components/loader/SpiralLoader";

// Once per page load: coming back to the home page from inside the site skips the splash.
let shown = false;

const FADE_MS = 450;
/** The CSS fallback in globals.css hides the splash at 4s in case scripts never run. */
const CSS_FALLBACK_MS = 4000;
/** If something on the page never finishes loading, stop waiting for it. */
const MAX_WAIT_MS = 10000;

/**
 * The first-visit splash: the animated logo over a blank page. The animation loops for as long as the page takes
 * to load, and the splash fades out as soon as it has.
 */
export default function HomeSplash() {
  // A client-side visit to the home page never hydrates, so starting "gone" there can't mismatch the server.
  const [state, setState] = useState<"in" | "out" | "gone">(() => (shown ? "gone" : "in"));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shown) return undefined;
    // Scripts are running, so the CSS fallback isn't needed and would cut a slow load short. If it has already
    // hidden the splash, leave it hidden.
    if (ref.current && performance.now() < CSS_FALLBACK_MS - 200) ref.current.style.animation = "none";

    // Marked shown only when the fade starts, so an effect that runs twice (dev Strict Mode) still fades.
    const finish = () => {
      if (shown) return;
      shown = true;
      setState("out");
      window.setTimeout(() => setState("gone"), FADE_MS);
    };
    const cap = window.setTimeout(finish, Math.max(0, MAX_WAIT_MS - performance.now()));
    if (document.readyState === "complete") {
      const frame = window.requestAnimationFrame(finish);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(cap);
      };
    }
    window.addEventListener("load", finish, { once: true });
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(cap);
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div ref={ref} className="pt-splash" data-state={state} aria-hidden="true">
      <SpiralLoader size={72} />
    </div>
  );
}
