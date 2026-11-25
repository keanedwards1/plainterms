import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { displayName, getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?returnTo=/dashboard/settings");

  return (
    <main className="pt-page-pad pb-16 pt-6 sm:pt-8">
      <div className="pt-container-wide grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden px-3 pb-4 lg:block">
            <p className="truncate text-sm font-semibold text-(--pt-ink)">{displayName(session.user)}</p>
            <p className="truncate text-xs text-(--pt-muted)">{session.user.email}</p>
          </div>
          <DashboardNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
