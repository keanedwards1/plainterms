"use client";

import { useState } from "react";
import Image from "next/image";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import ReportSidebar from "@/components/result/ReportSidebar";
import QuickReadout from "@/components/result/QuickReadout";
import ContractHealthSnapshot from "@/components/result/ContractHealthSnapshot";
import { REPORT_TIER_NAMES, type ReportTierOption } from "@/lib/pricingOptions";
import { getOrCreateFunnelId } from "@/lib/funnelMetrics";
import {
  ContractSubmitError,
  PAID_STEP_ORDER,
  stepLabel,
  submitContract,
  SUBMIT_STEP_DESCRIPTIONS,
  type SubmitStep,
} from "@/lib/contractSubmit";

// ─── Static sample data ────────────────────────────────────────────────────────

const SAMPLE = {
  risk: { score: 73, label: "high" as const },
  recommendation: { label: "Negotiate before signing", reason: "Several clauses shift risk toward you. Push on the deposit, lien protection, and completion terms first." },
  flags: [
    { id: "f1", title: "Oversized 50% upfront deposit", severity: "high" as const, plain_note: "Half the contract price is due before any work begins. Many states discourage deposits this large, and paying well ahead of completed work risks your money if the job stalls or is abandoned." },
    { id: "f2", title: "No lien waivers required", severity: "high" as const, plain_note: "The contract relies on subcontractors and suppliers but never requires lien waivers. You could pay your contractor in full and still face a lien on your home from someone they failed to pay." },
    { id: "f3", title: "Change orders lack written approval", severity: "medium" as const, plain_note: "Change-order language does not clearly require your written sign-off on added scope and price before the work proceeds, leaving the budget open-ended." },
    { id: "f4", title: "No firm completion date", severity: "low" as const, plain_note: "The agreement sets a start date but no substantial-completion deadline, so there is little holding the contractor to a schedule." },
  ],
  clauses: [
    { key: "deposit",       title: "Deposit & Payment Schedule",     status: "present"  as const, what_it_means: "Sets how much you pay upfront and how the remaining payments are released as work progresses.",       why_it_matters: "A 50% deposit is large — tie payments to completed, inspected milestones instead of the calendar.",            evidence: "\"Owner shall pay a deposit of fifty percent (50%) of the contract price upon execution.\"" },
    { key: "liens",         title: "Mechanics Liens & Lien Waivers", status: "missing"  as const, what_it_means: "Protects you from claims against your home by subcontractors or suppliers the contractor fails to pay.", why_it_matters: "No lien-waiver requirement appears anywhere — add signed waivers as a condition of each payment.",            evidence: null },
    { key: "change_orders", title: "Change Orders",                  status: "unclear"  as const, what_it_means: "Defines how changes to the work are priced, documented, and approved once the project is underway.",     why_it_matters: "Does not clearly require your written approval before extra work and cost are added.",                          evidence: "\"Contractor may perform additional work as reasonably necessary to complete the project.\"" },
    { key: "timeline",      title: "Completion Timeline & Delays",   status: "unclear"  as const, what_it_means: "Sets when work starts, when it must finish, and what happens if the project runs late.",                why_it_matters: "A start date is given but no firm completion date or remedy for unexcused delay.",                              evidence: "\"Work shall commence on or about the date set forth above.\"" },
    { key: "warranty",      title: "Workmanship Warranty",           status: "present"  as const, what_it_means: "Sets how long the contractor stands behind the work and how post-completion defects are fixed.",        why_it_matters: "Confirm the warranty period and a clear punch-list process at substantial completion.",                        evidence: "\"Contractor warrants its workmanship for a period of one (1) year from completion.\"" },
    { key: "permits",       title: "Permits & Inspections",          status: "unclear"  as const, what_it_means: "Sets who is responsible for pulling permits and passing required inspections.",                       why_it_matters: "Language is ambiguous about whether you or the contractor must obtain permits — clarify it in writing.",        evidence: null },
    { key: "allowances",    title: "Allowances",                     status: "missing"  as const, what_it_means: "Budget placeholders for items like fixtures, flooring, and finishes selected later.",                  why_it_matters: "No allowance amounts or overage cap, so final costs can exceed the budget without your approval.",             evidence: null },
    { key: "indemnity",     title: "Indemnification",                status: "unclear"  as const, what_it_means: "Allocates who covers legal costs if a third-party claim arises from the work.",                       why_it_matters: "Current language appears one-sided — you may cover the contractor's costs for a wide range of claims.",         evidence: "\"Owner shall indemnify Contractor against all claims arising from the work.\"" },
    { key: "disputes",      title: "Disputes & Governing Law",       status: "present"  as const, what_it_means: "Sets which jurisdiction's laws apply and how disputes are resolved.",                                why_it_matters: "Note the mandatory-arbitration clause — it limits how you can pursue a dispute.",                              evidence: "\"Any dispute shall be resolved by binding arbitration.\"" },
  ],
  questions: [
    "Can we lower the deposit to 10% and tie the remaining payments to completed, inspected milestones?",
    "Will you provide signed lien waivers from every subcontractor and supplier before each payment?",
    "Can we add a firm substantial-completion date with a fair credit for unexcused delays?",
  ],
  wordCount: 2120,
  fileName: "home-renovation-contract.pdf",
};

