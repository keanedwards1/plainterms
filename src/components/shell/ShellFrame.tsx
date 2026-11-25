"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  if (pathname === "/construction") return <>{children}</>;

  return (
    <div className="pt-shell">
      <Rail />
      <div className="pt-main min-w-0">
        <TopBar user={user} />
        {children}
        {footer}
      </div>
    </div>
  );
}
