import type { Metadata } from "next";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { PtResult } from "@/lib/plainterms-schema";
import TrackResultViewed from "@/components/TrackResultViewed";
import ResultWorkspace from "@/components/ResultWorkspace";

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

async function readFailureDetail(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
      return JSON.stringify(json).slice(0, 800);
    }

    const text = await res.text();
    if (text.trim()) return text.slice(0, 800);
  } catch {
    // Fall through to status text.
  }

  return res.statusText || "Unknown error";
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const accessKey = (query.k ?? query.key ?? "").trim();
  const baseUrl = getApiBaseUrl();
  const retentionDays = getRetentionDays();

  if (!accessKey) {
    return (
      <main className="pt-page-pad min-h-screen py-10">
        <div className="pt-container-reading">
          <h1 className="text-3xl text-[var(--pt-ink)]">Secure link required</h1>
          <p className="mt-3 text-[var(--pt-muted)]">
            This result requires a secure access link from checkout. Please return to upload and run
            verification again.
          </p>
        </div>
      </main>
    );
  }

  const res = await fetch(`${baseUrl}/result/${id}?k=${encodeURIComponent(accessKey)}`, {
    cache: "no-store",
  });

  if (res.status === 202) {
    const detail = await readFailureDetail(res);
    return (
      <main className="pt-page-pad min-h-screen py-10">
        <div className="pt-container-reading">
          <h1 className="text-3xl text-[var(--pt-ink)]">Analysis in progress</h1>
          <p className="mt-3 text-[var(--pt-muted)]">
            Your document is still being processed. This page should become available shortly.
          </p>
          <p className="mt-5 text-sm text-[var(--pt-muted)]">
            <strong>Result ID:</strong> {id}
          </p>
          <pre className="mt-3 overflow-auto rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-4 text-xs text-[var(--pt-ink)]">
            {detail}
          </pre>
        </div>
      </main>
    );
  }

  if (!res.ok) {
    const detail = await readFailureDetail(res);

    if (res.status === 410) {
      return (
        <main className="pt-page-pad min-h-screen py-10">
          <div className="pt-container-reading">
            <h1 className="text-3xl text-[var(--pt-ink)]">Result expired</h1>
            <p className="mt-3 text-[var(--pt-muted)]">
              This result is no longer available. Secure result links typically expire after about {retentionDays} days.
              Uploading the contract again will create a new result.
            </p>
            <p className="mt-5 text-sm text-[var(--pt-muted)]">
              <strong>Result ID:</strong> {id}
            </p>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-4 text-xs text-[var(--pt-ink)]">
              {detail}
            </pre>
          </div>
        </main>
      );
    }

    return (
      <main className="pt-page-pad min-h-screen py-10">
        <div className="pt-container-reading">
          <h1 className="text-3xl text-[var(--pt-ink)]">Result not available</h1>
          <p className="mt-3 text-[var(--pt-muted)]">We couldn&apos;t load this analysis right now.</p>
          <p className="mt-5 text-sm text-[var(--pt-muted)]">
            <strong>Status:</strong> {res.status}
          </p>
          <pre className="mt-3 overflow-auto rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-4 text-xs text-[var(--pt-ink)]">
            {detail}
          </pre>
        </div>
      </main>
    );
  }

  const json = await res.json();
  const abVariant = typeof json._ab_variant === "string" ? json._ab_variant : undefined;
  const parsed = PtResult.safeParse(json);

  if (!parsed.success) {
    return (
      <main className="pt-page-pad min-h-screen py-10">
        <div className="pt-container-reading">
          <h1 className="text-3xl text-[var(--pt-ink)]">Result format error</h1>
          <p className="mt-3 text-[var(--pt-muted)]">The server returned an unexpected format.</p>
        </div>
      </main>
    );
  }

  const data = parsed.data;
  const createdAtLabel = formatResultDate(data.created_at);
  const fileNameLabel = data.document?.file_name ?? "Contract document";

  return (
    <main className="pt-page-pad py-5 [--pt-muted:#7f7466]">
      <TrackResultViewed resultId={data.result_id} />

      <div className="pt-container-wide flex flex-col gap-5">
        <section className="pt-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/analyze"
              className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
            >
              ← Analyze another file
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pt-muted)]">
              <span>File name: {fileNameLabel}</span>
              <span>Reviewed: {createdAtLabel}</span>
            </div>
          </div>

          <div className="mt-3 max-w-4xl">
            <h1 className="text-2xl leading-tight text-[var(--pt-ink)] sm:text-3xl">
              {data.headline}
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-[var(--pt-muted)] lg:max-w-3xl">
              {data.overview}
            </p>
          </div>
        </section>

        <ResultWorkspace data={data} retentionDays={retentionDays} accessKey={accessKey} abVariant={abVariant} />
      </div>
    </main>
  );
}
