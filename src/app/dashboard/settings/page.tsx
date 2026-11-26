import { redirect } from "next/navigation";
import DeleteAccount from "@/components/dashboard/DeleteAccount";
import { Suspense } from "react";
import { AccountPanelsSkeleton } from "@/components/Skeletons";
import { displayName, getSession, type Session } from "@/lib/auth";
import { getAccount } from "@/lib/serverApi";

function formatJoined(iso: string | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

async function SettingsBody({ session }: { session: Session }) {
  const account = await getAccount(session);
  const joined = formatJoined(account?.createdAt);

  return (
    <>

      <section aria-labelledby="profile-heading" className="pt-panel mt-5 p-5 sm:p-6">
        <h2 id="profile-heading" className="text-xl text-(--pt-ink)">Profile</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-(--pt-muted)">Name</dt>
            <dd className="mt-1 text-(--pt-ink)">{displayName(session.user)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-(--pt-muted)">Email</dt>
            <dd className="mt-1 break-all text-(--pt-ink)">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-(--pt-muted)">Plan</dt>
            <dd className="mt-1 text-(--pt-ink)">{account?.plan === "pro" ? "Pro" : "Free"}</dd>
          </div>
          {joined ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-(--pt-muted)">Member since</dt>
              <dd className="mt-1 text-(--pt-ink)">{joined}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-sm text-(--pt-muted)">
          Your name and email come from the account you signed in with.
        </p>
      </section>

      <section aria-labelledby="session-heading" className="pt-panel mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 id="session-heading" className="text-xl text-(--pt-ink)">Sign out</h2>
          <p className="mt-1 text-sm text-(--pt-muted)">Sign out of PlainTerms on this device.</p>
        </div>
        <form action="/sign-out" method="post">
          <button type="submit" className="pt-btn pt-btn-outline px-5 py-2.5">
            Sign out
          </button>
        </form>
      </section>

      <section aria-labelledby="danger-heading" className="mt-4 rounded-(--pt-radius) border border-[#efc1b0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="danger-heading" className="text-xl text-(--pt-ink)">Delete account</h2>
            <p className="mt-1 max-w-lg text-sm text-(--pt-muted)">
              Permanently delete your account, every document and every analysis.
            </p>
          </div>
          <DeleteAccount isPro={account?.plan === "pro"} />
        </div>
      </section>
    </>
  );
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?returnTo=/dashboard/settings");

  return (
    <div>
      <h1 className="text-3xl text-(--pt-ink)">Account settings</h1>
      <p className="mt-1 text-(--pt-muted)">Your profile and account controls.</p>
      <Suspense
        fallback={<AccountPanelsSkeleton rows={4} />}
      >
        <SettingsBody session={session} />
      </Suspense>
    </div>
  );
}
