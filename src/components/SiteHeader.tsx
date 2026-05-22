"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  const isResultPage = pathname.startsWith("/result/");

  if (isResultPage) return null;

  return (
    <header className="pt-nav">
      <div className="pt-page-pad pt-container-wide flex w-full items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--pt-accent)] text-xs font-bold text-[var(--pt-accent-ink)]">
            P
          </span>
          <span className="text-2xl font-semibold tracking-tight text-[var(--pt-ink)]">
            PlainTerms
          </span>
        </Link>

        <Link
          href="/analyze"
          className="pt-btn-primary inline-flex items-center px-5 py-2 text-sm font-semibold"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
