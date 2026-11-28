import type { TemplateInfo } from "@/lib/templates";

export type Category = TemplateInfo["group"] | "All";

// Two-tone icons: an ink outline over a soft palette fill, drawn on a 32px grid.
const LINE = {
  fill: "none",
  stroke: "var(--pt-ink)",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function All() {
  return (
    <>
      <rect x="5" y="5" width="9.5" height="9.5" rx="2.2" fill="var(--pt-peach)" />
      <rect x="17.5" y="5" width="9.5" height="9.5" rx="2.2" fill="var(--pt-sky)" />
      <rect x="5" y="17.5" width="9.5" height="9.5" rx="2.2" fill="var(--pt-leaf)" />
      <rect x="17.5" y="17.5" width="9.5" height="9.5" rx="2.2" fill="var(--pt-butter)" />
      <g {...LINE}>
        <rect x="5" y="5" width="9.5" height="9.5" rx="2.2" />
        <rect x="17.5" y="5" width="9.5" height="9.5" rx="2.2" />
        <rect x="5" y="17.5" width="9.5" height="9.5" rx="2.2" />
        <rect x="17.5" y="17.5" width="9.5" height="9.5" rx="2.2" />
      </g>
    </>
  );
}

function Home() {
  return (
    <>
      <path d="M4.5 15 16 5.5 27.5 15" fill="var(--pt-peach)" />
      <path d="M8 13.2V26.5h16V13.2" fill="var(--pt-surface)" />
      <rect x="13.5" y="19" width="5" height="7.5" fill="var(--pt-butter)" />
      <g {...LINE}>
        <path d="M4.5 15 16 5.5 27.5 15" />
        <path d="M8 13.2V26.5h16V13.2" />
        <path d="M13.5 26.5V19h5v7.5" />
        <path d="M21.5 7.5v3.6" />
      </g>
    </>
  );
}

function Key() {
  return (
    <>
      <circle cx="11" cy="16" r="6" fill="var(--pt-butter)" />
      <g {...LINE}>
        <circle cx="11" cy="16" r="6" />
        <circle cx="11" cy="16" r="2" />
        <path d="M17 16h10.5M24 16v4M20.5 16v3" />
      </g>
    </>
  );
}

function Briefcase() {
  return (
    <>
      <rect x="4.5" y="10" width="23" height="16" rx="2.5" fill="var(--pt-sky)" />
      <g {...LINE}>
        <rect x="4.5" y="10" width="23" height="16" rx="2.5" />
        <path d="M12 10V7.5A1.5 1.5 0 0 1 13.5 6h5A1.5 1.5 0 0 1 20 7.5V10" />
        <path d="M4.5 16.5h23" />
        <path d="M14 16.5v2.5h4v-2.5" />
      </g>
    </>
  );
}

function Creator() {
  return (
    <>
      <rect x="9" y="3.5" width="14" height="25" rx="3" fill="var(--pt-leaf)" />
      <path d="M14 12.5v7l6-3.5z" fill="var(--pt-accent)" />
      <g {...LINE}>
        <rect x="9" y="3.5" width="14" height="25" rx="3" />
        <path d="M14 7h4" />
        <path d="M14 12.5v7l6-3.5z" />
        <path d="M14 24.5h4" />
      </g>
    </>
  );
}

function Building() {
  return (
    <>
      <rect x="7" y="4.5" width="13" height="22" rx="1.5" fill="var(--pt-sky)" />
      <rect x="20" y="12" width="6.5" height="14.5" fill="var(--pt-leaf)" />
      <g {...LINE}>
        <path d="M7 26.5V6a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 20 6v20.5" />
        <path d="M20 12h5a1.5 1.5 0 0 1 1.5 1.5v13" />
        <path d="M4.5 26.5h23" />
        <path d="M11 9.5h1.5M14.5 9.5H16M11 14h1.5M14.5 14H16M11 18.5h1.5M14.5 18.5H16" />
        <path d="M12 26.5v-3.5h3v3.5" />
      </g>
    </>
  );
}

function Tag() {
  return (
    <>
      <path d="M5 6.5V14l12.5 12.5a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L14 5H6.5A1.5 1.5 0 0 0 5 6.5Z" fill="var(--pt-butter)" />
      <g {...LINE}>
        <path d="M5 6.5V14l12.5 12.5a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L14 5H6.5A1.5 1.5 0 0 0 5 6.5Z" />
        <circle cx="10.5" cy="10.5" r="1.8" />
      </g>
    </>
  );
}

function Money() {
  return (
    <>
      <rect x="3.5" y="8.5" width="25" height="15" rx="2.5" fill="var(--pt-leaf)" />
      <circle cx="16" cy="16" r="3.8" fill="var(--pt-surface)" />
      <g {...LINE}>
        <rect x="3.5" y="8.5" width="25" height="15" rx="2.5" />
        <circle cx="16" cy="16" r="3.8" />
        <path d="M7.5 12.5v0M24.5 19.5v0" strokeWidth="2.4" />
      </g>
    </>
  );
}

function Family() {
  return (
    <>
      <path d="M4.5 27v-4.5a6.5 6.5 0 0 1 13 0V27Z" fill="var(--pt-peach)" />
      <circle cx="11" cy="9.5" r="4" fill="var(--pt-peach)" />
      <path d="M17.5 27v-2.8a4.5 4.5 0 0 1 9 0V27Z" fill="var(--pt-butter)" />
      <circle cx="22" cy="14.5" r="3" fill="var(--pt-butter)" />
      <g {...LINE}>
        <path d="M4.5 27v-4.5a6.5 6.5 0 0 1 13 0V27" />
        <circle cx="11" cy="9.5" r="4" />
        <path d="M17.5 27v-2.8a4.5 4.5 0 0 1 9 0V27" />
        <circle cx="22" cy="14.5" r="3" />
        <path d="M3 27h26" />
      </g>
    </>
  );
}

const ICONS: Record<Category, () => React.ReactElement> = {
  All,
  "Home and renovation": Home,
  Renting: Key,
  "Work and freelancing": Briefcase,
  "Creators and social media": Creator,
  Business: Building,
  "Buying and selling": Tag,
  "Money and disputes": Money,
  "Personal and family": Family,
};

export default function CategoryIcon({ category, className = "h-8 w-8" }: { category: Category; className?: string }) {
  const Draw = ICONS[category];
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <Draw />
    </svg>
  );
}
