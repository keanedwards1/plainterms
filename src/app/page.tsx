import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import LogoLoader from "@/components/LogoLoader";
import HeroClouds from "@/components/art/HeroClouds";
import HeroWidgets from "@/components/art/HeroWidgets";
import Stipple from "@/components/art/Stipple";
import { DATE_SHORT, DocThumb, VerdictBadge } from "@/components/DocumentRow";
import LocalDate from "@/components/LocalDate";
import Demos from "@/components/home/Demos";
import Showcase from "@/components/home/Showcase";
import ToolRow from "@/components/home/ToolRow";
import Workspace from "@/components/home/Workspace";
import { getSession, type Session } from "@/lib/auth";
import { getDocuments, type DocumentSummary } from "@/lib/serverApi";
import { HOME_TEMPLATES } from "@/lib/templates";
import "@/components/home/home.css";

export const metadata: Metadata = {
  title: "PlainTerms: know what you're signing",
  description:
    "Drop in a contract, lease or contractor bid and get a plain-English verdict, the risky clauses and what to ask for. Free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PlainTerms: know what you're signing",
    description:
      "Drop in a contract, lease or contractor bid and get a plain-English verdict, the risky clauses and what to ask for. Free.",
    url: "/",
    type: "website",
  },
};

const STIPPLE_FADE = "linear-gradient(180deg,transparent 0,#000 22%)";
const STIPPLE_FADE_BOTH = "linear-gradient(180deg,transparent 0,#000 22%,#000 78%,transparent 100%)";

function SectionHead({ id, title, link }: { id: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="text-[clamp(2.25rem,4vw,3.75rem)] leading-none tracking-[-0.05em]">
        {title}
      </h2>
      {link ? (
        <Link href={link.href} className="pt-btn pt-btn-outline h-9 px-3.5 text-sm">
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}

function RecentDocuments({ docs }: { docs: DocumentSummary[] }) {
  return (
    <section aria-labelledby="recent-heading" className="pt-legal-pad mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="recent-heading" className="text-[1.75rem] tracking-[-0.045em]">
          Pick up where you left off
        </h2>
        <Link href="/documents" className="text-sm text-(--pt-muted) hover:text-(--pt-ink)">
          All documents
        </Link>
      </div>
      {docs.length ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link href={`/result/${encodeURIComponent(doc.id)}`} className="pt-doc">
                <DocThumb doc={doc} />
                <span className="truncate font-medium">{doc.fileName}</span>
                <span className="text-sm text-(--pt-muted)"><LocalDate iso={doc.createdAt} options={DATE_SHORT} /></span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <VerdictBadge action={doc.recommendationAction} refining={doc.status === "refining"} />
                  {doc.status === "refining" ? null : (
                    <span className="text-sm text-(--pt-muted)">
                      {doc.flagCount} red flag{doc.flagCount === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-(--pt-muted)">Documents you read will show up here.</p>
      )}
    </section>
  );
}

/** Fetches the recent documents on its own, so the rest of the page doesn't wait for it. */
async function RecentDocumentsSection({ session }: { session: Session }) {
  const recent = await getDocuments(session, { limit: 4 });
  return <RecentDocuments docs={recent?.documents ?? []} />;
}

function RecentDocumentsLoading() {
  return (
    <section aria-label="Loading your recent documents" className="pt-legal-pad mt-16">
      <h2 className="text-[1.75rem] tracking-[-0.045em]">Pick up where you left off</h2>
      <div className="pt-section-loading">
        <LogoLoader label="Loading your recent documents" />
      </div>
    </section>
  );
}

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <section aria-labelledby="hero-heading" className="relative isolate pb-14 pt-12 text-center sm:pt-20">
          <div className="absolute inset-x-[-2.5rem] -top-24 -z-10">
            <HeroClouds />
          </div>
          <HeroWidgets />
          <div className="relative flex flex-col items-center">
            <h1 id="hero-heading" className="text-balance text-[clamp(3.25rem,7.4vw,7rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
              What are you
              <br />
              about to sign?
            </h1>
            <p className="mx-auto mb-8 mt-6 max-w-[52ch] text-lg text-(--pt-muted)">
              Leases, contractor bids, freelance contracts and the letters that come after them. Drop one in and get it back
              in plain English.
            </p>
            <Workspace signedIn={Boolean(session)} />
          </div>
        </section>

        <ToolRow />

        {session ? (
          <Suspense fallback={<RecentDocumentsLoading />}>
            <RecentDocumentsSection session={session} />
          </Suspense>
        ) : null}

        <section aria-labelledby="get-heading" className="relative isolate mt-10 pb-16">
          <div
            className="absolute -inset-x-10 -top-10 -z-10 h-[32.5rem] max-sm:h-[21rem] max-sm:opacity-35"
            style={{ maskImage: STIPPLE_FADE, WebkitMaskImage: STIPPLE_FADE }}
          >
            <Stipple kind="ribbon" className="h-full w-full [image-rendering:pixelated]" />
          </div>
          <div className="flex min-h-[16.25rem] items-end pb-7 max-sm:min-h-[9rem]">
            <SectionHead id="get-heading" title="What you get back" />
          </div>
          <Demos />
        </section>

        <section aria-labelledby="templates-heading" className="relative isolate pb-[25rem] pt-14 max-sm:pb-64">
          <div
            className="absolute inset-x-[-2.5rem] bottom-0 -z-10 h-[26rem] max-sm:h-72"
            style={{ maskImage: STIPPLE_FADE_BOTH, WebkitMaskImage: STIPPLE_FADE_BOTH }}
          >
            <Stipple kind="domes" className="h-full w-full [image-rendering:pixelated]" />
          </div>
          <SectionHead id="templates-heading" title="Start from a template" link={{ href: "/templates", label: "See all templates" }} />
          <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {HOME_TEMPLATES.map((tpl) => (
              <li key={tpl.slug}>
                <Link href={`/templates#${tpl.slug}`} className="pt-tpl grid gap-1.5">
                  <span className="pt-tpl-paper" aria-hidden="true">
                    <b className="font-heading text-[0.8125rem] font-semibold">{tpl.name}</b>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="mt-2 font-medium">{tpl.name}</span>
                  <span className="text-sm leading-snug text-(--pt-muted)">{tpl.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Showcase />
      </div>
    </main>
  );
}
