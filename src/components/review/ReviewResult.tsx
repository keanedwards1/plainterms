"use client";

import { useEffect, useState } from "react";
import { PtResult as PtResultSchema, type PtResult } from "@/lib/plainterms-schema";
import TrackResultViewed from "@/components/TrackResultViewed";
import ClassicResult from "@/components/result/ClassicResult";
import ReviewSteps from "@/components/review/ReviewSteps";

type Props = {
  initial: PtResult;
  retentionDays: number;
  accessKey?: string;
  abVariant?: string;
  signedIn: boolean;
};

const POLL_MS = 3500;
const GIVE_UP_MS = 6 * 60 * 1000;

/** Keeps the step-by-step page current while the review or the revised draft is being written. */
export default function ReviewResult({ initial, retentionDays, accessKey, abVariant, signedIn }: Props) {
  const [data, setData] = useState(initial);
  const query = accessKey ? `?k=${encodeURIComponent(accessKey)}` : "";
  const id = initial.result_id;

  const canSeeRevision = data.entitlements ? data.entitlements.revised_document : true;
  const waiting =
    data.analysis_stage === "refining" ||
    (canSeeRevision && data.document?.revision?.status === "processing");

  useEffect(() => {
    if (!waiting) return undefined;
    let stopped = false;
    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        window.clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(`/api/result/${encodeURIComponent(id)}${query}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const parsed = PtResultSchema.safeParse(await res.json());
        if (parsed.success && !stopped) setData(parsed.data);
      } catch {
        // Try again on the next tick.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [waiting, id, query]);

  const classicHref = `/result/${encodeURIComponent(id)}/classic${query}`;
  const review = data.review;

  if (!review) {
    if (data.analysis_stage === "refining") {
      return (
        <main className="pt-page-pad py-5">
          <TrackResultViewed resultId={id} />
          <div className="pt-container-wide">
            <div role="status" aria-live="polite" className="pt-panel flex items-center gap-3 px-5 py-4">
              <span className="pt-spinner shrink-0" aria-hidden="true" />
              <p>
                <span className="font-semibold">Reviewing your contract.</span> This usually takes about a minute.
              </p>
            </div>
            <div className="mt-5 grid gap-4" aria-hidden="true">
              <div className="pt-skeleton h-16 rounded-(--pt-radius)" />
              <div className="pt-skeleton h-[420px] rounded-(--pt-radius)" />
            </div>
          </div>
        </main>
      );
    }
    return <ClassicResult data={data} retentionDays={retentionDays} accessKey={accessKey} abVariant={abVariant} signedIn={signedIn} />;
  }

  return (
    <main className="pt-page-pad py-5">
      <TrackResultViewed resultId={id} />
      <div className="pt-container-wide">
        <ReviewSteps
          key={review.perspective.party}
          data={data}
          review={review}
          signedIn={signedIn}
          classicHref={classicHref}
        />
      </div>
    </main>
  );
}
