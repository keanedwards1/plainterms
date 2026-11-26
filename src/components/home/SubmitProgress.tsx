export type SubmitStep = "uploading" | "checking" | "starting" | "opening";

const STEPS: Array<{ key: SubmitStep; label: string; detail: string }> = [
  { key: "uploading", label: "Upload", detail: "Uploading your contract to encrypted storage." },
  { key: "checking", label: "Check file", detail: "Scanning for malware, confirming the file type and pulling out the text." },
  { key: "starting", label: "Start review", detail: "Reading the clauses and scoring the risk." },
  { key: "opening", label: "Open results", detail: "Opening your results." },
];

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3.2L13 4.5" />
    </svg>
  );
}

/** The checks a document goes through after Submit, as a strip along the bottom of the upload field. */
export default function SubmitProgress({ step, className = "" }: { step: SubmitStep; className?: string }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.key === step));
  return (
    <div className={`pt-submit ${className}`}>
      <span className="pt-submit-bar" aria-hidden="true" style={{ width: `${((current + 0.6) / STEPS.length) * 100}%` }} />
      <p role="status" aria-live="polite" className="sr-only">
        {STEPS[current].detail}
      </p>
      <ol className="pt-submit-steps" aria-hidden="true">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={s.key} data-state={state}>
              {state === "done" ? <Check /> : state === "active" ? <span className="pt-spinner" /> : <span className="pt-submit-dot" />}
              {s.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
