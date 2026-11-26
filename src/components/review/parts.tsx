import type { ReactNode } from "react";

export type Sev = "high" | "medium" | "low";

export const SEV_LABEL: Record<Sev, string> = { high: "High", medium: "Medium", low: "Low" };

export function SevChip({ sev, prefix = "" }: { sev: Sev; prefix?: string }) {
  return <span className={`rv-chip rv-${sev}`}>{`${prefix}${SEV_LABEL[sev]}`}</span>;
}

/** The risk score on a labelled Low / Medium / High scale, so it's clear which end is bad. */
export function RiskMeter({ score, label }: { score: number; label: Sev }) {
  return (
    <div className="rv-risk">
      <div className="rv-risk-num">
        {score}
        <small>/100</small>
      </div>
      <div>
        <p>
          <b>{SEV_LABEL[label]} risk</b> <span className="text-(--pt-muted)">· higher means riskier</span>
        </p>
        <div className="rv-mbar" aria-hidden="true">
          <span />
          <span />
          <span />
          <i style={{ left: `${Math.min(98, Math.max(2, score))}%` }} />
        </div>
        <div className="rv-mlab" aria-hidden="true">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

export function Icon({ d, className = "h-4 w-4" }: { d: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}

export const ICONS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  ask: <path d="M5 5h14v10H9l-4 4z" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
} as const;
