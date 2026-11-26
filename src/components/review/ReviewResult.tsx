"use client";

import { useEffect, useState } from "react";
import { PtResult as PtResultSchema, type PtResult } from "@/lib/plainterms-schema";
import TrackResultViewed from "@/components/TrackResultViewed";
import ClassicResult from "@/components/result/ClassicResult";
import ReviewSteps from "@/components/review/ReviewSteps";
import WaitingGame from "@/components/review/WaitingGame";
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
const TICKS: Array<[string, number]> = [
  ["Reading it", 4],
  ["Finding what matters", 14],
  ["Writing it up", Infinity],
];

/** The wait before the first results: progress, and a small game for anyone who wants it. */
function Waiting({ ready, onPlay, onSee }: { ready: boolean; onPlay: () => void; onSee: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    const check = window.setTimeout(() => setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(check);
    };
  }, []);

  return (
    <div className="rv rv-wait">
      {ready ? (
        <div role="status" className="pt-framed rv-ready">
          <p>
            <span className="font-semibold">Your review is ready.</span>
          </p>
          <button type="button" className="pt-btn pt-btn-solid h-10 px-5 text-sm" onClick={onSee}>
            See it
          </button>
        </div>
      ) : (
        <div role="status" aria-live="polite" className="pt-panel flex items-center gap-3 px-5 py-4">
          <span className="pt-spinner shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Reviewing your contract.</span> This usually takes about a minute.
          </p>
        </div>
      )}
      <ol className="rv-ticks" aria-label="Progress">
        {TICKS.map(([label, doneAt], i) => {
          const startedAt = i === 0 ? 0 : TICKS[i - 1][1];
          const state = ready || seconds >= doneAt ? "done" : seconds >= startedAt ? "now" : "next";
          return (
            <li key={label} data-state={state}>
              <span className="rv-tickdot" aria-hidden="true">
                {state === "done" ? "✓" : ""}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      {motionOk ? <WaitingGame onPlay={onPlay} /> : null}
    </div>
  );
}

/** Keeps the step-by-step page current while the review or the revised draft is being written. */
export default function ReviewResult({ initial, retentionDays, accessKey, abVariant, signedIn }: Props) {
  const [data, setData] = useState(initial);
  // Someone mid-game when the review lands sees a "ready" banner instead of being yanked away.
  const [playing, setPlaying] = useState(false);
  const [seen, setSeen] = useState(false);
  const query = accessKey ? `?k=${encodeURIComponent(accessKey)}` : "";
  const id = initial.result_id;

  const canSeeRevision = data.entitlements ? data.entitlements.revised_document : true;
  const refining = data.analysis_stage === "refining";
  const waiting =
    refining ||
    data.review?.extras_status === "processing" ||
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
    }, refining ? POLL_FAST_MS : POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [waiting, refining, id, query]);

  const classicHref = `/result/${encodeURIComponent(id)}/classic${query}`;
  const review = data.review;

  if ((!review && refining) || (review && playing && !seen)) {
    return (
      <main className="pt-page-pad py-5">
        <TrackResultViewed resultId={id} />
        <div className="pt-container-wide">
          <Waiting ready={Boolean(review)} onPlay={() => setPlaying(true)} onSee={() => setSeen(true)} />
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
