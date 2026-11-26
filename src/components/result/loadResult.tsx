import Link from "next/link";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { PtResult, type PtResult as PtResultData } from "@/lib/plainterms-schema";
import { authHeaders, getSession } from "@/lib/auth";

export type ResultQuery = { k?: string; key?: string };

export type LoadedResult =
  | {
      ok: true;
      data: PtResultData;
      abVariant?: string;
      accessKey: string;
      signedIn: boolean;
      retentionDays: number;
    }
  | { ok: false; notice: React.ReactNode };

export function getRetentionDays() {
  const raw = Number(process.env.NEXT_PUBLIC_RESULT_RETENTION_DAYS ?? process.env.RESULT_TTL_DAYS ?? "30");
  if (!Number.isFinite(raw) || raw <= 0) return 30;
  return Math.floor(raw);
}

export function ResultNotice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

/** Test runs only: serve results from e2e/fixtures so the signed-in page can be checked without an account. */
async function loadFixture(id: string): Promise<unknown | null> {
  if (process.env.E2E_FIXTURES !== "1" || !id.startsWith("fixture-")) return null;
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const name = id.replace(/[^a-z0-9-]/gi, "");
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "e2e", "fixtures", `${name}.json`), "utf8"));
  } catch {
    return null;
  }
}

/** Fetches a result for the result pages and turns every failure into a notice. */
export async function loadResult(id: string, query: ResultQuery, here: string): Promise<LoadedResult> {
  const accessKey = (query.k ?? query.key ?? "").trim();
  const retentionDays = getRetentionDays();

  const fixture = await loadFixture(id);
  if (fixture) {
    const parsed = PtResult.safeParse(fixture);
    if (parsed.success) return { ok: true, data: parsed.data, accessKey: "", signedIn: true, retentionDays };
  }

  const session = await getSession();
  if (!accessKey && !session) {
    return {
      ok: false,
      notice: (
        <ResultNotice
          title="Sign in to open this document"
          action={
            <a href={`/sign-in?returnTo=${encodeURIComponent(here)}`} className="pt-btn pt-btn-solid px-6 py-3">
              Sign in
            </a>
          }
        >
          Your documents are saved to your account.
        </ResultNotice>
      ),
    };
  }

  const upstreamUrl = new URL(`${getApiBaseUrl()}/result/${encodeURIComponent(id)}`);
  if (accessKey) upstreamUrl.searchParams.set("k", accessKey);
  const retry = (
    <Link href={here} className="pt-btn pt-btn-solid px-6 py-3">
      Try again
    </Link>
  );

  let res: Response;
  try {
    res = await fetch(upstreamUrl.toString(), { cache: "no-store", headers: authHeaders(session) });
  } catch {
    return {
      ok: false,
      notice: (
        <ResultNotice title="We couldn't load this document" action={retry}>
          Please check your connection and try again.
        </ResultNotice>
      ),
    };
  }

  if (res.status === 202) {
    return {
      ok: false,
      notice: (
        <ResultNotice
          title="Still analyzing"
          action={
            <Link href={here} className="pt-btn pt-btn-solid px-6 py-3">
              Refresh
            </Link>
          }
        >
          Your document is still being processed. This usually takes under a minute.
        </ResultNotice>
      ),
    };
  }

  if (res.status === 410) {
    return {
      ok: false,
      notice: (
        <ResultNotice
          title="This document has expired"
          action={
            <>
              <Link href="/" className="pt-btn pt-btn-solid px-6 py-3">
                Analyze it again
              </Link>
              <Link href="/dashboard/billing" className="pt-btn pt-btn-outline px-6 py-3">
                Keep documents with Pro
              </Link>
            </>
          }
        >
          Free documents are kept for {retentionDays} days. Add the contract again to get a fresh analysis.
        </ResultNotice>
      ),
    };
  }

  if (res.status === 404 || res.status === 403 || res.status === 401) {
    return {
      ok: false,
      notice: (
        <ResultNotice
          title="We couldn't find this document"
          action={
            session ? (
              <Link href="/documents" className="pt-btn pt-btn-solid px-6 py-3">
                Go to your documents
              </Link>
            ) : (
              <a href={`/sign-in?returnTo=${encodeURIComponent(here)}`} className="pt-btn pt-btn-solid px-6 py-3">
                Sign in
              </a>
            )
          }
        >
          It may have been deleted, or it belongs to a different account.
        </ResultNotice>
      ),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      notice: (
        <ResultNotice title="We couldn't load this document" action={retry}>
          Something went wrong on our side. Please try again in a moment.
        </ResultNotice>
      ),
    };
  }

  const json = await res.json();
  const abVariant = typeof json._ab_variant === "string" ? json._ab_variant : undefined;
  const parsed = PtResult.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      notice: (
        <ResultNotice
          title="We couldn't display this document"
          action={
            <Link href="/" className="pt-btn pt-btn-solid px-6 py-3">
              Start a new analysis
            </Link>
          }
        >
          The result came back in a format we didn&apos;t expect.
        </ResultNotice>
      ),
    };
  }

  return { ok: true, data: parsed.data, abVariant, accessKey, signedIn: Boolean(session), retentionDays };
}
