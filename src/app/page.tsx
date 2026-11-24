import type { Metadata } from "next";
import Link from "next/link";
import Workspace from "@/components/home/Workspace";
import ExamplePreview from "@/components/home/ExamplePreview";
import DocumentRow from "@/components/DocumentRow";
import { getSession } from "@/lib/auth";
import { getDocuments } from "@/lib/serverApi";

export const metadata: Metadata = {
  title: "PlainTerms - Understand Your Contract Before You Sign",
  description:
    "Drop in a renovation or contractor agreement and get a plain-English verdict, the risky clauses, and exactly what to ask for. Free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PlainTerms - Know What You're Signing",
    description:
      "Drop in a renovation or contractor agreement and get a plain-English verdict, the risky clauses, and exactly what to ask for. Free.",
    url: "/",
    type: "website",
  },
};

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

const CHECKS = [
  { label: "Deposits & payment schedule", icon: <svg {...ICON}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></svg> },
  { label: "Change orders & overruns", icon: <svg {...ICON}><path d="M4 7h16M4 12h16M4 17h10" /><path d="M17 15l2 2-2 2" /></svg> },
  { label: "Timelines & delays", icon: <svg {...ICON}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg> },
  { label: "Liens & warranties", icon: <svg {...ICON}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg> },
  { label: "Liability & disputes", icon: <svg {...ICON}><path d="M12 4v16M6 8h12M4 14l2-6 2 6a2 2 0 0 1-4 0zM16 14l2-6 2 6a2 2 0 0 1-4 0z" /></svg> },
  { label: "Missing protections", icon: <svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg> },
];

export default async function HomePage() {
  const session = await getSession();
  const recent = session ? await getDocuments(session, { limit: 4 }) : null;
  const recentDocs = recent?.documents ?? [];
  const firstName = session?.user.firstName?.trim();

  return (
    <main className="pt-page-pad pb-16 pt-6 sm:pt-10">
      <div className="pt-container-wide">
        <h1 className="max-w-4xl text-balance text-[2rem] leading-[1.1] text-(--pt-ink) sm:text-5xl">
          {firstName ? `Welcome back, ${firstName}.` : "Understand your contract before you sign."}
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-(--pt-ink-soft)">
          Add a renovation or contractor agreement. In seconds you&apos;ll get a verdict, the risky clauses, and exactly
          what to ask for, in plain English.
        </p>

        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-8 xl:gap-10">
          <div className="min-w-0">
            <Workspace signedIn={Boolean(session)} />

            {session ? (
              <section aria-labelledby="recent-heading" className="pt-panel mt-6 p-2 sm:p-3">
                <div className="flex items-center justify-between px-3 pb-1 pt-2">
                  <h2 id="recent-heading" className="text-lg text-(--pt-ink)">
                    Recent documents
                  </h2>
                  <Link href="/dashboard" className="text-sm font-semibold text-(--pt-action) underline-offset-4 hover:underline">
                    View all
                  </Link>
                </div>
                {recentDocs.length ? (
                  <ul>
                    {recentDocs.map((doc) => (
                      <li key={doc.id}>
                        <DocumentRow doc={doc} compact />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 pb-3 pt-1 text-sm text-(--pt-muted)">
                    Documents you analyze will appear here.
                  </p>
                )}
              </section>
            ) : null}
          </div>

          <div className="min-w-0">
            <ExamplePreview />
          </div>
        </div>

        <section aria-labelledby="checks-heading" className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="checks-heading" className="text-2xl text-(--pt-ink) sm:text-3xl">
              What we check
            </h2>
            <Link href="/how-it-works" className="text-sm font-semibold text-(--pt-ink-soft) underline underline-offset-4">
              How it works
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CHECKS.map((check) => (
              <li key={check.label} className="pt-subtle-panel flex flex-col gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-(--pt-action) ring-1 ring-(--pt-line)">
                  {check.icon}
                </span>
                <span className="text-sm font-semibold leading-5 text-(--pt-ink)">{check.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-(--pt-line) pt-6 text-sm text-(--pt-muted)">
          <p>PlainTerms gives information to help you understand a contract. It isn&apos;t legal advice.</p>
          <nav aria-label="Legal" className="flex gap-4 font-semibold">
            <Link href="/privacy" className="hover:text-(--pt-ink)">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-(--pt-ink)">
              Terms
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
