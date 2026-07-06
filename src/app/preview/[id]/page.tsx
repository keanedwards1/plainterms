import type { Metadata } from "next";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import PreviewUnlockPanel from "@/components/PreviewUnlockPanel";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string; previewKey?: string; canceled?: string }>;
};

type PreviewResult = {
  schema_version: "pt.preview.v1";
  result_id: string;
  created_at: string;
  headline: string;
  overview: string;
  document?: {
    file_name?: string;
    content_type?: string;
    word_count?: number;
  };
  risk: {
    score: number;
    label: "low" | "medium" | "high";
  };
  red_flag_count: number;
  severity_counts: {
    high: number;
    medium: number;
    low: number;
  };
  clause_counts: {
    present: number;
    unclear: number;
    missing: number;
    total: number;
  };
  teaser?: {
    top_next_step: string | null;
    next_steps?: string[];
    next_step_count: number;
    red_flag_titles: string[];
  };
  locked: {
    red_flags: number;
    clause_breakdown: number;
    rewrites: boolean;
    negotiation_email: boolean;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Free Contract Risk Preview",
    description: "A PlainTerms preview showing contract risk score and red-flag count.",
    alternates: {
      canonical: `/preview/${id}`,
    },
    robots: {
      index: false,
      follow: false,
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
      return JSON.stringify(json).slice(0, 500);
    }

    const text = await res.text();
    if (text.trim()) return text.slice(0, 500);
  } catch {
    // Fall through.
  }

  return res.statusText || "Unknown error";
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

export default async function PreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const previewAccessKey = (query.p ?? query.previewKey ?? "").trim();

  if (!previewAccessKey) {
    return (
      <main className="pt-page-pad min-h-screen py-10">
        <div className="pt-container-reading">
          <h1 className="text-3xl text-[var(--pt-ink)]">Secure preview link required</h1>
          <p className="mt-3 text-[var(--pt-muted)]">
            This preview requires the secure link created after upload.
          </p>
          <Link href="/analyze" className="mt-5 inline-flex font-semibold underline">
            Upload a contract
          </Link>
        </div>
      </main>
    );
  }

  const res = await fetch(
    `${getApiBaseUrl()}/result/${id}?preview=1&p=${encodeURIComponent(previewAccessKey)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const detail = await readFailureDetail(res);
    return (
      <main className="pt-page-pad min-h-screen py-10">
        <div className="pt-container-reading">
          <h1 className="text-3xl text-[var(--pt-ink)]">Preview not available</h1>
          <p className="mt-3 text-[var(--pt-muted)]">We couldn&apos;t load this preview right now.</p>
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

  const data = (await res.json()) as PreviewResult;
  const createdAtLabel = formatResultDate(data.created_at);
  const fileNameLabel = data.document?.file_name ?? "Contract document";

  return (
    <main className="pt-page-pad py-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/analyze"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pt-muted)] transition-colors hover:text-[var(--pt-ink)]"
          >
            <span aria-hidden="true">←</span>
            <span className="relative">
              Analyze another file
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </span>
          </Link>
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3.5 py-1.5 text-xs text-[var(--pt-muted)]">
            <svg className="h-3.5 w-3.5 shrink-0 text-[var(--pt-muted)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 1.5h5L13 5.5v9H4z" strokeLinejoin="round" />
              <path d="M9 1.5v4h4" strokeLinejoin="round" />
            </svg>
            <span className="truncate max-w-[12rem] font-medium text-[var(--pt-ink)] sm:max-w-none">{fileNameLabel}</span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span>Reviewed {createdAtLabel}</span>
          </div>
        </div>

        <PreviewUnlockPanel
          resultId={data.result_id}
          previewAccessKey={previewAccessKey}
          canceled={query.canceled === "1"}
          overview={data.overview}
          risk={data.risk}
          redFlagCount={data.red_flag_count}
          clauseCounts={data.clause_counts}
          teaser={data.teaser}
        />
      </div>
    </main>
  );
}
