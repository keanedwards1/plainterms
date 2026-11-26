"use client";

import { useEffect, useState } from "react";
import { PtResult as PtResultSchema, type PtResult } from "@/lib/plainterms-schema";
import TrackResultViewed from "@/components/TrackResultViewed";
import ClassicResult from "@/components/result/ClassicResult";
import ReviewSteps from "@/components/review/ReviewSteps";
import PlexusLoader from "@/components/review/PlexusLoader";
import "./review.css";

type Props = {
  initial: PtResult;
  retentionDays: number;
  accessKey?: string;
  abVariant?: string;
  signedIn: boolean;
};

const POLL_FAST_MS = 2000;
const POLL_MS = 3500;
const GIVE_UP_MS = 6 * 60 * 1000;
/** The wait, in three parts: [label, the second it usually ends]. The last part never quite fills. */
const STAGES: Array<[string, number]> = [
  ["Reading it", 5],
  ["Finding what matters", 16],
  ["Writing it up", Infinity],
];

/** How full one part of the bar is, 0 to 1, at `seconds` since the wait began. */
function stageFill(seconds: number, i: number) {
  const from = i === 0 ? 0 : STAGES[i - 1][1];
  const to = STAGES[i][1];
  if (seconds <= from) return 0;
  if (to === Infinity) return Math.min(0.92, 1 - Math.exp(-(seconds - from) / 30));
  return Math.min(1, (seconds - from) / (to - from));
}

/** The wait before the first results: the network loader over a progress bar. */
export function Waiting() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds((Date.now() - started) / 1000), 500);
    return () => window.clearInterval(timer);
  }, []);

  const fills = STAGES.map((_, i) => stageFill(seconds, i));
  const current = Math.max(0, fills.findIndex((f) => f < 1));
  const overall = Math.round((fills.reduce((sum, f) => sum + f, 0) / STAGES.length) * 100);

  return (
    <div className="rv rv-wait">
      <PlexusLoader />
      <div className="rv-prog">
        <p className="rv-prog-head" aria-live="polite">
          <span className="font-semibold">Reviewing your contract</span>
          <span className="rv-prog-now">{STAGES[current][0]}…</span>
        </p>
        <div className="rv-prog-bar" role="progressbar" aria-label="Review progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overall}>
          {fills.map((f, i) => (
            <span key={STAGES[i][0]} className="rv-prog-seg">
              <span style={{ width: `${f * 100}%` }} />
            </span>
          ))}
        </div>
        <ol className="rv-prog-steps" aria-label="Progress">
          {STAGES.map(([label], i) => (
            <li key={label} data-state={i < current ? "done" : i === current ? "now" : "next"}>
              {i < current ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
              {label}
            </li>
          ))}
        </ol>
        <p className="rv-prog-note">This usually takes about a minute.</p>
      </div>
    </div>
  );
}

/** Keeps the step-by-step page current while the review or the revised draft is being written. */
export default function ReviewResult({ initial, retentionDays, accessKey, abVariant, signedIn }: Props) {
  const [data, setData] = useState(initial);
  const query = accessKey ? `?k=${encodeURIComponent(accessKey)}` : "";
  const id = initial.result_id;

  const refining = data.analysis_stage === "refining";
  const waiting =
    refining ||
    data.review?.extras_status === "processing";

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
    }, refining ? POLL_FAST_MS : POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [waiting, refining, id, query]);

  const classicHref = `/result/${encodeURIComponent(id)}/classic${query}`;
  const review = data.review;

  if (!review && refining) {
    return (
      <main className="pt-page-pad py-5">
        <TrackResultViewed resultId={id} />
        <div className="pt-container-wide">
          <Waiting />
        </div>
      </main>
    );
  }
  if (!review) {
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
