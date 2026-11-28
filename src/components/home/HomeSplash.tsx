"use client";

import { useEffect, useState } from "react";
import SpiralLoader from "@/components/loader/SpiralLoader";

// Once per page load: coming back to the home page from inside the site skips the splash.
let shown = false;

// Long enough for the squares to finish spiralling in and settle into the logo before the fade starts.
const MIN_VISIBLE_MS = 1900;
const FADE_MS = 450;

/** The first-visit splash: the animated logo over a blank page, fading out once the page is ready. */
export default function HomeSplash() {
  // A client-side visit to the home page never hydrates, so starting "gone" there can't mismatch the server.
  const [state, setState] = useState<"in" | "out" | "gone">(() => (shown ? "gone" : "in"));

  useEffect(() => {
    if (shown) return undefined;
    shown = true;
    // performance.now() counts from the start of the page load, so a slow load doesn't add extra wait.
    const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
    const out = window.setTimeout(() => setState("out"), wait);
    const gone = window.setTimeout(() => setState("gone"), wait + FADE_MS);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(gone);
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div className="pt-splash" data-state={state} aria-hidden="true">
      <SpiralLoader size={72} />
    </div>
  );
}
