"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";
import Logo from "@/components/shell/Logo";

export type HeaderUser = {
  name: string;
  email: string;
  pictureUrl: string | null;
};

export default function TopBar({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname() || "/";
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(pathname)}`;

  return (
    <header className="pt-page-pad relative z-20">
      <div className="pt-container-wide pt-topbar">
        <Logo className="min-[820px]:hidden" />
        {user ? (
          <Link href="/dashboard" className="pt-search">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="11" cy="11" r="6" />
              <path d="m20 20-4.5-4.5" />
            </svg>
            <span className="truncate">Search your documents</span>
          </Link>
        ) : null}
        <span className="flex-1" />
        {user ? (
          <>
            <Link href="/dashboard/billing" className="pt-pro-chip hidden sm:inline-flex">
              Plans
            </Link>
            <AccountMenu name={user.name} email={user.email} pictureUrl={user.pictureUrl} />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <a href={signInHref} className="pt-btn pt-btn-ghost px-3.5 py-2 text-sm">
              Sign in
            </a>
            <a href={`/sign-in?mode=sign-up&returnTo=${encodeURIComponent(pathname)}`} className="pt-btn pt-btn-solid hidden px-4 py-2 text-sm sm:inline-flex">
              Create free account
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
