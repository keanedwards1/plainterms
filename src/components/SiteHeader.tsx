"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";

export type HeaderUser = {
  name: string;
  email: string;
  pictureUrl: string | null;
};

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/sample-report", label: "Example report" },
] as const;

export default function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  if (pathname === "/construction") return null;

  const signInHref = `/sign-in?returnTo=${encodeURIComponent(pathname || "/")}`;

  return (
    <header className="pt-nav sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--pt-surface)_82%,transparent)]">
      <div className="pt-page-pad pt-container-wide flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--pt-action)] text-sm font-bold text-white">
              P
            </span>
            <span className="text-xl font-semibold tracking-tight text-[var(--pt-ink)]">PlainTerms</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--pt-ink-soft)] transition-colors hover:bg-[color-mix(in_oklab,var(--pt-ink)_6%,transparent)] aria-[current=page]:text-[var(--pt-ink)] aria-[current=page]:underline aria-[current=page]:underline-offset-8"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <Link
                href="/dashboard"
                aria-current={pathname?.startsWith("/dashboard") ? "page" : undefined}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--pt-ink-soft)] transition-colors hover:bg-[color-mix(in_oklab,var(--pt-ink)_6%,transparent)] aria-[current=page]:text-[var(--pt-ink)] aria-[current=page]:underline aria-[current=page]:underline-offset-8"
              >
                Documents
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {pathname !== "/" ? (
            <Link href="/" className="pt-btn pt-btn-outline hidden px-4 py-2 text-sm sm:inline-flex">
              New analysis
            </Link>
          ) : null}
          {user ? (
            <AccountMenu name={user.name} email={user.email} pictureUrl={user.pictureUrl} />
          ) : (
            <a href={signInHref} className="pt-btn pt-btn-solid px-4 py-2 text-sm">
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