const PRESENT_COUNT = SAMPLE.clauses.filter((c) => c.status === "present").length;
const UNCLEAR_COUNT = SAMPLE.clauses.filter((c) => c.status === "unclear").length;
const MISSING_COUNT = SAMPLE.clauses.filter((c) => c.status === "missing").length;
const TOTAL_COUNT   = SAMPLE.clauses.length;
const HIGH_COUNT    = SAMPLE.flags.filter((f) => f.severity === "high").length;
const MEDIUM_COUNT  = SAMPLE.flags.filter((f) => f.severity === "medium").length;
const LOW_COUNT     = SAMPLE.flags.filter((f) => f.severity === "low").length;
const CLAUSE_COV_PCT  = Math.round((PRESENT_COUNT / TOTAL_COUNT) * 100);
const EVIDENCE_COUNT  = SAMPLE.clauses.filter((c) => c.evidence).length;
const EVIDENCE_PCT    = Math.round((EVIDENCE_COUNT / TOTAL_COUNT) * 100);

type TabKey = "summary" | "insights" | "flags" | "terms" | "questions" | "document" | "full";

const TABS: { key: TabKey; label: string; icon: string; count?: number | "all" }[] = [
  { key: "summary",   label: "Summary",     icon: "/window.svg" },
  { key: "insights",  label: "Insights",    icon: "/graphics/icon-search.svg" },
  { key: "flags",     label: "Red Flags",   icon: "/graphics/icon-shield.svg", count: SAMPLE.flags.length },
  { key: "terms",     label: "Key Terms",   icon: "/file.svg",                 count: TOTAL_COUNT },
  { key: "questions", label: "Questions",   icon: "/globe.svg",                count: SAMPLE.questions.length },
  { key: "document",  label: "Document",    icon: "/graphics/icon-doc.svg" },
  { key: "full",      label: "Full Report", icon: "/graphics/icon-doc.svg",    count: "all" },
];

const LOCAL_STORAGE_REPORT_TIER_KEY = "pt.reportTier";

function toProcessing(tier: ReportTierOption, step: SubmitStep): CheckoutProcessing {
  return {
    tier,
    stepNames: PAID_STEP_ORDER.map(stepLabel),
    stepIndex: PAID_STEP_ORDER.indexOf(step),
    stepLabel: stepLabel(step),
    stepDescription: SUBMIT_STEP_DESCRIPTIONS[step],
  };
}

function severityClass(s: "high" | "medium" | "low") {
  if (s === "high")   return "bg-[#ffe8e3] text-[#9e3f2d]";
  if (s === "medium") return "bg-[#fff4df] text-[#8c6526]";
  return "bg-[#e1f4ef] text-[#1d655f]";
}

function statusClass(s: "present" | "unclear" | "missing") {
  if (s === "present") return "bg-[#e1f4ef] text-[#1d655f]";
  if (s === "unclear") return "bg-[#fff4df] text-[#8c6526]";
  return "bg-[#ffe8e3] text-[#9e3f2d]";
}

