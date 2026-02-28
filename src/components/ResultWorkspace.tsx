"use client";

import { useMemo, useState } from "react";
import { SECTION_TITLES, type PtResult } from "@/lib/plainterms-schema";
import { REPORT_TIER_LABELS } from "@/lib/pricingOptions";

type ResultWorkspaceProps = {
  data: PtResult;
  retentionDays: number;
};

type ReportTab = "summary" | "flags" | "terms" | "questions" | "full";
type BasicTab = "summary" | "supporting";

const LEGAL_TERM_GLOSSARY = Object.freeze({
  indemnity: "Who pays legal costs if a third party sues over this contract.",
  indemnification: "Who pays legal costs if a third party sues over this contract.",
  indemnify: "To cover the other side's losses or legal costs in certain situations.",
  liability: "Legal responsibility for losses, damages, or claims.",
  "limitation of liability": "A clause that sets a maximum amount one side can owe.",
  "liability cap": "A maximum amount one side can be required to pay.",
  "governing law": "The state/country law used to interpret this contract.",
  jurisdiction: "Which courts have authority to hear a dispute.",
  venue: "The physical place or court where a dispute is handled.",
  arbitration: "Private dispute process instead of going to court.",
  mediation: "A neutral third party helps both sides try to settle.",
  "material breach": "A serious contract violation that can justify termination.",
  "cure period": "Time allowed to fix a breach before penalties or termination.",
  "termination for convenience": "A right to end the contract without fault.",
  warranty: "A promise that certain facts or quality standards are true.",
  warranties: "Promises that certain facts or quality standards are true.",
  disclaimer: "Language that limits or removes certain promises or liability.",
  assignment: "Transferring contract rights/obligations to another party.",
  subcontracting: "Hiring another party to perform part of the work.",
  sublicensing: "Giving another party permission to use licensed rights.",
  perpetual: "No set end date; it can continue indefinitely.",
  irrevocable: "Cannot be unilaterally taken back once granted.",
  exclusivity: "Restriction preventing work with certain other parties.",
  "non-compete": "Restriction on doing competing work for a period of time.",
  "non-solicit": "Restriction on approaching certain clients/employees.",
  confidentiality: "Rules for keeping sensitive information private.",
  "injunctive relief": "Court order requiring someone to do or stop doing something.",
});

