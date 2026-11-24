"use client";

import { useEffect, useState } from "react";
import ResultWorkspace from "@/components/ResultWorkspace";
import { PtResult as PtResultSchema, type PtResult } from "@/lib/plainterms-schema";

type LiveResultProps = {
  initial: PtResult;
  retentionDays: number;
  accessKey?: string;
  abVariant?: string;
  signedIn: boolean;
};

const POLL_MS = 3500;
const GIVE_UP_MS = 6 * 60 * 1000;

/**
 * Shows the instant first read right away and swaps in the full AI analysis
 * when it lands, without a page reload.
 */
export default function LiveResult({ initial, retentionDays, accessKey, abVariant, signedIn }: LiveResultProps) {
  const [data, setData] = useState(initial);
  const [justRefined, setJustRefined] = useState(false);
  const refining = data.analysis_stage === "refining";

  useEffect(() => {
    if (!refining) return undefined;
    let stopped = false;
    const startedAt = Date.now();
    const query = accessKey ? `?k=${encodeURIComponent(accessKey)}` : "";

    const timer = window.setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        window.clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(`/api/result/${encodeURIComponent(initial.result_id)}${query}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const parsed = PtResultSchema.safeParse(await res.json());
        if (!parsed.success || stopped) return;
        if (parsed.data.analysis_stage !== "refining") {
          window.clearInterval(timer);
          setData(parsed.data);
          setJustRefined(true);
        }
      } catch {
        // Transient network errors: try again on the next tick.
      }
    }, POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [refining, accessKey, initial.result_id]);

  return (
    <>
      <div role="status" aria-live="polite">
        {refining ? (
          <div className="flex items-center gap-3 rounded-2xl border border-(--pt-line) bg-white px-4 py-3 text-sm text-(--pt-ink-soft)">
            <span className="pt-spinner shrink-0 text-(--pt-action)" aria-hidden="true" />
            <p>
              <span className="font-semibold text-(--pt-ink)">This is a quick first read.</span> Our AI is reviewing every
              clause now and will update this page in about a minute.
            </p>
          </div>
        ) : justRefined ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            Full analysis ready. The report below has been updated.
          </div>
        ) : null}
      </div>
      <ResultWorkspace
        // Remount when the full analysis replaces the first read, so every tab starts fresh.
        key={data.analysis_stage ?? "complete"}
        data={data}
        retentionDays={retentionDays}
        accessKey={accessKey}
        abVariant={abVariant}
        signedIn={signedIn}
      />
    </>
  );
}
