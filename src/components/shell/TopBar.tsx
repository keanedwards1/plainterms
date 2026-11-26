"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import Logo from "@/components/shell/Logo";
import SearchPanel from "@/components/search/SearchPanel";

export type HeaderUser = {
  name: string;
  email: string;
  pictureUrl: string | null;
};

export default function TopBar({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname() || "/";
  // Plans is only for people on the free plan. Ask once per page load; stay hidden until we know.
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  useEffect(() => {
    if (!user) return undefined;
    // A small request: let it finish and ignore the answer if the bar has gone (e.g. on the full-screen /new page).
    // Aborting it instead surfaces as a runtime error in development.
    let gone = false;
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((account: { plan?: string } | null) => {
        if (!gone) setPlan(account?.plan === "pro" ? "pro" : account?.plan === "free" ? "free" : null);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [user]);
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(pathname)}`;

  return (
    <header className="pt-page-pad relative z-20">
      <div className="pt-container-wide pt-topbar">
        <Logo className="min-[820px]:hidden" />
        {user ? (
          <SearchPanel />
        ) : null}
        <span className="flex-1" />
        {user ? (
          <>
            {plan === "free" ? (
              <Link href="/dashboard/billing" className="pt-pro-chip hidden sm:inline-flex">
                Plans
              </Link>
            ) : null}
            <AccountMenu name={user.name} email={user.email} pictureUrl={user.pictureUrl} plan={plan} />
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
