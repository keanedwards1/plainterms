import type { Metadata } from "next";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { PtResult } from "@/lib/plainterms-schema";
import TrackResultViewed from "@/components/TrackResultViewed";
import LiveResult from "@/components/result/LiveResult";
import { authHeaders, getSession } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string; key?: string }>;
};

function getRetentionDays() {
  const raw = Number(
    process.env.NEXT_PUBLIC_RESULT_RETENTION_DAYS ?? process.env.RESULT_TTL_DAYS ?? "30"
  );
  if (!Number.isFinite(raw) || raw <= 0) return 30;
  return Math.floor(raw);
}

function formatResultDate(raw: string) {
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(asDate);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Contract Result",
    description:
      "Plain-English contract summary result for a home renovation, remodeling, or construction agreement.",
    alternates: {
      canonical: `/result/${id}`,
    },
    openGraph: {
      title: "Contract Result | PlainTerms",
      description:
        "Structured plain-English agreement summary with section-by-section explanations.",
      url: `/result/${id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: "Contract Result | PlainTerms",
      description:
        "Read a structured, plain-English contract explanation focused on calm clarity.",
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

function Notice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <main className="pt-page-pad min-h-[60vh] py-16">
      <div className="pt-panel mx-auto max-w-xl p-8 text-center">
        <h1 className="text-3xl text-(--pt-ink)">{title}</h1>
        <div className="mt-3 text-[15px] leading-6 text-(--pt-muted)">{children}</div>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </div>
    </main>
  );
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const accessKey = (query.k ?? query.key ?? "").trim();
  const baseUrl = getApiBaseUrl();
  const retentionDays = getRetentionDays();
  const session = await getSession();
  const here = `/result/${encodeURIComponent(id)}`;

  if (!accessKey && !session) {
    return (
      <Notice
        title="Sign in to open this document"
        action={
          <a href={`/sign-in?returnTo=${encodeURIComponent(here)}`} className="pt-btn pt-btn-solid px-6 py-3">
            Sign in
          </a>
        }
      >
        Your documents are saved to your account.
      </Notice>
    );
  }

  const upstreamUrl = new URL(`${baseUrl}/result/${encodeURIComponent(id)}`);
  if (accessKey) upstreamUrl.searchParams.set("k", accessKey);
  let res: Response;
  try {
    res = await fetch(upstreamUrl.toString(), { cache: "no-store", headers: authHeaders(session) });
  } catch {
    return (
      <Notice title="We couldn't load this document" action={<Link href={here} className="pt-btn pt-btn-solid px-6 py-3">Try again</Link>}>
        Please check your connection and try again.
      </Notice>
    );
  }

  if (res.status === 202) {
    return (
      <Notice title="Still analyzing" action={<Link href={here} className="pt-btn pt-btn-solid px-6 py-3">Refresh</Link>}>
        Your document is still being processed. This usually takes under a minute.
      </Notice>
    );
  }

  if (res.status === 410) {
    return (
      <Notice
        title="This document has expired"
        action={
          <>
            <Link href="/" className="pt-btn pt-btn-solid px-6 py-3">Analyze it again</Link>
            <Link href="/dashboard/billing" className="pt-btn pt-btn-outline px-6 py-3">Keep documents with Pro</Link>
          </>
        }
      >
        Free documents are kept for {retentionDays} days. Add the contract again to get a fresh analysis.
      </Notice>
    );
  }

  if (res.status === 404 || res.status === 403 || res.status === 401) {
    return (
      <Notice
        title="We couldn't find this document"
        action={
          session ? (
            <Link href="/documents" className="pt-btn pt-btn-solid px-6 py-3">Go to your documents</Link>
          ) : (
            <a href={`/sign-in?returnTo=${encodeURIComponent(here)}`} className="pt-btn pt-btn-solid px-6 py-3">Sign in</a>
          )
        }
      >
        It may have been deleted, or it belongs to a different account.
      </Notice>
    );
  }

  if (!res.ok) {
    return (
      <Notice title="We couldn't load this document" action={<Link href={here} className="pt-btn pt-btn-solid px-6 py-3">Try again</Link>}>
        Something went wrong on our side. Please try again in a moment.
      </Notice>
    );
  }

  const json = await res.json();
  const abVariant = typeof json._ab_variant === "string" ? json._ab_variant : undefined;
  const parsed = PtResult.safeParse(json);

  if (!parsed.success) {
    return (
      <Notice title="We couldn't display this document" action={<Link href="/" className="pt-btn pt-btn-solid px-6 py-3">Start a new analysis</Link>}>
        The result came back in a format we didn&apos;t expect.
      </Notice>
    );
  }

  const data = parsed.data;
  const createdAtLabel = formatResultDate(data.created_at);
  const fileNameLabel = data.document?.file_name ?? "Contract document";

  return (
    <main className="pt-page-pad py-5 [--pt-muted:#6e6558]">
      <TrackResultViewed resultId={data.result_id} />

      <div className="pt-container-wide flex flex-col gap-4">
        <section className="pt-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {data.owned ? (
              <Link href="/documents" className="text-sm font-semibold text-(--pt-muted) hover:text-(--pt-ink)">
                ← All documents
              </Link>
            ) : (
              <Link href="/" className="text-sm font-semibold text-(--pt-muted) hover:text-(--pt-ink)">
                ← Analyze another contract
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-(--pt-muted)">
              <span className="max-w-[60vw] truncate">File: {fileNameLabel}</span>
              <span>Reviewed {createdAtLabel}</span>
            </div>
          </div>

          <div className="mt-3 max-w-4xl">
            <h1 className="text-2xl leading-tight text-(--pt-ink) sm:text-3xl">{data.headline}</h1>
            <p className="mt-2 text-[15px] leading-6 text-(--pt-muted) lg:max-w-3xl">{data.overview}</p>
          </div>
        </section>

        <LiveResult
          initial={data}
          retentionDays={retentionDays}
          accessKey={accessKey || undefined}
          abVariant={abVariant}
          signedIn={Boolean(session)}
        />
      </div>
    </main>
  );
}
