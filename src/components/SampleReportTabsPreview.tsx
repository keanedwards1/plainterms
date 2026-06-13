"use client";

import { useState } from "react";
import Image from "next/image";
import UpgradeModal, { type CheckoutProcessing } from "@/components/UpgradeModal";
import ReportSidebar from "@/components/result/ReportSidebar";
import QuickReadout from "@/components/result/QuickReadout";
import ContractHealthSnapshot from "@/components/result/ContractHealthSnapshot";
import { type ReportTierOption } from "@/lib/pricingOptions";

// ─── Static sample data ────────────────────────────────────────────────────────

const SAMPLE = {
  risk: { score: 68, label: "high" as const },
  recommendation: { label: "Negotiate before signing", reason: "Several clauses shift risk toward you. Push on the licensing and payment terms first." },
  flags: [
    { id: "f1", title: "Perpetual content license", severity: "high" as const, plain_note: "Grants the brand indefinite reuse of your content with no end date or renewal gate. This can block future exclusivity deals." },
    { id: "f2", title: "Unilateral termination right", severity: "high" as const, plain_note: "The brand can end the agreement with 7 days notice; you need 30. This imbalance puts you at risk of abrupt cancellation mid-project." },
    { id: "f3", title: "Late payment protection missing", severity: "medium" as const, plain_note: "No interest, late fee, or net-term language to enforce on-time payment. Slower collections, weaker enforcement." },
    { id: "f4", title: "Termination notice imbalance", severity: "low" as const, plain_note: "Counterparty can exit on shorter notice than you can, limiting your ability to plan ahead." },
  ],
  clauses: [
    { key: "payment",       title: "Payment Schedule",            status: "present"  as const, what_it_means: "Sets out when and how you get paid for your work.",                                                      why_it_matters: "Confirm net terms and what triggers payment (delivery vs. acceptance).",                                        evidence: "\"Payment shall be made within 30 days of content delivery and written acceptance.\"" },
    { key: "ip",            title: "Content Usage Rights",        status: "unclear"  as const, what_it_means: "Defines who can use the content, for how long, and in which channels.",                                  why_it_matters: "Watch for perpetual or irrevocable language — it removes your ability to re-license later.",                    evidence: "\"Brand may use content across all channels now known or later developed.\"" },
    { key: "termination",   title: "Termination for Convenience", status: "unclear"  as const, what_it_means: "Either party can end the agreement without cause, subject to notice.",                                   why_it_matters: "Notice periods are asymmetric — you have less runway to respond than the brand does.",                          evidence: "\"Brand may terminate with 7 days notice; Creator requires 30 days.\"" },
    { key: "confidential",  title: "Confidentiality",             status: "present"  as const, what_it_means: "Both parties agree to keep deal terms and sensitive information private.",                                why_it_matters: "Check whether it survives termination and how long the obligation runs.",                                        evidence: null },
    { key: "indemnity",     title: "Indemnification",             status: "unclear"  as const, what_it_means: "Allocates who covers legal costs if a third-party claim arises.",                                        why_it_matters: "Current language is one-sided — you cover the brand's costs for a wide range of claims.",                       evidence: "\"Creator shall indemnify Brand against all third-party claims arising from the Content.\"" },
    { key: "liability",     title: "Limitation of Liability",     status: "missing"  as const, what_it_means: "Caps how much either party owes the other if something goes wrong.",                                     why_it_matters: "Without a cap, your exposure is theoretically unlimited. Add a mutual cap tied to contract value.",             evidence: null },
    { key: "exclusivity",   title: "Exclusivity Clause",          status: "missing"  as const, what_it_means: "Restricts whether you can work with competing brands during or after the contract.",                     why_it_matters: "No explicit clause, but the perpetual license effectively creates hidden exclusivity.",                         evidence: null },
    { key: "deliverables",  title: "Deliverables & Revisions",    status: "present"  as const, what_it_means: "Specifies what you are creating, in what format, and how many rounds of feedback are included.",         why_it_matters: "Ensure unlimited revision requests are excluded, or a round cap is specified.",                                  evidence: null },
    { key: "governing",     title: "Governing Law",               status: "present"  as const, what_it_means: "Sets which jurisdiction's laws apply to disputes.",                                                      why_it_matters: "Confirm it is your jurisdiction, or a neutral one — not solely the brand's.",                                   evidence: null },
  ],
  questions: [
    "Can we cap the content license to 90 days with an opt-in renewal in writing?",
    "Will you add net-15 payment terms with a late fee after 30 days?",
    "Can indemnification be limited to claims arising from each party's own breach?",
  ],
  wordCount: 1840,
  fileName: "brand-partnership-agreement.pdf",
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

const TAB_UNLOCK: Record<TabKey, { title: string; description: string }> = {
  summary:   { title: "Get your own full summary",              description: "See your contract's complete risk readout, recommendation, and every next step to take." },
  insights:  { title: "Unlock cross-tab insights",              description: "Connect risk posture, clause clarity, and evidence coverage for your own agreement." },
  flags:     { title: "Unlock all red flags",                   description: "Every flag with plain-English notes specific to your contract." },
  terms:     { title: "Unlock the full clause breakdown",       description: "Clause-by-clause status for present, unclear, and missing terms before you sign." },
  questions: { title: "Unlock negotiation questions",           description: "Practical, ready-to-send questions tailored to your contract's risk areas." },
  document:  { title: "Unlock document review",                description: "Your contract's source text with risk areas highlighted and suggested rewrites." },
  full:      { title: "Unlock the full evidence-backed report", description: "Complete context with source-backed notes for stronger negotiation." },
};

const LOCAL_STORAGE_REPORT_TIER_KEY = "pt.reportTier";
const REDIRECT_STEPS = ["Saving your selection", "Opening secure upload"];

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

function LockedTease({ children, onUnlock }: { children: React.ReactNode; onUnlock: () => void }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[2px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_94%)]">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-2">
        <button
          type="button"
          onClick={onUnlock}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pt-border)] bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--pt-ink)] shadow-sm transition-colors hover:border-[var(--pt-accent)] hover:text-[var(--pt-accent)]"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
            <path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Locked — choose a plan to unlock
        </button>
      </div>
    </div>
  );
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
          {["Cap usage license to 90 days with opt-in written renewal.", "Add net-15 payment terms plus late-fee language.", "Request mutual indemnification limited to each party's own breach."].map((item) => (
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
              { title: "Summary Insights",    meta: "Top action",            body: "Primary next step: Cap usage license to 90 days with opt-in written renewal." },
              { title: "Key Terms Insights",  meta: `${UNCLEAR_COUNT + MISSING_COUNT}`, body: "Content Usage Rights · Indemnification · Limitation of Liability" },
              { title: "Questions Insights",  meta: `${SAMPLE.questions.length}`,       body: SAMPLE.questions[0] },
              { title: "Red Flag Insights",   meta: `${HIGH_COUNT}`,                    body: "Perpetual content license · Unilateral termination right" },
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
          <p className="mt-1 text-sm text-[var(--pt-muted)]">Before you sign, bring these questions to the brand or agency. Ask them in a call or use the email draft below to send in writing.</p>
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
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--pt-border)] bg-white/90 px-3 py-1 text-[11px] font-semibold text-[var(--pt-muted)]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5"><path d="M5 7V5.2a3 3 0 0 1 6 0V7m-7 0h8v6H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Locked — choose a plan
          </span>
        </article>
      </div>
    </LockedTease>
  );
}

