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
  { href: "/dashboard", label: "Documents", match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/result"), icon: <svg {...ICON}><path d="M5 4h9l5 5v11H5z" /><path d="M14 4v5h5" /></svg> },
  { href: "/tools", label: "Tools", match: (p: string) => p.startsWith("/tools"), icon: <svg {...ICON}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg> },
  { href: "/templates", label: "Templates", match: (p: string) => p.startsWith("/templates"), icon: <svg {...ICON}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg> },
  { href: "/deadlines", label: "Dates", match: (p: string) => p.startsWith("/deadlines"), icon: <svg {...ICON}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.6" /></svg> },
];

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
      <Link href="/#start" className="pt-rail-new" aria-label="Start a new document">
        <svg {...ICON} className="h-5 w-5"><path d="M12 5v14M5 12h14" /></svg>
      </Link>
    </aside>
  );
}
