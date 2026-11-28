"use client";

import Mark from "./Mark";

/**
 * The PlainTerms mark, assembling: the two squares orbit the centre, spiralling inward while staying upright, and
 * settle into the logo. Then they spin back out and do it again.
 */
export default function SpiralLoader(props: { size?: number; label?: string }) {
  return <Mark p="ld-sp" {...props} />;
}
