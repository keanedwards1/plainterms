import type { Metadata } from "next";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { PtResult, SECTION_TITLES } from "@/lib/plainterms-schema";
import TrackResultViewed from "@/components/TrackResultViewed";

type Props = {
  params: Promise<{ id: string }>;
};

function getRetentionDays() {
  const raw = Number(
    process.env.NEXT_PUBLIC_RESULT_RETENTION_DAYS ?? process.env.RESULT_TTL_DAYS ?? "7"
  );
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return Math.floor(raw);
}

function riskLabelClass(label: "low" | "medium" | "high") {
  if (label === "high") return "bg-red-100 text-red-800 border-red-200";
  if (label === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function recommendationClass(action: "sign" | "negotiate" | "do_not_sign_yet") {
  if (action === "do_not_sign_yet") return "bg-red-100 text-red-800 border-red-200";
  if (action === "negotiate") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function clauseStatusClass(status: "present" | "unclear" | "missing") {
  if (status === "missing") return "bg-red-100 text-red-800";
  if (status === "unclear") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Contract Result",
    description:
      "Plain-English contract summary result for an independent contractor or services agreement.",
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

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const baseUrl = getApiBaseUrl();
  const retentionDays = getRetentionDays();

  const res = await fetch(`${baseUrl}/result/${id}`, {
    cache: "no-store",
  });

  if (res.status === 202) {
    const detail = await readFailureDetail(res);
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
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
      </main>
    );
  }

  if (!res.ok) {
    const detail = await readFailureDetail(res);

    if (res.status === 410) {
      return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
          <h1 className="text-3xl text-[var(--pt-ink)]">Result expired</h1>
        <p className="mt-3 text-[var(--pt-muted)]">
          This result is no longer available. Results typically expire after about{" "}
          {retentionDays} days. Uploading the contract again will create a new result.
        </p>
          <p className="mt-5 text-sm text-[var(--pt-muted)]">
            <strong>Result ID:</strong> {id}
          </p>
          <pre className="mt-3 overflow-auto rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-4 text-xs text-[var(--pt-ink)]">
            {detail}
          </pre>
        </main>
      );
    }

    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl text-[var(--pt-ink)]">Result not available</h1>
        <p className="mt-3 text-[var(--pt-muted)]">We couldn’t load this analysis right now.</p>
        <p className="mt-5 text-sm text-[var(--pt-muted)]">
          <strong>Status:</strong> {res.status}
        </p>
        <pre className="mt-3 overflow-auto rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] p-4 text-xs text-[var(--pt-ink)]">
          {detail}
        </pre>
      </main>
    );
  }

  const json = await res.json();
  const parsed = PtResult.safeParse(json);

  if (!parsed.success) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl text-[var(--pt-ink)]">Result format error</h1>
        <p className="mt-3 text-[var(--pt-muted)]">The server returned an unexpected format.</p>
      </main>
    );
  }

  const data = parsed.data;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12">
      <TrackResultViewed resultId={data.result_id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/analyze" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Analyze another file
        </Link>
        <p className="text-xs text-[var(--pt-muted)]">Result ID: {data.result_id}</p>
      </div>

      <section className="mt-5 rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-sm">
        <h1 className="text-3xl leading-tight text-[var(--pt-ink)] sm:text-4xl">{data.headline}</h1>
        <p className="mt-4 text-base text-[var(--pt-muted)]">{data.overview}</p>

        {data.gentle_notice && (
          <div className="mt-5 rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4 text-sm text-[var(--pt-muted)]">
            {data.gentle_notice}
          </div>
        )}
      </section>

      {data.report && (
        <section className="mt-6 grid gap-4">
          <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl text-[var(--pt-ink)]">Risk Summary</h2>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskLabelClass(
                  data.report.risk.label
                )}`}
              >
                {data.report.risk.label.toUpperCase()}
              </span>
            </div>
            <p className="mt-3 text-[15px] leading-7 text-[var(--pt-muted)]">
              Risk score: <strong className="text-[var(--pt-ink)]">{data.report.risk.score}/100</strong>
            </p>
            <div
              className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${recommendationClass(
                data.report.recommendation.action
              )}`}
            >
              Recommendation: {data.report.recommendation.label}
            </div>
            <p className="mt-3 text-sm text-[var(--pt-muted)]">{data.report.recommendation.reason}</p>
            {data.report.creator_contract && (
              <p className="mt-2 text-xs font-semibold text-[var(--pt-muted)]">
                Creator/Model contract signals detected.
              </p>
            )}
          </article>

          {data.report.red_flags.length > 0 && (
            <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
              <h2 className="text-2xl text-[var(--pt-ink)]">Top Red Flags</h2>
              <div className="mt-4 grid gap-3">
                {data.report.red_flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--pt-ink)]">{flag.title}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          flag.severity === "high"
                            ? "bg-red-100 text-red-800"
                            : flag.severity === "medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {flag.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--pt-muted)]">{flag.plain_note}</p>
                  </div>
                ))}
              </div>
            </article>
          )}

          {data.report.clause_breakdown.length > 0 && (
            <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
              <h2 className="text-2xl text-[var(--pt-ink)]">Clause-by-Clause Breakdown</h2>
              <div className="mt-4 grid gap-3">
                {data.report.clause_breakdown.map((clause) => (
                  <div
                    key={clause.key}
                    className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--pt-ink)]">{clause.title}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${clauseStatusClass(
                          clause.status
                        )}`}
                      >
                        {clause.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--pt-muted)]">{clause.what_it_means}</p>
                    <p className="mt-2 text-sm text-[var(--pt-muted)]">
                      <strong className="text-[var(--pt-ink)]">Why it matters:</strong>{" "}
                      {clause.why_it_matters}
                    </p>
                    {clause.evidence && (
                      <blockquote className="mt-2 rounded-r-lg border-l-4 border-[var(--pt-accent)] bg-[var(--pt-surface)] px-3 py-2 text-xs text-[var(--pt-muted)]">
                        {clause.evidence}
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}

          {data.report.negotiation_bullets && (
            <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
              <h2 className="text-2xl text-[var(--pt-ink)]">Negotiation Bullets</h2>
              <div className="mt-4 grid gap-4">
                {(["high", "medium", "low"] as const).map((priority) =>
                  data.report?.negotiation_bullets?.[priority]?.length ? (
                    <div key={priority}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                        {priority} priority
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--pt-muted)]">
                        {data.report.negotiation_bullets[priority].map((item, idx) => (
                          <li key={`${priority}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                )}
              </div>
            </article>
          )}

          {data.report.questions_to_ask?.length ? (
            <article className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
              <h2 className="text-2xl text-[var(--pt-ink)]">Questions To Ask</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--pt-muted)]">
                {data.report.questions_to_ask.map((question, idx) => (
                  <li key={`q-${idx}`}>{question}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>
      )}

      <section className="mt-8 grid gap-4">
        {data.sections.map((section) => (
          <article
            key={section.key}
            className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl text-[var(--pt-ink)]">{SECTION_TITLES[section.key]}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  section.status === "present"
                    ? "bg-[var(--pt-accent-soft)] text-[var(--pt-ink)]"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {section.status}
              </span>
            </div>

            <p className="text-[15px] leading-7 text-[var(--pt-muted)]">{section.body}</p>

            {section.soft_note && (
              <p className="mt-3 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3 text-sm text-[var(--pt-muted)]">
                {section.soft_note}
              </p>
            )}

            {section.quotes?.length ? (
              <div className="mt-4 grid gap-3">
                {section.quotes.map((q, idx) => (
                  <blockquote
                    key={`${section.key}-q-${idx}`}
                    className="rounded-r-lg border-l-4 border-[var(--pt-accent)] bg-[var(--pt-surface-soft)] px-4 py-3 text-sm text-[var(--pt-muted)]"
                  >
                    {q}
                  </blockquote>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <footer className="mt-8 border-t border-[var(--pt-border)] pt-5 text-sm text-[var(--pt-muted)]">
        <p>{data.notices.not_legal_advice}</p>
        <p className="mt-2 text-xs">
          Results are typically available for about {retentionDays} days and may expire
          automatically.
        </p>
      </footer>
    </main>
  );
}