const LEGAL_TERM_KEYS = Object.keys(LEGAL_TERM_GLOSSARY).sort((a, b) => b.length - a.length);
const LEGAL_TERM_REGEX = new RegExp(
  `\\b(${LEGAL_TERM_KEYS.map((term) => term.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

function annotateLegalTerms(text: string, keyPrefix: string) {
  if (!text || !LEGAL_TERM_REGEX.test(text)) {
    LEGAL_TERM_REGEX.lastIndex = 0;
    return text;
  }
  LEGAL_TERM_REGEX.lastIndex = 0;

  const parts = text.split(LEGAL_TERM_REGEX);
  return parts.map((part, idx) => {
    const definition =
      LEGAL_TERM_GLOSSARY[part.toLowerCase() as keyof typeof LEGAL_TERM_GLOSSARY];
    if (!definition) return <span key={`${keyPrefix}-${idx}`}>{part}</span>;

    return (
      <span key={`${keyPrefix}-${idx}`} className="group relative inline">
        <span
          tabIndex={0}
          className="cursor-pointer rounded-[2px] underline decoration-dotted decoration-[var(--pt-ink)] underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pt-ink)]/25"
          aria-label={`${part}: ${definition}`}
        >
          {part}
        </span>
        <span
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface)] p-2 text-left text-xs leading-5 text-[var(--pt-ink)] opacity-0 shadow-md transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        >
          {definition}
        </span>
      </span>
    );
  });
}

function riskLabelClass(label: "low" | "medium" | "high") {
  if (label === "high") return "bg-[#ffe8e3] text-[#9e3f2d] border-[#efc1b6]";
  if (label === "medium") return "bg-[#fff4df] text-[#8c6526] border-[#ead3a1]";
  return "bg-[#e1f4ef] text-[#1d655f] border-[#b2ddd4]";
}

function recommendationClass(action: "sign" | "negotiate" | "do_not_sign_yet") {
  if (action === "do_not_sign_yet") return "bg-[#ffe8e3] text-[#9e3f2d] border-[#efc1b6]";
  if (action === "negotiate") return "bg-[#fff4df] text-[#8c6526] border-[#ead3a1]";
  return "bg-[#e1f4ef] text-[#1d655f] border-[#b2ddd4]";
}

function reportTierClass(tier: "scan_39" | "report_69" | "protect_99") {
  if (tier === "scan_39") return "bg-[#edf4f9] text-[#36576f] border-[#c3d3dd]";
  if (tier === "protect_99") return "bg-[#f0edff] text-[#4c438f] border-[#ccc3ef]";
  return "bg-[#dff2ee] text-[#1f655f] border-[#b3ddd5]";
}

function clauseStatusClass(status: "present" | "unclear" | "missing") {
  if (status === "missing") return "bg-[#ffe8e3] text-[#9e3f2d]";
  if (status === "unclear") return "bg-[#fff4df] text-[#8c6526]";
  return "bg-[#e1f4ef] text-[#1d655f]";
}

function sectionStatusClass(status: "present" | "unclear") {
  if (status === "unclear") return "bg-[#fff4df] text-[#8c6526]";
  return "bg-[#ffe8df] text-[#9e4f3d]";
}

function flagSeverityClass(severity: "low" | "medium" | "high") {
  if (severity === "high") return "bg-[#ffe8e3] text-[#9e3f2d]";
  if (severity === "medium") return "bg-[#fff4df] text-[#8c6526]";
  return "bg-[#e1f4ef] text-[#1d655f]";
}

function riskMeterClass(label: "low" | "medium" | "high") {
  if (label === "high") return "bg-[#e7745c]";
  if (label === "medium") return "bg-[#d8a84b]";
  return "bg-[#2ba59f]";
}

export default function ResultWorkspace({ data, retentionDays }: ResultWorkspaceProps) {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>("summary");
  const [activeBasicTab, setActiveBasicTab] = useState<BasicTab>("summary");

  const supportingSections = useMemo(
    () => data.sections.filter((section) => section.key !== "summary"),
    [data.sections]
  );
  const reportSupportingSections = useMemo(
    () =>
      data.report
        ? supportingSections.filter(
            (section) =>
              section.key === "questions_missing_info" ||
              section.key === "notices_disclaimers" ||
              section.key === "source_map"
          )
        : supportingSections,
    [data.report, supportingSections]
  );

  const redFlags = data.report?.red_flags ?? [];
  const clauseBreakdown = data.report?.clause_breakdown ?? [];
  const questionsToAsk = data.report?.questions_to_ask ?? [];
  const reportTier = data.report?.tier ?? "report_69";

  const actionItems = useMemo(() => {
    const bullets = data.report?.negotiation_bullets;
    if (!bullets) return [];
    if (bullets.high.length) return bullets.high.slice(0, 4);
    if (bullets.medium.length) return bullets.medium.slice(0, 4);
    return bullets.low.slice(0, 4);
  }, [data.report]);

  const reportTabs: Array<{ key: ReportTab; label: string; count?: number | "all" }> = [
    { key: "summary", label: "Summary" },
    { key: "flags", label: "Red Flags", count: redFlags.length },
    { key: "terms", label: "Key Terms", count: clauseBreakdown.length },
    ...(questionsToAsk.length
      ? ([{ key: "questions", label: "Questions", count: questionsToAsk.length }] as const)
      : []),
    { key: "full", label: "Full Report", count: "all" },
  ];

  const baseTabs: Array<{ key: BasicTab; label: string }> = [
    { key: "summary", label: "Summary" },
    { key: "supporting", label: "Supporting Details" },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="pt-card p-4">
        {data.report ? (
          <>
            <h2 className="text-xl text-[var(--pt-ink)]">At A Glance</h2>
            <nav aria-label="Result sections" className="mt-3 space-y-2">
              {reportTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveReportTab(tab.key)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    activeReportTab === tab.key
                      ? "border-[#67b8af] bg-[#dbf2ee] text-[#134f4b]"
                      : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[#67b8af] hover:text-[var(--pt-ink)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined ? (
                    <span className="pt-pill !px-2 !py-0.5 !text-[10px]">
                      {tab.count === "all" ? "All" : tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="mt-4 space-y-3">
              <div className="pt-card-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                  Risk
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskLabelClass(
                      data.report.risk.label
                    )}`}
                  >
                    {data.report.risk.label.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">
                    {data.report.risk.score}/100
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
                  <div
                    className={`h-full rounded-full ${riskMeterClass(data.report.risk.label)}`}
                    style={{ width: `${Math.max(data.report.risk.score, 6)}%` }}
                  />
                </div>
              </div>

              <div className="pt-card-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                  Recommendation
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${recommendationClass(
                    data.report.recommendation.action
                  )}`}
                >
                  {data.report.recommendation.label}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-[var(--pt-muted)]">
                  {annotateLegalTerms(data.report.recommendation.reason, "recommendation")}
                </p>
              </div>

              <div className="pt-card-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                  Plan
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reportTierClass(
                    reportTier
                  )}`}
                >
                  {REPORT_TIER_LABELS[reportTier]}
                </span>
                <p className="mt-2 text-xs text-[var(--pt-muted)]">
                  {redFlags.length} flags • {clauseBreakdown.length} clauses
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl text-[var(--pt-ink)]">Result</h2>
            <p className="mt-2 text-sm text-[var(--pt-muted)]">
              This result contains a plain-English summary and supporting extraction details.
            </p>
            <nav aria-label="Result sections" className="mt-3 space-y-2">
              {baseTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveBasicTab(tab.key)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    activeBasicTab === tab.key
                      ? "border-[#67b8af] bg-[#dbf2ee] text-[#134f4b]"
                      : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[#67b8af] hover:text-[var(--pt-ink)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </>
        )}

        <div className="mt-5 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
          {annotateLegalTerms(data.notices.not_legal_advice, "not-legal-advice")}
        </div>
      </aside>

      <section className="pt-card p-4">
        {data.report ? (
          <>
            <div className="mb-3">
              <h2 className="text-xl text-[var(--pt-ink)]">
                {activeReportTab === "summary" && "Summary"}
                {activeReportTab === "flags" && "Red Flags"}
                {activeReportTab === "terms" && "Key Terms"}
                {activeReportTab === "questions" && "Questions To Ask"}
                {activeReportTab === "full" && "Full Report Details"}
              </h2>
            </div>

            <div className="space-y-3">
              {activeReportTab === "summary" && (
                <>
                  <article className="pt-card-soft p-3">
                    <h3 className="text-base font-semibold text-[var(--pt-ink)]">Top Next Steps</h3>
                    {actionItems.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {actionItems.map((item, idx) => (
                          <li
                            key={`summary-action-${idx}`}
                            className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2 text-sm text-[var(--pt-muted)]"
                          >
                            {annotateLegalTerms(item, `summary-action-${idx}`)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--pt-muted)]">
                        No priority action items were generated for this report.
                      </p>
                    )}
                  </article>

                  <article className="pt-card-soft p-3">
                    <h3 className="text-base font-semibold text-[var(--pt-ink)]">Top Flags Preview</h3>
                    <ul className="mt-2 space-y-2">
                      {redFlags.slice(0, 3).map((flag) => (
                        <li
                          key={`summary-flag-${flag.id}`}
                          className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--pt-ink)]">
                              {annotateLegalTerms(flag.title, `summary-flag-title-${flag.id}`)}
                            </p>
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${flagSeverityClass(
                                flag.severity
                              )}`}
                            >
                              {flag.severity}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                </>
              )}

              {activeReportTab === "flags" && (
                <>
                  {redFlags.length > 0 ? (
                    redFlags.map((flag) => (
                      <article key={flag.id} className="pt-card-soft p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--pt-ink)]">
                            {annotateLegalTerms(flag.title, `flags-title-${flag.id}`)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${flagSeverityClass(
                              flag.severity
                            )}`}
                          >
                            {flag.severity}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--pt-muted)]">
                          {annotateLegalTerms(flag.plain_note, `flags-note-${flag.id}`)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="pt-card-soft p-3 text-sm text-[var(--pt-muted)]">
                      No red flags were generated for this report.
                    </div>
                  )}
                </>
              )}

              {activeReportTab === "terms" && (
                <>
                  {clauseBreakdown.length > 0 ? (
                    clauseBreakdown.map((clause) => (
                      <article key={clause.key} className="pt-card-soft p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--pt-ink)]">
                            {annotateLegalTerms(clause.title, `terms-title-${clause.key}`)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${clauseStatusClass(
                              clause.status
                            )}`}
                          >
                            {clause.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--pt-muted)]">
                          {annotateLegalTerms(clause.what_it_means, `terms-meaning-${clause.key}`)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="pt-card-soft p-3 text-sm text-[var(--pt-muted)]">
                      No clause breakdown is available for this report.
                    </div>
                  )}
                </>
              )}

              {activeReportTab === "questions" && (
                <>
                  {questionsToAsk.length > 0 ? (
                    <article className="pt-card-soft p-3">
                      <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--pt-muted)]">
                        {questionsToAsk.map((question, idx) => (
                          <li key={`question-${idx}`}>
                            {annotateLegalTerms(question, `question-${idx}`)}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ) : (
                    <div className="pt-card-soft p-3 text-sm text-[var(--pt-muted)]">
                      No questions were generated for this report.
                    </div>
                  )}
                </>
              )}

              {activeReportTab === "full" && (
                <>
                  {clauseBreakdown.map((clause) => (
                    <article
                      key={`full-${clause.key}`}
                      className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3"
                    >
                      <p className="font-semibold text-[var(--pt-ink)]">
                        {annotateLegalTerms(clause.title, `full-title-${clause.key}`)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--pt-muted)]">
                        {annotateLegalTerms(clause.what_it_means, `full-meaning-${clause.key}`)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--pt-muted)]">
                        <strong className="text-[var(--pt-ink)]">Why it matters:</strong>{" "}
                        {annotateLegalTerms(clause.why_it_matters, `full-why-${clause.key}`)}
                      </p>
                      {clause.evidence && (
                        <blockquote className="mt-2 rounded-r-lg border-l-4 border-[var(--pt-accent)] bg-[var(--pt-surface)] px-3 py-2 text-xs text-[var(--pt-muted)]">
                          {annotateLegalTerms(clause.evidence, `full-evidence-${clause.key}`)}
                        </blockquote>
                      )}
                    </article>
                  ))}

                  {reportSupportingSections.length > 0 && (
                    <article className="pt-card-soft p-3">
                      <h3 className="text-base font-semibold text-[var(--pt-ink)]">
                        Supporting Extraction Details
                      </h3>
                      <div className="mt-2 space-y-2">
                        {reportSupportingSections.map((section) => (
                          <div
                            key={`support-${section.key}`}
                            className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-[var(--pt-ink)]">
                                {SECTION_TITLES[section.key]}
                              </h4>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${sectionStatusClass(
                                  section.status
                                )}`}
                              >
                                {section.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-[var(--pt-muted)]">
                              {annotateLegalTerms(section.body, `support-body-${section.key}`)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  )}

                  <p className="text-xs text-[var(--pt-muted)]">
                    Results are typically available for about {retentionDays} days and may expire
                    automatically.
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-3 text-xl text-[var(--pt-ink)]">
              {activeBasicTab === "summary" ? "Summary" : "Supporting Details"}
            </h2>
            <div className="space-y-3">
              {activeBasicTab === "summary" ? (
                <article className="pt-card-soft p-3 text-sm text-[var(--pt-muted)]">
                  {annotateLegalTerms(data.overview, "basic-overview")}
                </article>
              ) : (
                supportingSections.map((section) => (
                  <article key={section.key} className="pt-card-soft p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--pt-ink)]">
                        {SECTION_TITLES[section.key]}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${sectionStatusClass(
                          section.status
                        )}`}
                      >
                        {section.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--pt-muted)]">
                      {annotateLegalTerms(section.body, `basic-section-${section.key}`)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
