import Link from "next/link";
import TrackResultViewed from "@/components/TrackResultViewed";
import LiveResult from "@/components/result/LiveResult";
import type { PtResult } from "@/lib/plainterms-schema";

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

type Props = {
  data: PtResult;
  retentionDays: number;
  accessKey?: string;
  abVariant?: string;
  signedIn: boolean;
  /** Link back to the newer step-by-step view, when this result has one. */
  newViewHref?: string;
};

/** The original tabbed result page, kept as the classic view. */
export default function ClassicResult({ data, retentionDays, accessKey, abVariant, signedIn, newViewHref }: Props) {
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
              <span className="max-w-[60vw] truncate">File: {data.document?.file_name ?? "Contract document"}</span>
              <span>Reviewed {formatResultDate(data.created_at)}</span>
              {newViewHref ? (
                <Link href={newViewHref} className="normal-case tracking-normal text-(--pt-ink) underline underline-offset-4">
                  Step-by-step view
                </Link>
              ) : null}
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
          signedIn={signedIn}
        />
      </div>
    </main>
  );
}
