"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoLoader from "@/components/LogoLoader";
import Rail from "@/components/shell/Rail";
import TopBar, { type HeaderUser } from "@/components/shell/TopBar";

/** The app frame: rail, top bar, page, footer. The construction gate renders bare. */
export default function ShellFrame({
  user,
  footer,
  children,
}: {
  user: HeaderUser | null;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  // The tab just tapped. Until its page arrives, the rail shows it as current and the page area shows the
  // loader, so a tap always answers at once, even on a slow connection.
  const [pending, setPending] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setPending(null);
  }

  // If a navigation never lands (an error, a cancelled tap), don't leave the loader up.
  useEffect(() => {
    if (!pending) return undefined;
    const t = window.setTimeout(() => setPending(null), 12000);
    return () => window.clearTimeout(t);
  }, [pending]);

  const go = (href: string) => {
    const path = href.split(/[?#]/)[0] || "/";
    setPending(path === pathname ? null : path);
  };

  if (pathname === "/construction") return <>{children}</>;

  return (
    <div className="pt-shell">
      <Rail pendingPath={pending} onGo={go} />
      <div className="pt-main min-w-0">
        <TopBar user={user} />
        {pending ? (
          <main className="pt-page-pad">
            <div className="pt-section-loading min-h-[60vh]">
              <LogoLoader size={52} />
            </div>
          </main>
        ) : (
          children
        )}
        {footer}
      </div>
    </div>
  );
}
