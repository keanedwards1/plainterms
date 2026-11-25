import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DocumentsBoard from "@/components/documents/DocumentsBoard";
import { getSession } from "@/lib/auth";
import { getAccount, getDocuments } from "@/lib/serverApi";
import "@/components/home/home.css";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?returnTo=/documents");

  const [account, documents] = await Promise.all([getAccount(session), getDocuments(session, { limit: 24 })]);
  const isPro = account?.plan === "pro";

  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide pb-10">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-8 pt-6 sm:pt-10">
          <div>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">Documents</h1>
            <p className="mt-3 text-lg text-(--pt-muted)">
              {account ? `${account.usage.documentsThisMonth} read this month · ` : ""}
              {isPro ? "Kept until you delete them" : "Free documents are kept for 30 days"}
            </p>
          </div>
          <Link href="/#start" className="pt-btn pt-btn-solid h-11 px-5">
            Review a document
          </Link>
        </header>

        {!isPro && account ? (
          <div className="pt-framed mb-8 flex flex-wrap items-center justify-between gap-3 bg-[#fffaf2] px-5 py-3.5">
            <p className="text-[0.9375rem]">
              <span className="font-semibold">Keep every document with Pro,</span> plus revised drafts and our most capable AI.
            </p>
            <Link href="/dashboard/billing" className="pt-btn pt-btn-outline h-9 px-4 text-sm">
              See Pro
            </Link>
          </div>
        ) : null}

        <DocumentsBoard initial={documents} isPro={isPro} />
      </div>
    </main>
  );
}
