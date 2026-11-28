import type { CSSProperties } from "react";
import "./loader.css";

/**
 * The PlainTerms mark, assembling: the two squares orbit the centre, spiralling inward while staying upright, and
 * settle into the logo, and the hole between them opens. Then they spin back out and do it again. Built from HTML
 * boxes so it animates off the main thread and stays smooth while the page loads; see loader.css. The hole is
 * paper-coloured, so it expects a paper background.
 */
export default function SpiralLoader({ size = 44, label = "Loading" }: { size?: number; label?: string }) {
  const style = { width: size, height: size, "--u": `${size / 307}px` } as CSSProperties;
  return (
    <span role="status" className="ld-spiral" style={style}>
      <span className="ld-sp-a" aria-hidden="true">
        <span className="ld-sp-a2">
          <span className="ld-sp-sq ld-sp-sq-a" />
        </span>
      </span>
      <span className="ld-sp-b" aria-hidden="true">
        <span className="ld-sp-b2">
          <span className="ld-sp-sq ld-sp-sq-b" />
        </span>
      </span>
      <span className="ld-sp-hole" aria-hidden="true" />
      <span className="ld-spiral-frame" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
