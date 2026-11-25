import Link from "next/link";
import { redirect } from "next/navigation";
import DocumentsList from "@/components/dashboard/DocumentsList";
import { getSession } from "@/lib/auth";
import { getAccount, getDocuments } from "@/lib/serverApi";

export default async function DashboardDocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?returnTo=/dashboard");

  const [account, documents] = await Promise.all([getAccount(session), getDocuments(session, { limit: 20 })]);
  const isPro = account?.plan === "pro";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-(--pt-ink)">Documents</h1>
          <p className="mt-1 text-(--pt-muted)">
            {account ? `${account.usage.documentsThisMonth} analyzed this month` : "Everything you've analyzed."}
          </p>
        </div>
        <Link href="/" className="pt-btn pt-btn-solid px-5 py-2.5 text-sm lg:hidden">
          New analysis
        </Link>
      </div>

      {!isPro && account ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-(--pt-radius) border border-(--pt-line) bg-[linear-gradient(110deg,#fff3ee,#fffaf2)] px-4 py-3">
          <p className="text-sm text-(--pt-ink-soft)">
            <span className="font-semibold text-(--pt-ink)">Keep every document with Pro,</span> plus revised drafts and our
            most capable AI.
          </p>
          <Link href="/dashboard/billing" className="pt-btn pt-btn-outline px-4 py-1.5 text-sm">
            See Pro
          </Link>
        </div>
      ) : null}

      <div className="mt-5">
        <DocumentsList initial={documents} isPro={isPro} />
      </div>
    </div>
  );
}
