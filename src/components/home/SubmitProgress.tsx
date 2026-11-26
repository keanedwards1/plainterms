export type SubmitStep = "uploading" | "checking" | "starting" | "opening";

const STEPS: Array<{ key: SubmitStep; label: string; detail: string }> = [
  { key: "uploading", label: "Uploading securely", detail: "Sending your contract to encrypted storage." },
  { key: "checking", label: "Checking the file", detail: "Scanning for malware, confirming the file type and pulling out the text." },
  { key: "starting", label: "Starting the review", detail: "Reading the clauses and scoring the risk." },
  { key: "opening", label: "Opening your results", detail: "Taking you to your review." },
];

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/** The checks a document goes through after Submit, one row per step. */
export default function SubmitProgress({ step }: { step: SubmitStep }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.key === step));
  const active = STEPS[current];
  return (
    <div className="pt-submit">
      <div role="status" aria-live="polite">
        <p className="pt-submit-title">
          <span className="pt-submit-pulse" aria-hidden="true" />
          {active.label}
        </p>
        <p className="pt-submit-detail">{active.detail}</p>
      </div>
      <div className="pt-submit-bar" aria-hidden="true">
        <span style={{ width: `${((current + 0.6) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="pt-submit-steps">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={s.key} data-state={state}>
              <span className="pt-submit-dot" aria-hidden="true">
                {state === "done" ? <Check /> : null}
              </span>
              {s.label}
              <span className="sr-only">{state === "done" ? " (done)" : state === "active" ? " (in progress)" : ""}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
