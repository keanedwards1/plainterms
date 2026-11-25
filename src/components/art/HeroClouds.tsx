/** The grainy cloud wash behind the home hero: noise-bent ellipses in the Meadow colors, plus film grain. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .7 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const BLOBS: [number, number, number, number, string][] = [
  [160, 80, 260, 150, "#A9D8EE"],
  [470, 40, 240, 120, "#C6E8A8"],
  [760, 90, 260, 140, "#F8C2A0"],
  [1060, 60, 240, 150, "#A9D8EE"],
  [620, 190, 200, 70, "#F7E6A2"],
  [300, 210, 160, 60, "#F8C2A0"],
  [960, 230, 180, 60, "#C6E8A8"],
];

const FADE = "linear-gradient(180deg,#000 30%,transparent 92%)";

export default function HeroClouds() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] overflow-hidden">
      <svg viewBox="0 0 1200 520" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
        <defs>
          <filter id="pt-hero-clouds" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="5" seed="8" />
            <feDisplacementMap in="SourceGraphic" scale="230" />
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g filter="url(#pt-hero-clouds)">
          {BLOBS.map(([cx, cy, rx, ry, fill]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 opacity-[0.28] mix-blend-multiply" style={{ backgroundImage: GRAIN, maskImage: FADE, WebkitMaskImage: FADE }} />
    </div>
  );
}
