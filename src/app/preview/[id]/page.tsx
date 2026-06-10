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

function riskLabelClass(label: "low" | "medium" | "high") {
  if (label === "high") return "border-[#efc1b6] bg-[#ffe8e3] text-[#9e3f2d]";
  if (label === "medium") return "border-[#ead3a1] bg-[#fff4df] text-[#8c6526]";
  return "border-[#b2ddd4] bg-[#e1f4ef] text-[#1d655f]";
}

function riskMeterClass(label: "low" | "medium" | "high") {
  if (label === "high") return "bg-[#e7745c]";
  if (label === "medium") return "bg-[#d8a84b]";
  return "bg-[#2ba59f]";
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
  const clauseIssueCount = data.clause_counts.unclear + data.clause_counts.missing;

  return (
    <main className="pt-page-pad py-6 [--pt-muted:#7f7466]">
      <div className="pt-container-wide">
        <Link href="/analyze" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Analyze another file
        </Link>

        <section className="mt-5">
          <div className="pt-card overflow-hidden">
            <div className="border-b border-[var(--pt-border)] bg-[#fff8f1] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pt-muted)]">
                <span>File: {fileNameLabel}</span>
                <span>Analyzed: {createdAtLabel}</span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl leading-tight text-[var(--pt-ink)] sm:text-5xl">
                {data.headline}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--pt-muted)]">
                {data.overview}
              </p>
            </div>

            <div className="p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-lg border border-[#efc1b6] bg-[#ffe8e3] p-4">
                  <p className="text-sm font-semibold text-[#9e3f2d]">Risk score</p>
                  <p className="mt-2 text-5xl font-semibold leading-none text-[#7f2e1f]">
                    {data.risk.score}
                  </p>
                  <p className="mt-1 text-sm text-[#9e3f2d]">out of 100</p>
                </article>
                <article className="rounded-lg border border-[#ead3a1] bg-[#fff4df] p-4">
                  <p className="text-sm font-semibold text-[#8c6526]">Red flags found</p>
                  <p className="mt-2 text-5xl font-semibold leading-none text-[#6e4f1e]">
                    {data.red_flag_count}
                  </p>
                  <p className="mt-1 text-sm text-[#8c6526]">issue count</p>
                </article>
                <article className="rounded-lg border border-[#b2ddd4] bg-[#e1f4ef] p-4">
                  <p className="text-sm font-semibold text-[#1d655f]">Clause issues</p>
                  <p className="mt-2 text-5xl font-semibold leading-none text-[#154f4a]">
                    {clauseIssueCount}
                  </p>
                  <p className="mt-1 text-sm text-[#1d655f]">unclear or missing</p>
                </article>
              </div>

              <div className="mt-4">
                <PreviewUnlockPanel
                  resultId={data.result_id}
                  previewAccessKey={previewAccessKey}
                  canceled={query.canceled === "1"}
                  redFlagCount={data.red_flag_count}
                  clauseCount={data.clause_counts.total}
                />
              </div>

              <article className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--pt-ink)]">Threat snapshot</p>
                    <p className="mt-1 text-sm text-[var(--pt-muted)]">
                      Shareable preview. Specific titles, notes, evidence, rewrites, and email content are locked.
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskLabelClass(data.risk.label)}`}>
                    {data.risk.label.toUpperCase()} RISK
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e8e0d4]">
                  <div
                    className={`h-full rounded-full ${riskMeterClass(data.risk.label)}`}
                    style={{ width: `${Math.max(data.risk.score, 5)}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-[#efc1b6] bg-white px-3 py-2">
                    <p className="text-xs text-[#9e3f2d]">High severity</p>
                    <p className="text-xl font-semibold text-[#7f2e1f]">{data.severity_counts.high}</p>
                  </div>
                  <div className="rounded-md border border-[#ead3a1] bg-white px-3 py-2">
                    <p className="text-xs text-[#8c6526]">Medium severity</p>
                    <p className="text-xl font-semibold text-[#6e4f1e]">{data.severity_counts.medium}</p>
                  </div>
                  <div className="rounded-md border border-[#b2ddd4] bg-white px-3 py-2">
                    <p className="text-xs text-[#1d655f]">Low severity</p>
                    <p className="text-xl font-semibold text-[#154f4a]">{data.severity_counts.low}</p>
                  </div>
                </div>
              </article>

              <p className="mt-5 text-xs leading-5 text-[var(--pt-muted)]">
                PlainTerms is informational only and is not legal advice.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