function DocumentTab({ onUnlock }: TabProps) {
  return (
    <LockedTease onUnlock={onUnlock}>
      <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--pt-ink)]">{SAMPLE.fileName}</p>
            <p className="text-xs text-[var(--pt-muted)]">{SAMPLE.wordCount} words · application/pdf</p>
          </div>
          <div className="flex items-center rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-[3px]">
            {["Original", "Track Changes", "Revised"].map((label, i) => (
              <span key={label} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${i === 0 ? "bg-white text-[var(--pt-ink)] shadow-sm" : "text-[var(--pt-muted)]"}`}>{label}</span>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--pt-border)] bg-[#f7f4ef] px-4 py-5 font-serif text-[15px] leading-[1.85] text-[#252830]">
          <p>
            The Creator hereby grants the Brand a{" "}
            <span className="rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]">perpetual, irrevocable</span>{" "}
            license to use, reproduce, and modify the Content across all media now known or later developed.
          </p>
          <p className="mt-4">
            Payment shall be made{" "}
            <span className="rounded-[2px] bg-[#fff4df] px-[1px] text-[#8c6526]">within 30 days</span>{" "}
            of content delivery and written acceptance by the Brand.
          </p>
          <p className="mt-4">
            Either party may terminate this agreement upon{" "}
            <span className="rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]">7 days written notice</span>{" "}
            (Brand) or 30 days written notice (Creator), without cause.
          </p>
        </div>
      </article>
    </LockedTease>
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

  function chooseTier(tier: ReportTierOption) {
    try { window.localStorage.setItem(LOCAL_STORAGE_REPORT_TIER_KEY, tier); } catch { /* ignore */ }
    setProcessing({ tier, stepNames: REDIRECT_STEPS, stepIndex: 0, stepLabel: REDIRECT_STEPS[0], stepDescription: "Carrying your plan choice to the secure upload page." });
    window.setTimeout(() => {
      setProcessing({ tier, stepNames: REDIRECT_STEPS, stepIndex: 1, stepLabel: REDIRECT_STEPS[1], stepDescription: "Upload your contract to generate a real, private analysis." });
      window.setTimeout(() => { window.location.assign("/analyze"); }, 450);
    }, 500);
  }

  const unlock = TAB_UNLOCK[activeTab];

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
            {activeTab === "document"  && <DocumentTab onUnlock={() => setModalOpen(true)} />}
            {activeTab === "full"      && <FullTab onUnlock={() => setModalOpen(true)} />}
          </div>
        </section>
      </section>

      <UpgradeModal
        open={modalOpen}
        featureTitle={unlock.title}
        featureDescription={unlock.description}
        ctaPrefix="Get started with"
        processing={processing}
        onSelectTier={chooseTier}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
