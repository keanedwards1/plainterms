"use client";

import { useEffect, useState } from "react";
import SpiralLoader from "@/components/loader/SpiralLoader";

// Once per page load: coming back to the home page from inside the site skips the splash.
let shown = false;

const FADE_MS = 450;

/** The first-visit splash: the animated logo over a blank page, fading out as soon as the page has loaded. */
export default function HomeSplash() {
  // A client-side visit to the home page never hydrates, so starting "gone" there can't mismatch the server.
  const [state, setState] = useState<"in" | "out" | "gone">(() => (shown ? "gone" : "in"));

  useEffect(() => {
    if (shown) return undefined;
    // Marked shown only when the fade starts, so an effect that runs twice (dev Strict Mode) still fades.
    const finish = () => {
      shown = true;
      setState("out");
      window.setTimeout(() => setState("gone"), FADE_MS);
    };
    if (document.readyState === "complete") {
      const frame = window.requestAnimationFrame(finish);
      return () => window.cancelAnimationFrame(frame);
    }
    window.addEventListener("load", finish, { once: true });
    return () => window.removeEventListener("load", finish);
  }, []);

  if (state === "gone") return null;
  return (
    <div className="pt-splash" data-state={state} aria-hidden="true">
      <SpiralLoader size={72} />
    </div>
  );
}
