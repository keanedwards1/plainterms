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

const ITEMS = [
  { href: "/", label: "Home", match: (p: string) => p === "/", icon: <svg {...ICON}><path d="M4 11 12 4l8 7v9H4z" /><path d="M10 20v-5h4v5" /></svg> },
  { href: "/documents", label: "Documents", match: (p: string) => p.startsWith("/documents") || p.startsWith("/result"), icon: <svg {...ICON}><path d="M5 4h9l5 5v11H5z" /><path d="M14 4v5h5" /></svg> },
  { href: "/tools", label: "Tools", match: (p: string) => p.startsWith("/tools"), icon: <svg {...ICON}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg> },
  { href: "/templates", label: "Templates", match: (p: string) => p.startsWith("/templates"), icon: <svg {...ICON}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg> },
  { href: "/deadlines", label: "Dates", match: (p: string) => p.startsWith("/deadlines"), icon: <svg {...ICON}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.6" /></svg> },
];

const SETTINGS = {
  href: "/dashboard/settings",
  label: "Settings",
  match: (p: string) => p.startsWith("/dashboard"),
  icon: (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
};

export default function Rail() {
  const pathname = usePathname() || "/";
  return (
    <aside className="pt-rail" aria-label="Main">
      <Link href="/" aria-label="PlainTerms home" className="pt-rail-logo text-(--pt-accent)">
        <LogoMark className="h-9 w-9" />
      </Link>
      <nav className="pt-rail-nav" aria-label="Main">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="pt-rail-link" aria-current={item.match(pathname) ? "page" : undefined}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="pt-rail-foot">
        <Link href="/#start" className="pt-rail-new" aria-label="Start a new document">
          <svg {...ICON} className="h-5 w-5"><path d="M12 5v14M5 12h14" /></svg>
        </Link>
        <Link href={SETTINGS.href} className="pt-rail-link" aria-current={SETTINGS.match(pathname) ? "page" : undefined}>
          {SETTINGS.icon}
          {SETTINGS.label}
        </Link>
      </div>
    </aside>
  );
}