// The sample report is shown in full (nothing locked) so prospects see exactly
// what a real report looks like. This wrapper is now a passthrough; it keeps the
// onUnlock prop only so the tab components don't need signature changes.
function LockedTease({ children }: { children: React.ReactNode; onUnlock: () => void }) {
  return <>{children}</>;
}

// ─── Tab content — each mirrors the corresponding ResultWorkspace tab layout ──

type TabProps = { onUnlock: () => void };

function SummaryTab() {
  return (
    <div className="space-y-3">
      <QuickReadout riskScore={SAMPLE.risk.score} recommendationLabel={SAMPLE.recommendation.label} flagsFound={SAMPLE.flags.length} />
      <ContractHealthSnapshot riskScore={SAMPLE.risk.score} clearClauseCount={PRESENT_COUNT} totalClauseCount={TOTAL_COUNT} />
      <article className="pt-card-soft p-3">
        <h3 className="text-lg font-semibold text-[var(--pt-ink)]">Top Next Steps</h3>
        <ul className="mt-2 space-y-2">
          {["Lower the upfront deposit and tie payments to completed milestones.", "Require lien waivers from the contractor and every subcontractor.", "Add a firm completion date with a fair remedy for delays."].map((item) => (
            <li key={item} className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2 text-[15px] leading-6 text-[var(--pt-ink)]/90">{item}</li>
          ))}
        </ul>
      </article>
      <article className="pt-card-soft p-3">
        <h3 className="text-lg font-semibold text-[var(--pt-ink)]">Top Flags Preview</h3>
        <ul className="mt-2 space-y-2">
          {SAMPLE.flags.slice(0, 3).map((flag) => (
            <li key={flag.id} className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-[var(--pt-ink)]">{flag.title}</p>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${severityClass(flag.severity)}`}>{flag.severity}</span>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function InsightsTab({ onUnlock }: TabProps) {
  return (
    <LockedTease onUnlock={onUnlock}>
      <div className="space-y-3">
        <article className="rounded-lg border border-[#e9d3b0] bg-gradient-to-r from-[#fff6ea] via-[#fff9f2] to-[#ffeed8] p-4">
          <div className="flex items-center gap-2">
            <Image src="/graphics/icon-search.svg" alt="" width={22} height={22} className="h-5 w-5 rounded-md border border-[#c9d7f7] bg-white p-1" />
            <p className="text-sm font-semibold text-[#344167]">Key Takeaways</p>
          </div>
          <p className="mt-1 text-sm text-[#4c5a86]">A connected view of the risks, clause gaps, evidence, and questions that matter most from this analysis.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {[
              { label: "Risk posture",       value: SAMPLE.risk.label },
              { label: "Clause clarity",     value: `${CLAUSE_COV_PCT}%` },
              { label: "Question readiness", value: SAMPLE.questions.length },
              { label: "Evidence coverage",  value: `${EVIDENCE_PCT}%` },
            ].map((m) => (
              <div key={m.label} className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                <p className="text-xs text-[#54629b]">{m.label}</p>
                <p className="text-lg font-semibold text-[#374175]">{m.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
          <p className="text-base font-semibold text-[var(--pt-ink)]">Signal Matrix</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Summary + Flags</p>
              <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/85">Recommendation is &ldquo;Negotiate before signing&rdquo;. Resolve {HIGH_COUNT + MEDIUM_COUNT} priority risks before signing.</p>
              <div className="mt-2 h-2 rounded-full bg-[#f4d7ce]">
                <div className="h-2 rounded-full bg-[#de8f79]" style={{ width: `${((HIGH_COUNT + MEDIUM_COUNT) / SAMPLE.flags.length) * 100}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Terms + Full Report</p>
              <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/85">{UNCLEAR_COUNT + MISSING_COUNT} clauses need verification. Review clause evidence before final decisions.</p>
              <div className="mt-2 h-2 rounded-full bg-[#e6ecfc]">
                <div className="h-2 rounded-full bg-[#5d73c8]" style={{ width: `${EVIDENCE_PCT}%` }} />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-[var(--pt-ink)]">Interactive Drilldown</p>
            <span className="text-xs text-[var(--pt-muted)]">Per-tab view, condensed</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { title: "Summary Insights",    meta: "Top action",            body: "Primary next step: Lower the deposit and tie payments to completed, inspected milestones." },
              { title: "Key Terms Insights",  meta: `${UNCLEAR_COUNT + MISSING_COUNT}`, body: "Mechanics Liens · Change Orders · Completion Timeline" },
              { title: "Questions Insights",  meta: `${SAMPLE.questions.length}`,       body: SAMPLE.questions[0] },
              { title: "Red Flag Insights",   meta: `${HIGH_COUNT}`,                    body: "Oversized 50% deposit · No lien waivers required" },
            ].map((panel) => (
              <details key={panel.title} className="rounded-xl border border-[var(--pt-border)] bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">{panel.title}</span>
                  <span className="ml-auto mr-2 rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--pt-muted)]">{panel.meta}</span>
                  <svg className="h-4 w-4 shrink-0 text-[var(--pt-muted)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </summary>
                <div className="border-t border-[var(--pt-border)] px-3 py-2.5 text-sm text-[var(--pt-ink)]/85">{panel.body}</div>
              </details>
            ))}
          </div>
        </article>
      </div>
    </LockedTease>
  );
}

function FlagsTab({ onUnlock }: TabProps) {
  return (
    <LockedTease onUnlock={onUnlock}>
      <div className="space-y-3">
        <article className="rounded-lg border border-[#efc1b6] bg-gradient-to-r from-[#fff3ef] via-[#fff8f5] to-[#fffdfc] p-3">
          <div className="flex items-center gap-2">
            <Image src="/graphics/icon-shield.svg" alt="" width={24} height={24} className="h-6 w-6 rounded-md border border-[#efc1b6] bg-white p-1" />
            <p className="text-sm font-semibold text-[#7f2e1f]">Red Flag Review</p>
          </div>
          <p className="mt-1 text-sm text-[#7f2e1f]/80">Each item below includes what was found and why it matters.</p>
        </article>

        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Flag Severity Mix</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-[#efc1b6] bg-[#ffe8e3] px-3 py-2"><p className="text-xs text-[#9e3f2d]">High</p><p className="text-lg font-semibold text-[#7f2e1f]">{HIGH_COUNT}</p></div>
            <div className="rounded-md border border-[#ead3a1] bg-[#fff4df] px-3 py-2"><p className="text-xs text-[#8c6526]">Medium</p><p className="text-lg font-semibold text-[#6e4f1e]">{MEDIUM_COUNT}</p></div>
            <div className="rounded-md border border-[#b2ddd4] bg-[#e1f4ef] px-3 py-2"><p className="text-xs text-[#1d655f]">Low</p><p className="text-lg font-semibold text-[#154f4a]">{LOW_COUNT}</p></div>
          </div>
          <div className="mt-3 overflow-hidden rounded-full border border-[var(--pt-border)] bg-white">
            <div className="flex h-2">
              <div className="bg-[#e7745c]" style={{ width: `${(HIGH_COUNT / SAMPLE.flags.length) * 100}%` }} />
              <div className="bg-[#d8a84b]" style={{ width: `${(MEDIUM_COUNT / SAMPLE.flags.length) * 100}%` }} />
              <div className="bg-[#2ba59f]" style={{ width: `${(LOW_COUNT / SAMPLE.flags.length) * 100}%` }} />
            </div>
          </div>
        </article>

        {SAMPLE.flags.map((flag) => (
          <article key={flag.id} className="pt-card-soft p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-[var(--pt-ink)]">{flag.title}</p>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${severityClass(flag.severity)}`}>{flag.severity}</span>
            </div>
            <p className="mt-2 text-[15px] leading-6 text-[var(--pt-ink)]/85">{flag.plain_note}</p>
          </article>
        ))}
      </div>
    </LockedTease>
  );
}

function TermsTab({ onUnlock }: TabProps) {
  return (
    <LockedTease onUnlock={onUnlock}>
      <div className="space-y-3">
        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Term Coverage Snapshot</p>
          <div className="mt-3 grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="mx-auto flex flex-col items-center gap-1.5">
              <div className="relative h-22 w-22">
                <svg className="-rotate-90 h-full w-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#e8e0d4" strokeWidth="3.4" />
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#2ba59f" strokeWidth="3.4"
                    strokeDasharray={`${(PRESENT_COUNT / TOTAL_COUNT) * 100} ${100 - (PRESENT_COUNT / TOTAL_COUNT) * 100}`} strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#d8a84b" strokeWidth="3.4"
                    strokeDasharray={`${(UNCLEAR_COUNT / TOTAL_COUNT) * 100} ${100 - (UNCLEAR_COUNT / TOTAL_COUNT) * 100}`}
                    strokeDashoffset={`${-(PRESENT_COUNT / TOTAL_COUNT) * 100}`} />
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#e7745c" strokeWidth="3.4"
                    strokeDasharray={`${(MISSING_COUNT / TOTAL_COUNT) * 100} ${100 - (MISSING_COUNT / TOTAL_COUNT) * 100}`}
                    strokeDashoffset={`${-((PRESENT_COUNT + UNCLEAR_COUNT) / TOTAL_COUNT) * 100}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none text-[var(--pt-ink)]">{TOTAL_COUNT}</span>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--pt-muted)]">Total clauses</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-[#b2ddd4] bg-[#e1f4ef] px-3 py-2.5"><p className="text-xs text-[#1d655f]">Present</p><p className="text-xl font-semibold leading-tight text-[#154f4a]">{PRESENT_COUNT}</p></div>
              <div className="rounded-md border border-[#ead3a1] bg-[#fff4df] px-3 py-2.5"><p className="text-xs text-[#8c6526]">Unclear</p><p className="text-xl font-semibold leading-tight text-[#6e4f1e]">{UNCLEAR_COUNT}</p></div>
              <div className="rounded-md border border-[#efc1b6] bg-[#ffe8e3] px-3 py-2.5"><p className="text-xs text-[#9e3f2d]">Missing</p><p className="text-xl font-semibold leading-tight text-[#7f2e1f]">{MISSING_COUNT}</p></div>
            </div>
          </div>
        </article>

        {SAMPLE.clauses.map((clause) => (
          <article key={clause.key} className="pt-card-soft p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-[var(--pt-ink)]">{clause.title}</p>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(clause.status)}`}>{clause.status}</span>
            </div>
            <p className="mt-2 text-[15px] leading-6 text-[var(--pt-ink)]/85">{clause.what_it_means}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/75"><strong className="text-[var(--pt-ink)]">Watch for:</strong> {clause.why_it_matters}</p>
          </article>
        ))}
      </div>
    </LockedTease>
  );
}

function QuestionsTab({ onUnlock }: TabProps) {
  return (
    <LockedTease onUnlock={onUnlock}>
      <div className="space-y-3">
        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Questions to raise with the other party</p>
          <p className="mt-1 text-sm text-[var(--pt-muted)]">Before you sign, bring these questions to your contractor. Ask them in a call or use the email draft below to send in writing.</p>
        </article>

        <div className="space-y-2">
          {SAMPLE.questions.map((q, idx) => (
            <details key={idx} className="group rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)]">
              <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-[11px] font-bold text-[var(--pt-muted)]">{idx + 1}</span>
                <span className="flex-1 text-[15px] leading-6 text-[var(--pt-ink)]">{q}</span>
                <svg className="mt-1 h-4 w-4 shrink-0 text-[var(--pt-muted)] transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="border-t border-[var(--pt-border)] px-4 py-3 pl-12">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Why ask this</p>
                <p className="mt-1 text-sm text-[var(--pt-muted)]">This question helps clarify a term or gap identified in the contract. Their answer will tell you whether the agreement matches what was discussed verbally.</p>
              </div>
            </details>
          ))}
        </div>

        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Send these questions by email</p>
          <p className="mt-1 text-sm text-[var(--pt-muted)]">Generate a ready-to-send email covering the questions above and your key negotiation points.</p>
          <button
            type="button"
            onClick={onUnlock}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--pt-ink)] hover:border-[var(--pt-accent)]"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4"><path d="M2.5 4.5h11v7h-11z M2.5 4.5l5.5 4 5.5-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Generate negotiation email
          </button>
        </article>
      </div>
    </LockedTease>
  );
}

const SAMPLE_DOC_CHANGES = [
  {
    severity: "high" as const,
    reason: "Reduces an oversized deposit and ties payment to verified progress.",
    before: "Owner shall pay a deposit of fifty percent (50%) of the contract price upon execution, with the balance due upon completion.",
    after: "Owner shall pay a deposit of ten percent (10%) upon signing, with the balance paid against completed, inspected milestones and a 10% retainage held until punch-list completion.",
  },
  {
    severity: "high" as const,
    reason: "Requires your written approval before any extra cost is added.",
    before: "Contractor may perform additional work as reasonably necessary to complete the project, billed at Contractor's standard rates.",
    after: "No additional work or cost is owed unless set out in a written change order signed by the Owner before that work begins.",
  },
  {
    severity: "medium" as const,
    reason: "Adds a firm deadline and a remedy for unexcused delay.",
    before: "Work shall commence on or about the date set forth above; no completion date is specified.",
    after: "Contractor shall reach substantial completion by a firm date set in this Agreement, with a per-day credit to the Owner for unexcused delay.",
  },
];

const SAMPLE_SEVERITY_CLASS = {
  high: "bg-[#ffe8e3] text-[#9e3f2d] border-[#efc1b6]",
  medium: "bg-[#fff4df] text-[#8c6526] border-[#ead3a1]",
  low: "bg-[#e1f4ef] text-[#1d655f] border-[#b2ddd4]",
};

function DocumentTab() {
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--pt-ink)]">{SAMPLE.fileName}</p>
            <p className="text-xs text-[var(--pt-muted)]">{SAMPLE.wordCount} words · application/pdf</p>
          </div>
          <div className="flex items-center rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-[3px]">
            {["Original", "Track Changes", "Revised"].map((label) => (
              <span
                key={label}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${label === "Track Changes" ? "bg-white text-[var(--pt-ink)] shadow-sm" : "text-[var(--pt-muted)]"}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--pt-muted)]">
          <del className="rounded-[2px] bg-[#fde8e5] px-1.5 py-0.5 text-[#9e3f2d] line-through no-underline">removed</del>
          <ins className="rounded-[2px] bg-[#e8f5ee] px-1.5 py-0.5 text-[#1d655f] underline no-underline">inserted</ins>
          <span>3 tracked changes · hover for reason</span>
        </div>
      </article>

      {/* Document paper */}
      <article className="relative overflow-hidden rounded-lg border border-[var(--pt-border)] shadow-sm">
        <div className="max-h-[580px] overflow-auto bg-[#f0ede8] px-3 py-6 sm:px-10">
          <div
            className="mx-auto max-w-[680px] rounded-sm bg-white px-8 py-10 text-[15px] leading-[1.85] tracking-[0.003em] text-[#252830] shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)] whitespace-pre-wrap select-text"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <p>
              3. Deposit and Payment Schedule. Owner shall pay a deposit of{" "}
              <span className="rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]" style={{ textDecoration: "line-through" }}>fifty percent (50%) of the contract price upon execution, with the balance due upon completion.</span>
              <span className="ml-[2px] rounded-[2px] bg-[#e8f5ee] px-[1px] text-[#1d655f]" style={{ textDecoration: "underline", textDecorationColor: "rgba(29,101,95,0.5)" }}>ten percent (10%) upon signing, with the balance paid against completed, inspected milestones and a 10% retainage held until punch-list completion.</span>
            </p>
            <p className="mt-6">
              5. Change Orders.{" "}
              <span className="rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]" style={{ textDecoration: "line-through" }}>Contractor may perform additional work as reasonably necessary to complete the project, billed at Contractor&apos;s standard rates.</span>
              <span className="ml-[2px] rounded-[2px] bg-[#e8f5ee] px-[1px] text-[#1d655f]" style={{ textDecoration: "underline", textDecorationColor: "rgba(29,101,95,0.5)" }}>No additional work or cost is owed unless set out in a written change order signed by the Owner before that work begins.</span>
            </p>
            <p className="mt-6">
              6. Schedule. Work shall commence on or about the date set forth above;{" "}
              <span className="rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]" style={{ textDecoration: "line-through" }}>no completion date is specified.</span>
              <span className="ml-[2px] rounded-[2px] bg-[#e8f5ee] px-[1px] text-[#1d655f]" style={{ textDecoration: "underline", textDecorationColor: "rgba(29,101,95,0.5)" }}>Contractor shall reach substantial completion by a firm date set in this Agreement, with a per-day credit to the Owner for unexcused delay.</span>
            </p>
          </div>
        </div>
      </article>

      {/* Suggested Changes */}
      <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Suggested Changes</p>
          <div className="flex gap-1.5 text-[11px]">
            <span className="rounded-full border border-[#efc1b6] bg-[#ffe8e3] px-2 py-0.5 text-[#9e3f2d]">2 high</span>
            <span className="rounded-full border border-[#ead3a1] bg-[#fff4df] px-2 py-0.5 text-[#8c6526]">1 medium</span>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {SAMPLE_DOC_CHANGES.map((change, idx) => (
            <li key={idx} className="rounded-lg border border-[var(--pt-border)] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SAMPLE_SEVERITY_CLASS[change.severity]}`}>{change.severity}</span>
                <span className="text-xs text-[var(--pt-muted)]">{change.reason}</span>
              </div>
              <div className="mt-2 grid gap-1.5 text-[13px] sm:grid-cols-2">
                <div className="rounded-md border border-[#f5c6c0] bg-[#fff0ee] px-2.5 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9e3f2d]">Was</p>
                  <p className="text-[#7f2e1f]">{change.before}</p>
                </div>
                <div className="rounded-md border border-[#a8ddd0] bg-[#edf8f5] px-2.5 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#1d655f]">Now</p>
                  <p className="text-[#165a52]">{change.after}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function FullTab({ onUnlock }: TabProps) {
  return (
    <LockedTease onUnlock={onUnlock}>
      <div className="space-y-3">
        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
          <div className="flex items-center gap-2">
            <Image src="/graphics/icon-doc.svg" alt="" width={24} height={24} className="h-6 w-6 rounded-md border border-[var(--pt-border)] bg-white p-1" />
            <p className="text-sm font-semibold text-[var(--pt-ink)]">Complete Clause View</p>
          </div>
          <p className="mt-1 text-sm text-[var(--pt-ink)]/80">All detected clauses with plain-English meaning and evidence snippets.</p>
        </article>

        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Report Composition</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2"><p className="text-xs text-[#54629b]">Clauses analyzed</p><p className="text-lg font-semibold text-[#374175]">{TOTAL_COUNT}</p></div>
            <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2"><p className="text-xs text-[#54629b]">With evidence</p><p className="text-lg font-semibold text-[#374175]">{EVIDENCE_COUNT}</p></div>
            <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2"><p className="text-xs text-[#54629b]">Supporting notes</p><p className="text-lg font-semibold text-[#374175]">4</p></div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-[#d8dff5] bg-white">
            <div className="h-2 bg-[#5d73c8]" style={{ width: `${EVIDENCE_PCT}%` }} />
          </div>
        </article>

        {SAMPLE.clauses.map((clause) => (
          <article key={`full-${clause.key}`} className="rounded-md border border-[var(--pt-border)] bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[var(--pt-ink)]">{clause.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(clause.status)}`}>{clause.status}</span>
            </div>
            <p className="mt-1 text-[15px] leading-6 text-[var(--pt-ink)]/85">{clause.what_it_means}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/75"><strong className="text-[var(--pt-ink)]">Why it matters:</strong> {clause.why_it_matters}</p>
            {clause.evidence && (
              <blockquote className="mt-2 border-l-2 border-[var(--pt-border)] pl-3 text-xs text-[var(--pt-muted)]">{clause.evidence}</blockquote>
            )}
          </article>
        ))}
      </div>
    </LockedTease>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SampleReportTabsPreview() {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState<CheckoutProcessing | null>(null);
  const [pendingTier, setPendingTier] = useState<ReportTierOption | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Selecting a tier moves the modal into the inline upload step (instead of
  // bouncing to /analyze). The localStorage write keeps the /analyze fallback
  // pre-selected if the user prefers the full upload page.
  function chooseTier(tier: ReportTierOption) {
    try { window.localStorage.setItem(LOCAL_STORAGE_REPORT_TIER_KEY, tier); } catch { /* ignore */ }
    setUploadError(null);
    setUploadFile(null);
    setPendingTier(tier);
  }

  async function startUpload() {
    if (!pendingTier || !uploadFile) return;
    setUploadError(null);
    try {
      const outcome = await submitContract({
        file: uploadFile,
        reviewChoice: pendingTier,
        funnelId: getOrCreateFunnelId(),
        onStep: (step) => setProcessing(toProcessing(pendingTier, step)),
      });
      window.location.assign(outcome.url);
    } catch (err) {
      setProcessing(null);
      setUploadError(
        err instanceof ContractSubmitError
          ? `${stepLabel(err.step)}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Unknown error",
      );
    }
  }

  function closeModal() {
    if (processing) return;
    setModalOpen(false);
    setPendingTier(null);
    setUploadFile(null);
    setUploadError(null);
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ReportSidebar
          tabs={TABS}
          activeKey={activeTab}
          onSelectTab={(key) => setActiveTab(key as TabKey)}
          risk={SAMPLE.risk}
          recommendation={{ label: SAMPLE.recommendation.label, reason: SAMPLE.recommendation.reason, tone: "high" }}
          tabAriaLabel={(label) => `Preview ${label} section`}
          footer={
            <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs text-[var(--pt-muted)]">
              Informational only. Not legal advice.
            </div>
          }
        />

        <section className="pt-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl text-[var(--pt-ink)]">{TABS.find((t) => t.key === activeTab)?.label}</h2>
            <span className="inline-flex items-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pt-muted)]">Sample preview</span>
          </div>
          <p className="mt-1 text-xs text-[var(--pt-muted)]">Sample data. Upload your contract to get a real analysis.</p>
          <div className="mt-3">
            {activeTab === "summary"   && <SummaryTab />}
            {activeTab === "insights"  && <InsightsTab onUnlock={() => setModalOpen(true)} />}
            {activeTab === "flags"     && <FlagsTab onUnlock={() => setModalOpen(true)} />}
            {activeTab === "terms"     && <TermsTab onUnlock={() => setModalOpen(true)} />}
            {activeTab === "questions" && <QuestionsTab onUnlock={() => setModalOpen(true)} />}
            {activeTab === "document"  && <DocumentTab />}
            {activeTab === "full"      && <FullTab onUnlock={() => setModalOpen(true)} />}
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-[var(--pt-ink)]">This is a sample report.</p>
              <p className="mt-0.5 text-sm text-[var(--pt-muted)]">Upload your own contract to get a real, private analysis like this one.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="shrink-0 rounded-lg bg-[var(--pt-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Analyze your contract →
            </button>
          </div>
        </section>
      </section>

      <UpgradeModal
        open={modalOpen}
        featureTitle={pendingTier ? "Upload your contract" : "Analyze your contract"}
        featureDescription={
          pendingTier
            ? "Upload a PDF or DOCX to generate your real, private analysis."
            : "Choose a plan and upload your contract to get a real, private analysis like this sample."
        }
        ctaPrefix="Get started with"
        processing={processing}
        error={uploadError}
        uploadStage={
          pendingTier && !processing
            ? {
                tierName: REPORT_TIER_NAMES[pendingTier],
                file: uploadFile,
                onFileChange: setUploadFile,
                onStart: startUpload,
                onBack: () => {
                  setPendingTier(null);
                  setUploadError(null);
                },
                fallbackHref: "/analyze",
              }
            : null
        }
        onSelectTier={chooseTier}
        onClose={closeModal}
      />
    </>
  );
}
