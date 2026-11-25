"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/shell/Logo";

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const FILL = { viewBox: "0 0 24 24", "aria-hidden": true };
// Cut-outs in filled icons use the active highlight color so they read as holes.
const CUT = "var(--pt-rail-active)";

type Item = { href: string; label: string; match: (p: string) => boolean; icon: React.ReactNode; active: React.ReactNode };

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Home",
    match: (p) => p === "/",
    icon: <svg {...ICON}><path d="M4 11 12 4l8 7v9H4z" /><path d="M10 20v-5h4v5" /></svg>,
    active: <svg {...FILL}><path fill="currentColor" d="M3.4 10.7 12 3.3l8.6 7.4V20a1 1 0 0 1-1 1H14.6v-5.6H9.4V21H4.4a1 1 0 0 1-1-1z" /></svg>,
  },
  {
    href: "/documents",
    label: "Documents",
    match: (p) => p.startsWith("/documents") || p.startsWith("/result"),
    icon: <svg {...ICON}><path d="M5 4h9l5 5v11H5z" /><path d="M14 4v5h5" /></svg>,
    active: <svg {...FILL}><path fill="currentColor" d="M5 3.2h9.4l5.4 5.4V21H5z" /><path d="M14 3.6v5.2h5.2" fill="none" stroke={CUT} strokeWidth="1.6" /></svg>,
  },
  {
    href: "/tools",
    label: "Tools",
    match: (p) => p.startsWith("/tools"),
    icon: <svg {...ICON}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>,
    active: <svg {...FILL}><g fill="currentColor"><rect x="3.4" y="3.4" width="7.8" height="7.8" rx="1.8" /><rect x="12.8" y="3.4" width="7.8" height="7.8" rx="1.8" /><rect x="3.4" y="12.8" width="7.8" height="7.8" rx="1.8" /><rect x="12.8" y="12.8" width="7.8" height="7.8" rx="1.8" /></g></svg>,
  },
  {
    href: "/templates",
    label: "Templates",
    match: (p) => p.startsWith("/templates"),
    icon: <svg {...ICON}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
    active: <svg {...FILL}><rect x="3.3" y="2.3" width="17.4" height="19.4" rx="2.6" fill="currentColor" /><path d="M8 8h8M8 12h8M8 16h5" stroke={CUT} strokeWidth="1.7" strokeLinecap="round" /></svg>,
  },
  {
    href: "/emails",
    label: "Emails",
    match: (p) => p.startsWith("/emails"),
    icon: <svg {...ICON}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>,
    active: <svg {...FILL}><rect x="2.4" y="4.4" width="19.2" height="15.2" rx="2.6" fill="currentColor" /><path d="m3.6 6.6 8.4 6.4 8.4-6.4" fill="none" stroke={CUT} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  {
    href: "/deadlines",
    label: "Dates",
    match: (p) => p.startsWith("/deadlines"),
    icon: <svg {...ICON}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.6" /></svg>,
    active: <svg {...FILL}><rect x="2.4" y="4.4" width="19.2" height="17.2" rx="2.6" fill="currentColor" /><path d="M2.6 10h18.8" stroke={CUT} strokeWidth="1.6" /><path d="M8 2.6v4M16 2.6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="15.4" r="2" fill={CUT} /></svg>,
  },
];

const GEAR =
  "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z";

const SETTINGS: Item = {
  href: "/dashboard/settings",
  label: "Settings",
  match: (p) => p.startsWith("/dashboard"),
  icon: <svg {...ICON}><circle cx="12" cy="12" r="3" /><path d={GEAR} /></svg>,
  active: <svg {...FILL}><path d={GEAR} fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill={CUT} /></svg>,
};

function RailLink({ item, pathname }: { item: Item; pathname: string }) {
  const on = item.match(pathname);
  return (
    <Link href={item.href} className="pt-rail-link" aria-current={on ? "page" : undefined}>
      {on ? item.active : item.icon}
      {item.label}
    </Link>
  );
}

export default function Rail() {
  const pathname = usePathname() || "/";
  return (
    <aside className="pt-rail" aria-label="Main">
      <Link href="/" aria-label="PlainTerms home" className="pt-rail-logo text-(--pt-accent)">
        <LogoMark className="h-9 w-9" />
      </Link>
      <nav className="pt-rail-nav" aria-label="Main">
        {ITEMS.map((item) => (
          <RailLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="pt-rail-foot">
        <Link href="/#start" className="pt-rail-new" aria-label="Start a new document">
          <svg {...ICON} className="h-5 w-5"><path d="M12 5v14M5 12h14" /></svg>
        </Link>
        <RailLink item={SETTINGS} pathname={pathname} />
      </div>
    </aside>
  );
}
