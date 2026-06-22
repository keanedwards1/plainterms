"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { PtResult as PtResultSchema, SECTION_TITLES, type PtResult } from "@/lib/plainterms-schema";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import ReportSidebar from "@/components/result/ReportSidebar";
import QuickReadout from "@/components/result/QuickReadout";
import ContractHealthSnapshot from "@/components/result/ContractHealthSnapshot";
import { type RiskTone } from "@/lib/reportStyles";
import {
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";
import FeedbackToast from "@/components/FeedbackToast";
import UpgradeModal from "@/components/UpgradeModal";

type ResultWorkspaceProps = {
  data: PtResult;
  retentionDays: number;
  accessKey?: string;
  abVariant?: string;
};

type ReportTab = "summary" | "insights" | "flags" | "terms" | "questions" | "document" | "full";
type BasicTab = "summary" | "supporting" | "document";
type DocumentViewMode = "original" | "tracked" | "revised";
type AddonKey = "rewrite_contract" | "update_email";
type AddonDraft = {
  key: AddonKey;
  title: string;
  content: string;
};
type UpgradePrompt = {
  title: string;
  description: string;
  tiers: ReportTierOption[];
};
type AnnotationSeverity = "low" | "medium" | "high";
type DocumentAnnotation = {
  id: string;
  target: string;
  severity: AnnotationSeverity;
  explanation: string;
  suggestion: string;
};
type TrackedDiff = {
  start: number;
  end: number;
  before: string;
  after: string;
  reason: string;
  severity: AnnotationSeverity;
};

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
      <span key={`${keyPrefix}-${idx}`} className="group/term relative inline">
        <span
          tabIndex={0}
          className="cursor-pointer rounded-[2px] underline decoration-dotted decoration-[var(--pt-ink)] underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pt-ink)]/25"
          aria-label={`${part}: ${definition}`}
        >
          {part}
        </span>
        <span
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-1/2 z-[120] mb-2 w-64 -translate-x-1/2 rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface)] p-2 text-left text-xs leading-5 text-[var(--pt-ink)] opacity-0 shadow-md transition-opacity duration-150 group-hover/term:visible group-hover/term:opacity-100 group-focus-within/term:visible group-focus-within/term:opacity-100"
        >
          {definition}
        </span>
      </span>
    );
  });
}

function actionToTone(action: "sign" | "negotiate" | "do_not_sign_yet"): RiskTone {
  if (action === "do_not_sign_yet") return "high";
  if (action === "negotiate") return "medium";
  return "low";
}

const LEGAL_DISCLAIMER_FOOTER = (
  <div className="mt-5 rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2.5 text-xs text-[var(--pt-muted)]">
    <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--pt-ink)]" style={{ fontSize: "10px" }}>
      Not legal advice
    </p>
    All analysis, risk scores, flags, clause breakdowns, and suggested edits on this page are for informational purposes only and do not constitute legal advice. Review any contract with a qualified attorney before signing.
  </div>
);

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


type DrilldownPanelProps = {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function DrilldownPanel({ title, meta, open, onToggle, children }: DrilldownPanelProps) {
  // The expand/collapse animation (grid-template-rows) requires overflow-hidden
  // to clip cleanly while moving. But that also clips hover tooltips on terms
  // inside the panel. So we only reapply overflow-visible AFTER the open
  // animation settles; on close we clip immediately so the collapse looks right.
  const [overflowVisible, setOverflowVisible] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => setOverflowVisible(true), 320);
    return () => {
      window.clearTimeout(timer);
      setOverflowVisible(false);
    };
  }, [open]);
  // While closed (or mid-animation) we force overflow-hidden so the collapse
  // clips cleanly; overflow-visible is only allowed once open settles.
  const overflowClass = open && overflowVisible ? "overflow-visible" : "overflow-hidden";

  return (
    <div
      className={`relative shrink-0 rounded-lg border border-[var(--pt-border)] bg-white ${
        open ? "z-20" : "z-0"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-[var(--pt-ink)] transition-colors hover:bg-[var(--pt-surface)]"
      >
        <span>{title}</span>
        {meta ? <span className="ml-auto text-xs text-[var(--pt-muted)]">{meta}</span> : null}
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-[var(--pt-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div
        className={`grid ${overflowClass} transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        }`}
      >
        <div className={`min-h-0 ${overflowClass}`}>
          <div
            className={`border-t border-[var(--pt-border)] px-3 py-2 transition-opacity duration-200 ease-out ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

type LockedDisclosureProps = {
  title: string;
  meta?: string;
  description: string;
  onOpen: () => void;
};

function LockedDisclosure({ title, meta, description, onOpen }: LockedDisclosureProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5 text-left transition-colors hover:border-[var(--pt-accent)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--pt-ink)]">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--pt-muted)]">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {meta ? <span className="hidden text-xs text-[var(--pt-muted)] sm:inline">{meta}</span> : null}
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] text-[var(--pt-muted)] transition-colors group-hover:border-[var(--pt-accent)] group-hover:text-[var(--pt-accent)]">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}


function normalizeDocText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function pickMatchingTarget(sourceText: string, candidates: string[]) {
  const normalizedSource = sourceText.toLowerCase();
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeDocText(candidate);
    if (normalizedCandidate.length < 3) continue;
    if (normalizedSource.includes(normalizedCandidate.toLowerCase())) {
      return normalizedCandidate;
    }
  }

  for (const candidate of candidates) {
    const tokens = normalizeDocText(candidate)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length >= 4);
    for (const token of tokens) {
      if (normalizedSource.includes(token.toLowerCase())) {
        return token;
      }
    }
  }

  return "";
}

function pickSeverityFromClauseStatus(status: "present" | "unclear" | "missing"): AnnotationSeverity {
  if (status === "missing") return "high";
  if (status === "unclear") return "medium";
  return "low";
}


function annotationSeverityClass(severity: AnnotationSeverity) {
  if (severity === "high") return "bg-[#ffe8e3] text-[#9e3f2d] border-[#efc1b6]";
  if (severity === "medium") return "bg-[#fff4df] text-[#8c6526] border-[#ead3a1]";
  return "bg-[#e1f4ef] text-[#1d655f] border-[#b2ddd4]";
}

function buildDocumentAnnotations(data: PtResult): DocumentAnnotation[] {
  const annotations: DocumentAnnotation[] = [];
  const seen = new Set<string>();
  const clauses = data.report?.clause_breakdown ?? [];
  const flags = data.report?.red_flags ?? [];
  const sourceText = data.document?.extracted_text ?? "";

  function pushAnnotation(annotation: DocumentAnnotation) {
    const target = normalizeDocText(annotation.target);
    if (target.length < 3) return;
    const key = `${target.toLowerCase()}|${annotation.explanation.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    annotations.push({ ...annotation, target });
  }

  // Only annotate clauses with actual verbatim evidence — no keyword fallbacks
  for (const clause of clauses) {
    if (clause.status === "present") continue;
    const target = clause.evidence?.trim();
    if (!target || target.length < 8) continue;
    pushAnnotation({
      id: `clause-${clause.key}`,
      target,
      severity: pickSeverityFromClauseStatus(clause.status),
      explanation: clause.why_it_matters,
      suggestion:
        clause.status === "missing"
          ? `Add explicit language for "${clause.title}" with clear boundaries and timing.`
          : `Clarify "${clause.title}" with specific measurable terms and approval triggers.`,
    });
  }

  // Only annotate flags when related_fields contains actual document text
  for (const flag of flags) {
    const candidates = (flag.related_fields ?? []).filter((f) => f.length >= 8);
    if (candidates.length === 0) continue;
    const bestTarget = pickMatchingTarget(sourceText, candidates);
    if (!bestTarget) continue;
    pushAnnotation({
      id: `flag-${flag.id}`,
      target: bestTarget,
      severity: flag.severity,
      explanation: flag.plain_note,
      suggestion: "Tighten wording to reduce ambiguity and keep obligations balanced for both sides.",
    });
  }

  return annotations.slice(0, 30);
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectRegexMatches(text: string, regex: RegExp) {
  const matches: Array<{ start: number; end: number }> = [];
  regex.lastIndex = 0;
  let current = regex.exec(text);
  while (current) {
    const matchedText = current[0];
    if (matchedText.length > 0) {
      matches.push({ start: current.index, end: current.index + matchedText.length });
    }
    current = regex.exec(text);
  }
  return matches;
}

function buildTrackedDiffs(
  text: string,
  changes: Array<{ before: string; after: string; reason: string; severity?: string }>
): TrackedDiff[] {
  if (!text || changes.length === 0) return [];

  const diffs: TrackedDiff[] = [];

  function hasOverlap(start: number, end: number) {
    return diffs.some((d) => start < d.end && end > d.start);
  }

  for (const change of changes) {
    const normalizedBefore = normalizeDocText(change.before);
    if (normalizedBefore.length < 4) continue;

    const phraseRegex = new RegExp(
      escapeForRegex(normalizedBefore).replace(/\s+/g, "\\s+"),
      "gi"
    );
    const candidates = collectRegexMatches(text, phraseRegex);
    const match = candidates.find((c) => !hasOverlap(c.start, c.end));

    if (match) {
      const severity: AnnotationSeverity =
        change.severity === "high" || change.severity === "medium" || change.severity === "low"
          ? change.severity
          : "medium";
      diffs.push({
        start: match.start,
        end: match.end,
        before: text.slice(match.start, match.end),
        after: normalizeDocText(change.after),
        reason: change.reason,
        severity,
      });
    }
  }

  return diffs.sort((a, b) => a.start - b.start);
}

function renderTrackedChanges(text: string, diffs: TrackedDiff[], keyPrefix: string): ReactNode {
  if (diffs.length === 0) return text;

  const fragments: ReactNode[] = [];
  let cursor = 0;

  for (let idx = 0; idx < diffs.length; idx += 1) {
    const diff = diffs[idx];
    if (diff.start > cursor) {
      fragments.push(
        <span key={`${keyPrefix}-tc-plain-${idx}`}>{text.slice(cursor, diff.start)}</span>
      );
    }

    fragments.push(
      <span key={`${keyPrefix}-tc-diff-${idx}`} className="group relative inline">
        <span
          className="cursor-pointer rounded-[2px] bg-[#fde8e5] px-[1px] text-[#9e3f2d]"
          style={{ textDecoration: "line-through" }}
        >
          {diff.before}
        </span>
        <span
          className="ml-[2px] cursor-pointer rounded-[2px] bg-[#e8f5ee] px-[1px] text-[#1d655f]"
          style={{ textDecoration: "underline", textDecorationColor: "rgba(29,101,95,0.5)" }}
        >
          {diff.after}
        </span>
        {diff.reason && (
          <span
            role="tooltip"
            className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface)] p-2 text-left text-xs leading-5 text-[var(--pt-ink)] opacity-0 shadow-md transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
          >
            {diff.reason}
          </span>
        )}
      </span>
    );
    cursor = diff.end;
  }

  if (cursor < text.length) {
    fragments.push(<span key={`${keyPrefix}-tc-tail`}>{text.slice(cursor)}</span>);
  }

  return fragments;
}

function buildRewriteDraft(data: PtResult): string {
  const flags = data.report?.red_flags ?? [];
  const clauses = data.report?.clause_breakdown ?? [];
  const top = flags.slice(0, 5);

  const lines = [
    "Contract Rewrite Suggestions",
    "",
    "Use these as negotiation fallback edits. Keep legal counsel in loop before final signature.",
    "",
  ];

  if (top.length > 0) {
    lines.push("Priority edits:");
    top.forEach((flag, idx) => {
      lines.push(`${idx + 1}. ${flag.title}`);
      lines.push(`   Suggested adjustment: ${flag.plain_note}`);
    });
  } else {
    lines.push("No high-priority rewrite items were detected.");
    lines.push(
      "Suggested adjustment: keep wording tight around payment timing, IP ownership, and termination rights."
    );
  }

  if (clauses.length > 0) {
    lines.push("");
    lines.push("Clause-by-clause notes:");
    clauses.slice(0, 4).forEach((clause) => {
      lines.push(`- ${clause.title}: ${clause.what_it_means}`);
    });
  }

  return lines.join("\n");
}

function buildUpdateEmailDraft(data: PtResult): string {
  const serverDraft = data.report?.negotiation_email_draft?.trim();
  if (serverDraft) return serverDraft;

  const recommendation = data.report?.recommendation;
  const flags = data.report?.red_flags ?? [];
  const highlights = flags
    .slice(0, 3)
    .map((flag) =>
      `- ${flag.title.replace(/\s+is not clearly stated$/i, "").replace(/\s+appears unclear$/i, "").trim()}`
    );

  const lines = [
    "Subject: Requested updates to agreement terms",
    "",
    "Hi [Name],",
    "",
    "Thanks again for sharing the agreement. I reviewed it and would like to request a few revisions before signing.",
    "",
    ...(highlights.length > 0
      ? [
          "The main terms I'd like to update are:",
          ...highlights,
          "",
          "Could you revise these items so scope, obligations, and risk allocation are explicit for both sides?",
          "",
        ]
      : ["I'd like a few clarification edits so the responsibilities are explicit for both sides.", ""]),
    recommendation
      ? `Current review recommendation: ${recommendation.label}. ${recommendation.reason}`
      : "I want to make sure key rights and obligations are explicitly clear for both sides.",
    "",
    "If you can share a revised draft reflecting these points, I can turn it around quickly.",
    "",
    "Thank you,",
    "[Your Name]",
  ];

  return lines.join("\n");
}

function parseEmailDraft(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const subjectIdx = lines.findIndex((line) => /^subject\s*:/i.test(line.trim()));

  const cleanBody = (raw: string) =>
    raw
      .replace(/^current review recommendation\s*:?.+$/gim, "")
      .replace(/^questions to confirm as you revise\s*:?\s*\n(^- .+\n?)*/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  if (subjectIdx === -1) {
    return { subject: "", body: cleanBody(content.trim()) };
  }

  const subject = lines[subjectIdx].replace(/^subject\s*:/i, "").trim();
  const body = cleanBody(
    [...lines.slice(0, subjectIdx), ...lines.slice(subjectIdx + 1)].join("\n").trim()
  );

  return { subject, body };
}

async function readCheckoutError(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
      return JSON.stringify(json).slice(0, 500);
    }

    const text = await res.text();
    if (text.trim()) return text.slice(0, 500);
  } catch {
    // Fall back below.
  }

  return res.statusText || "Unknown error";
}

export default function ResultWorkspace({ data, retentionDays, accessKey, abVariant }: ResultWorkspaceProps) {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>("summary");
  const [fullReportVisited, setFullReportVisited] = useState(false);
  const [activeBasicTab, setActiveBasicTab] = useState<BasicTab>("summary");
  const [addonNotice, setAddonNotice] = useState<string | null>(null);
  const [addonDraft, setAddonDraft] = useState<AddonDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [documentViewMode, setDocumentViewMode] = useState<DocumentViewMode>("original");
  const [documentCopied, setDocumentCopied] = useState(false);
  const [documentRevision, setDocumentRevision] = useState(data.document?.revision);
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePrompt | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<ReportTierOption | null>(null);

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
  const fileName = data.document?.file_name ?? "Contract document";
  const extractedDocumentText = data.document?.extracted_text?.trim() ?? "";
  const effectiveDocumentRevision = documentRevision ?? data.document?.revision;
  const revisionChanges = useMemo(
    () => (Array.isArray(effectiveDocumentRevision?.changes) ? effectiveDocumentRevision.changes : []),
    [effectiveDocumentRevision]
  );
  const backendRevisedText =
    typeof effectiveDocumentRevision?.revised_text === "string"
      ? effectiveDocumentRevision.revised_text.trim()
      : "";
  const hasBackendRevision = effectiveDocumentRevision?.status === "ready" && backendRevisedText.length > 0;
  const isRevisionProcessing = effectiveDocumentRevision?.status === "processing";
  const baseDocumentAnnotations = useMemo(() => buildDocumentAnnotations(data), [data]);
  const trackedDiffs = useMemo(
    () => buildTrackedDiffs(extractedDocumentText, revisionChanges),
    [extractedDocumentText, revisionChanges]
  );
  const topDocumentAnnotations = baseDocumentAnnotations.slice(0, 6);
  const documentWordCount =
    data.document?.word_count ??
    (extractedDocumentText ? extractedDocumentText.split(/\s+/).filter(Boolean).length : 0);
  const documentContentType = data.document?.content_type ?? "Unknown";
  const revisionHighCount = revisionChanges.filter((c) => c.severity === "high").length;
  const revisionMediumCount = revisionChanges.filter(
    (c) => !c.severity || c.severity === "medium"
  ).length;
  const revisionLowCount = revisionChanges.filter((c) => c.severity === "low").length;

  useEffect(() => {
    if (!accessKey || !data.result_id) return undefined;
    if (effectiveDocumentRevision?.status !== "processing") return undefined;

    let stopped = false;
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/result/${encodeURIComponent(data.result_id)}?k=${encodeURIComponent(accessKey)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const json = await response.json();
        const parsed = PtResultSchema.safeParse(json);
        if (!parsed.success || stopped) return;

        const nextRevision = parsed.data.document?.revision;
        if (!nextRevision) return;
        setDocumentRevision(nextRevision);
      } catch {
        // Ignore transient polling errors.
      }
    }, 3500);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [accessKey, data.result_id, effectiveDocumentRevision?.status]);

  const redFlags = data.report?.red_flags ?? [];
  const clauseBreakdown = data.report?.clause_breakdown ?? [];
  const questionsToAsk = data.report?.questions_to_ask ?? [];
  const isLowRiskNoFlags = data.report?.risk.label === "low" && redFlags.length === 0;
  const reportTier = data.report?.tier ?? "report_69";
  const isCoreTier = reportTier === "scan_39";
  // Upgrades only charge the difference, so show that (not the full tier price).
  const tierAmount = (tier: ReportTierOption) =>
    Number(REPORT_TIER_PRICES[tier].replace(/[^0-9.]/g, ""));
  const upgradePriceLabel = (tier: ReportTierOption) => {
    const diff = tierAmount(tier) - tierAmount(reportTier);
    return diff > 0 ? `$${diff}` : REPORT_TIER_PRICES[tier];
  };
  const isProtectTier = reportTier === "protect_99";
  const protectExtras = data.report?.protect_extras;
  const protectUpsell = data.report?.protect_upsell;
  const activeEmailDraft = addonDraft?.key === "update_email" ? addonDraft : null;

  function openUpgradePrompt(prompt: UpgradePrompt) {
    setUpgradePrompt(prompt);
    setUpgradeError(null);
  }

  async function startResultUpgrade(tier: ReportTierOption) {
    if (!accessKey) {
      setUpgradeError("This result link needs a fresh secure access key before checkout can start.");
      return;
    }

    setUpgradeTier(tier);
    setUpgradeError(null);

    try {
      void trackFunnelMetric({
        event: "checkout_start",
        funnelId: getOrCreateFunnelId(),
        resultId: data.result_id,
        abVariant,
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resultId: data.result_id,
          accessKey,
          reportTier: tier,
        }),
      });

      if (!response.ok) {
        const detail = await readCheckoutError(response);
        throw new Error(`Checkout failed (${response.status}): ${detail}`);
      }

      const checkout = (await response.json()) as { checkoutUrl?: string };
      if (!checkout.checkoutUrl) {
        throw new Error("Checkout succeeded but did not return a checkout URL.");
      }
      window.location.assign(checkout.checkoutUrl);
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : "Checkout could not be started.");
      setUpgradeTier(null);
    }
  }

  function activateAddon(addon: AddonKey) {
    if (addon === "rewrite_contract") {
      setAddonDraft({
        key: addon,
        title: "Rewrite Contract Draft",
        content: buildRewriteDraft(data),
      });
      setAddonNotice("Rewrite contract draft is ready.");
      return;
    }

    setAddonDraft({
      key: addon,
      title: "Negotiation Email Draft",
      content: buildUpdateEmailDraft(data),
    });
    setAddonNotice("Negotiation email draft is ready.");
  }

  async function copyAddonDraft() {
    if (!addonDraft) return;
    try {
      await navigator.clipboard.writeText(addonDraft.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setAddonNotice("Unable to copy automatically. You can still select and copy manually.");
    }
  }

  function dismissAddonDraft() {
    setAddonDraft(null);
    setAddonNotice(null);
    setCopied(false);
  }

  async function copyRevisedText() {
    if (!backendRevisedText) return;
    try {
      await navigator.clipboard.writeText(backendRevisedText);
      setDocumentCopied(true);
      window.setTimeout(() => setDocumentCopied(false), 1600);
    } catch {
      setDocumentCopied(false);
    }
  }


  const actionItems = useMemo(() => {
    const bullets = data.report?.negotiation_bullets;
    if (!bullets) return [];
    if (bullets.high.length) return bullets.high.slice(0, 4);
    if (bullets.medium.length) return bullets.medium.slice(0, 4);
    return bullets.low.slice(0, 4);
  }, [data.report]);

  const highFlagCount = redFlags.filter((flag) => flag.severity === "high").length;
  const mediumFlagCount = redFlags.filter((flag) => flag.severity === "medium").length;
  const lowFlagCount = redFlags.filter((flag) => flag.severity === "low").length;
  const highFlags = redFlags.filter((flag) => flag.severity === "high");
  const presentClauseCount = clauseBreakdown.filter((clause) => clause.status === "present").length;
  const unclearClauseCount = clauseBreakdown.filter((clause) => clause.status === "unclear").length;
  const missingClauseCount = clauseBreakdown.filter((clause) => clause.status === "missing").length;
  const unclearClauses = clauseBreakdown.filter((clause) => clause.status === "unclear");
  const missingClauses = clauseBreakdown.filter((clause) => clause.status === "missing");
  const evidenceClauseCount = clauseBreakdown.filter((clause) => Boolean(clause.evidence)).length;
  const unclearSupportingCount = reportSupportingSections.filter((section) => section.status === "unclear").length;
  const clauseCoveragePct = Math.round(
    (presentClauseCount / Math.max(clauseBreakdown.length, 1)) * 100
  );
  const evidenceCoveragePct = Math.round(
    (evidenceClauseCount / Math.max(clauseBreakdown.length, 1)) * 100
  );
  const reportUpgradeTiers: ReportTierOption[] = isCoreTier ? ["report_69", "protect_99"] : ["protect_99"];
  const fullReportPrompt: UpgradePrompt = {
    title: "Full clause analysis",
    description:
      "Open the complete clause view with missing and unclear terms, explanations, and evidence notes.",
    tiers: reportUpgradeTiers,
  };
  const documentReviewPrompt: UpgradePrompt = {
    title: "Document review",
    description:
      "Review the source text with document-level callouts, tracked changes, and revised wording where available.",
    tiers: reportUpgradeTiers,
  };
  const protectPlanPrompt: UpgradePrompt = {
    title: "Negotiation prep",
    description:
      "Open rewrite options, fallback positions, priority stack, and a ready-to-send negotiation email draft.",
    tiers: ["protect_99"],
  };
  const rewriteOptionsPrompt: UpgradePrompt = {
    title: "Rewrite options",
    description:
      "See alternative language for higher-risk issues, including push-hard, middle-ground, and minimum fallback positions.",
    tiers: ["protect_99"],
  };
  const emailDraftPrompt: UpgradePrompt = {
    title: "Negotiation email",
    description:
      "Generate a structured email that turns the report findings into requested contract changes.",
    tiers: ["protect_99"],
  };
  const [insightsDrilldownOpen, setInsightsDrilldownOpen] = useState(() => ({
    summary: true,
    terms: unclearClauses.length + missingClauses.length > 0,
    questions: questionsToAsk.length > 0,
    flags: highFlags.length > 0,
  }));

  const reportTabs: Array<{ key: ReportTab; label: string; count?: number | "all" }> = [
    { key: "summary", label: "Summary", count: undefined },
    { key: "insights", label: "Insights" },
    { key: "flags", label: "Red Flags", count: redFlags.length },
    { key: "terms", label: "Key Terms", count: clauseBreakdown.length },
    ...(questionsToAsk.length
      ? ([{ key: "questions", label: "Questions", count: questionsToAsk.length }] as const)
      : []),
    { key: "document", label: "Document" },
    { key: "full", label: "Full Report", count: "all" },
  ];

  const tabIcons: Record<ReportTab, string> = {
    summary: "/window.svg",
    insights: "/graphics/icon-search.svg",
    flags: "/graphics/icon-shield.svg",
    terms: "/file.svg",
    document: "/graphics/icon-doc.svg",
    questions: "/globe.svg",
    full: "/graphics/icon-doc.svg",
  };

  const baseTabs: Array<{ key: BasicTab; label: string }> = [
    { key: "summary", label: "Summary" },
    { key: "document", label: "Document Review" },
    { key: "supporting", label: "Supporting Details" },
  ];

  const documentReviewContent = (
    <>
      {/* Toolbar */}
      <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--pt-ink)]" title={fileName}>
              {fileName}
            </p>
            <p className="text-xs text-[var(--pt-muted)]">
              {documentWordCount} words · {documentContentType}
              {isRevisionProcessing ? (
                <span className="ml-2 italic text-[#8c6526]">preparing your revised draft…</span>
              ) : null}
            </p>
            {effectiveDocumentRevision?.status === "ready" && effectiveDocumentRevision.summary ? (
              <p className="mt-1 max-w-md text-xs text-[var(--pt-muted)]">
                {effectiveDocumentRevision.summary}
              </p>
            ) : null}
            {effectiveDocumentRevision?.status === "failed" ? (
              <p className="mt-1 text-xs text-[#9e3f2d]">
                {effectiveDocumentRevision.message || "Suggested edits failed to generate."}
              </p>
            ) : null}
          </div>

          {/* Segmented control */}
          <div className="flex items-center rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-[3px]">
            {(["original", "tracked", "revised"] as const).map((mode) => {
              const labels: Record<typeof mode, string> = {
                original: "Original",
                tracked: "Track Changes",
                revised: "Revised",
              };
              const isLoading = isRevisionProcessing && mode !== "original";
              const isDisabled =
                (mode === "tracked" && revisionChanges.length === 0 && !isRevisionProcessing) ||
                (mode === "revised" && !hasBackendRevision && !isRevisionProcessing);
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setDocumentViewMode(mode)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    documentViewMode === mode
                      ? "bg-white text-[var(--pt-ink)] shadow-sm"
                      : "text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
                  }`}
                >
                  {labels[mode]}
                  {isLoading ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d8a84b]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Track changes legend */}
        {documentViewMode === "tracked" && trackedDiffs.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--pt-muted)]">
            <del className="rounded-[2px] bg-[#fde8e5] px-1.5 py-0.5 text-[#9e3f2d] line-through no-underline">
              removed
            </del>
            <ins className="rounded-[2px] bg-[#e8f5ee] px-1.5 py-0.5 text-[#1d655f] underline no-underline">
              inserted
            </ins>
            <span>{trackedDiffs.length} tracked change{trackedDiffs.length !== 1 ? "s" : ""} · hover for reason</span>
          </div>
        ) : null}
      </article>

      {/* Document paper */}
      {extractedDocumentText ? (
        <article className="relative overflow-hidden rounded-lg border border-[var(--pt-border)] shadow-sm">
          {documentViewMode === "revised" && hasBackendRevision ? (
            <button
              type="button"
              onClick={copyRevisedText}
              className="absolute right-3 top-3 z-10 inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--pt-border)] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[var(--pt-ink)] shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              {documentCopied ? (
                <>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 text-[#1d655f]">
                    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copy text
                </>
              )}
            </button>
          ) : null}
          {/* Indeterminate progress bar while generating */}
          {isRevisionProcessing && documentViewMode !== "original" ? (
            <div className="h-0.5 w-full overflow-hidden bg-[#f0ede8]">
              <div className="h-full w-2/5 animate-[pulse_1.4s_ease-in-out_infinite] bg-[#d8a84b]" />
            </div>
          ) : null}
          <div className="max-h-[580px] overflow-auto bg-[#f0ede8] px-3 py-6 sm:px-10">
            {isRevisionProcessing && documentViewMode !== "original" ? (
              /* Skeleton loading state */
              <div className="mx-auto max-w-[680px] rounded-sm bg-white px-8 py-10 shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]">
                <div className="space-y-3">
                  {[92, 100, 78, 100, 88, 100, 65, 100, 82, 100, 70].map((w, i) => (
                    <div
                      key={i}
                      className="h-[13px] animate-pulse rounded bg-[#f0ede8]"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
                <p className="mt-6 text-xs text-[#8c6526]">
                  Preparing your revised draft — this usually takes under two minutes.
                </p>
              </div>
            ) : (
              <div
                className="mx-auto max-w-[680px] rounded-sm bg-white px-8 py-10 text-[15px] leading-[1.85] tracking-[0.003em] text-[#252830] shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)] whitespace-pre-wrap select-text"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {documentViewMode === "tracked"
                  ? renderTrackedChanges(extractedDocumentText, trackedDiffs, "tc")
                  : documentViewMode === "revised"
                  ? backendRevisedText
                  : extractedDocumentText}
              </div>
            )}
          </div>
          {data.document?.extracted_text_truncated && documentViewMode === "original" ? (
            <p className="border-t border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-2 text-xs text-[var(--pt-muted)]">
              Document text shown here is truncated from the original upload.
            </p>
          ) : null}
          {documentViewMode === "tracked" && !isRevisionProcessing && trackedDiffs.length === 0 && revisionChanges.length > 0 ? (
            <p className="border-t border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-4 py-2 text-xs text-[var(--pt-muted)]">
              No specific wording matches were found in the document text for the suggested changes.
            </p>
          ) : null}
        </article>
      ) : (
        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4 text-sm text-[var(--pt-muted)]">
          Extracted source text is not available for this file yet.
        </article>
      )}

      {/* Changes panel */}
      {revisionChanges.length > 0 ? (
        <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--pt-ink)]">Suggested Changes</p>
            <div className="flex gap-1.5 text-[11px]">
              {revisionHighCount > 0 ? (
                <span className="rounded-full border border-[#efc1b6] bg-[#ffe8e3] px-2 py-0.5 text-[#9e3f2d]">
                  {revisionHighCount} high
                </span>
              ) : null}
              {revisionMediumCount > 0 ? (
                <span className="rounded-full border border-[#ead3a1] bg-[#fff4df] px-2 py-0.5 text-[#8c6526]">
                  {revisionMediumCount} medium
                </span>
              ) : null}
              {revisionLowCount > 0 ? (
                <span className="rounded-full border border-[#b2ddd4] bg-[#e1f4ef] px-2 py-0.5 text-[#1d655f]">
                  {revisionLowCount} low
                </span>
              ) : null}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {revisionChanges.slice(0, 8).map((change, idx) => {
              const severity: AnnotationSeverity =
                change.severity === "high" || change.severity === "medium" || change.severity === "low"
                  ? change.severity
                  : "medium";
              return (
                <li
                  key={`revision-change-${idx + 1}`}
                  className="rounded-lg border border-[var(--pt-border)] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${annotationSeverityClass(
                        severity
                      )}`}
                    >
                      {severity}
                    </span>
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
              );
            })}
          </ul>
        </article>
      ) : topDocumentAnnotations.length > 0 ? (
        <article className="rounded-lg border border-[var(--pt-border)] bg-white p-4">
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Improvement Opportunities</p>
          <ul className="mt-3 space-y-2">
            {topDocumentAnnotations.map((annotation) => (
              <li
                key={annotation.id}
                className="rounded-lg border border-[var(--pt-border)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${annotationSeverityClass(
                      annotation.severity
                    )}`}
                  >
                    {annotation.severity}
                  </span>
                  <span className="text-sm font-semibold text-[var(--pt-ink)]">
                    &ldquo;{annotation.target}&rdquo;
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/85">{annotation.explanation}</p>
                <p className="text-xs leading-5 text-[var(--pt-muted)]">
                  Suggested edit: {annotation.suggestion}
                </p>
              </li>
            ))}
          </ul>
        </article>
      ) : (
        <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          No major wording clarity callouts were detected in this document.
        </article>
      )}
    </>
  );

  return (
    <>
    <FeedbackToast resultId={data.result_id} externalTrigger={fullReportVisited} />
    <UpgradeModal
      open={upgradePrompt !== null}
      featureTitle={upgradePrompt?.title ?? ""}
      featureDescription={upgradePrompt?.description ?? ""}
      tiers={upgradePrompt?.tiers}
      recommendedTier={upgradePrompt?.tiers[0]}
      priceForTier={upgradePriceLabel}
      ctaPrefix="Upgrade to"
      processing={
        upgradeTier
          ? {
              tier: upgradeTier,
              stepNames: ["Opening secure checkout"],
              stepIndex: 0,
              stepLabel: "Opening secure checkout",
              stepDescription: "Redirecting you to encrypted Stripe payment.",
            }
          : null
      }
      error={upgradeError}
      onSelectTier={startResultUpgrade}
      onClose={() => {
        setUpgradePrompt(null);
        setUpgradeError(null);
      }}
    />

    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {data.report ? (
        <ReportSidebar
          tabs={reportTabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            icon: tabIcons[tab.key],
            count: tab.count,
            loading: tab.key === "document" && isRevisionProcessing,
          }))}
          activeKey={activeReportTab}
          onSelectTab={(key) => {
            setActiveReportTab(key as ReportTab);
            if (key === "full") setFullReportVisited(true);
          }}
          risk={data.report.risk}
          recommendation={{
            label: data.report.recommendation.label,
            reason: annotateLegalTerms(data.report.recommendation.reason, "recommendation"),
            tone: actionToTone(data.report.recommendation.action),
          }}
          footer={LEGAL_DISCLAIMER_FOOTER}
        />
      ) : (
        <aside className="pt-card p-4">
          <h2 className="text-xl text-[var(--pt-ink)]">Result</h2>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">
            This result contains a plain-English summary with source-backed contract details.
          </p>
          <nav aria-label="Result sections" className="mt-3 space-y-2">
            {baseTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveBasicTab(tab.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  activeBasicTab === tab.key
                    ? "border-[#de8f79] bg-[#ffe5dc] text-[#5a2f25] shadow-[inset_0_0_0_1px_rgba(222,143,121,0.35)]"
                    : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[#de8f79] hover:text-[var(--pt-ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {LEGAL_DISCLAIMER_FOOTER}
        </aside>
      )}

      <section className="pt-card p-4">
        {data.report ? (
          <>
            <div className="mb-3">
              <h2 className="text-xl text-[var(--pt-ink)]">
                {activeReportTab === "summary" && "Summary"}
                {activeReportTab === "insights" && "Insights"}
                {activeReportTab === "flags" && "Red Flags"}
                {activeReportTab === "terms" && "Key Terms"}
                {activeReportTab === "document" && "Document Review"}
                {activeReportTab === "questions" && "Questions To Ask"}
                {activeReportTab === "full" && "Full Report Details"}
              </h2>
            </div>

            <div className="space-y-3">
              {activeReportTab === "summary" && (
                <>
                  <QuickReadout
                    riskScore={data.report.risk.score}
                    recommendationLabel={data.report.recommendation.label}
                    flagsFound={redFlags.length}
                  />

                  <ContractHealthSnapshot
                    riskScore={data.report.risk.score}
                    clearClauseCount={presentClauseCount}
                    totalClauseCount={clauseBreakdown.length}
                  />

                  <article className="pt-card-soft p-3">
                    <h3 className="text-lg font-semibold text-[var(--pt-ink)]">Top Next Steps</h3>
                    {actionItems.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {actionItems.map((item, idx) => (
                          <li
                            key={`summary-action-${idx}`}
                            className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2 text-[15px] leading-6 text-[var(--pt-ink)]/90"
                          >
                            {annotateLegalTerms(item, `summary-action-${idx}`)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-base text-emerald-900">
                        {isLowRiskNoFlags
                          ? "Your contract looks strong. No urgent negotiation steps were detected in this review."
                          : "No priority action items were identified for this report."}
                      </div>
                    )}
                  </article>

                  <article className="pt-card-soft p-3">
                    <h3 className="text-lg font-semibold text-[var(--pt-ink)]">Top Flags Preview</h3>
                    {redFlags.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {redFlags.slice(0, 3).map((flag) => (
                          <li
                            key={`summary-flag-${flag.id}`}
                            className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-base font-semibold text-[var(--pt-ink)]">
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
                    ) : (
                      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src="/graphics/icon-shield.svg"
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-md border border-emerald-200 bg-white p-1"
                          />
                          <p className="text-base font-semibold text-emerald-900">
                            No major red flags detected. Your contract review looks positive.
                          </p>
                        </div>
                      </div>
                    )}
                  </article>

                  {isProtectTier && protectExtras?.priority_stack && (
                    <article className="pt-card-soft p-3">
                      <h3 className="text-lg font-semibold text-[var(--pt-ink)]">Negotiation Priority Stack</h3>
                      <p className="mt-1 text-sm text-[var(--pt-muted)]">What to fight for, what to accept if they push back, and what you can let go of.</p>
                      <div className="mt-3 space-y-2">
                        {protectExtras.priority_stack.fight_for.length > 0 && (
                          <div className="rounded-lg border border-[#efc1b6] bg-[#fff0ee] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9e3f2d]">Fight for</p>
                            <ul className="mt-1.5 space-y-1">
                              {protectExtras.priority_stack.fight_for.map((item, idx) => (
                                <li key={`fight-${idx}`} className="flex items-start gap-2 text-sm text-[#7f2e1f]">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e7745c]" />
                                  {annotateLegalTerms(item, `fight-${idx}`)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {protectExtras.priority_stack.accept_if_pushback.length > 0 && (
                          <div className="rounded-lg border border-[#ead3a1] bg-[#fff9ef] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8c6526]">Accept if they push back</p>
                            <ul className="mt-1.5 space-y-1">
                              {protectExtras.priority_stack.accept_if_pushback.map((item, idx) => (
                                <li key={`accept-${idx}`} className="flex items-start gap-2 text-sm text-[#6e4f1e]">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8a84b]" />
                                  {annotateLegalTerms(item, `accept-${idx}`)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {protectExtras.priority_stack.can_concede.length > 0 && (
                          <div className="rounded-lg border border-[#b2ddd4] bg-[#edf8f5] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1d655f]">Can concede</p>
                            <ul className="mt-1.5 space-y-1">
                              {protectExtras.priority_stack.can_concede.map((item, idx) => (
                                <li key={`concede-${idx}`} className="flex items-start gap-2 text-sm text-[#154f4a]">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ba59f]" />
                                  {annotateLegalTerms(item, `concede-${idx}`)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </article>
                  )}

                  {!isProtectTier && protectUpsell?.should_upsell_protect && (
                    <LockedDisclosure
                      title="Negotiation prep"
                      meta={REPORT_TIER_NAMES.protect_99}
                      description={
                        protectUpsell.reasons[0] ??
                        "A negotiation plan is available for contracts with elevated risk signals."
                      }
                      onOpen={() => openUpgradePrompt(protectPlanPrompt)}
                    />
                  )}
                </>
              )}

              {activeReportTab === "insights" && (
                <>
                  {isCoreTier && (
                    <LockedDisclosure
                      title="Deeper insight view"
                      meta={REPORT_TIER_NAMES.report_69}
                      description="Open the full insight layer with clause coverage, evidence coverage, and question readiness."
                      onOpen={() => openUpgradePrompt(fullReportPrompt)}
                    />
                  )}
                  <article className="rounded-lg border border-[#e9d3b0] bg-gradient-to-r from-[#fff6ea] via-[#fff9f2] to-[#ffeed8] p-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/graphics/icon-search.svg"
                        alt=""
                        width={22}
                        height={22}
                        className="h-5.5 w-5.5 rounded-md border border-[#c9d7f7] bg-white p-1"
                      />
                      <p className="text-sm font-semibold text-[#344167]">Key Takeaways</p>
                    </div>
                    <p className="mt-1 text-sm text-[#4c5a86]">
                      A connected view of the risks, clause gaps, evidence, and questions that matter most from this analysis.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">Risk posture</p>
                        <p className="text-lg font-semibold text-[#374175]">{data.report.risk.label}</p>
                      </div>
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">Clause clarity</p>
                        <p className="text-lg font-semibold text-[#374175]">{clauseCoveragePct}%</p>
                      </div>
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">Question readiness</p>
                        <p className="text-lg font-semibold text-[#374175]">{questionsToAsk.length}</p>
                      </div>
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">Evidence coverage</p>
                        <p className="text-lg font-semibold text-[#374175]">{evidenceCoveragePct}%</p>
                      </div>
                    </div>
                  </article>

                  <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
                    <p className="text-base font-semibold text-[var(--pt-ink)]">Signal Matrix</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Summary + Flags</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/85">
                          {isLowRiskNoFlags
                            ? "Strong overall posture. Focus on confirmation and final alignment."
                            : `Recommendation is "${data.report.recommendation.label}". Resolve ${
                                highFlagCount + mediumFlagCount
                              } priority risks before signing.`}
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-[#f4d7ce]">
                          <div
                            className="h-2 rounded-full bg-[#de8f79]"
                            style={{
                              width: `${Math.max(
                                ((highFlagCount + mediumFlagCount) / Math.max(redFlags.length, 1)) * 100,
                                redFlags.length ? 10 : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Terms + Full Report</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/85">
                          {unclearSupportingCount > 0
                            ? `${unclearSupportingCount} supporting clauses need verification. Review clause evidence before final decisions.`
                            : "Supporting clause evidence is consistent overall."}
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-[#e6ecfc]">
                          <div
                            className="h-2 rounded-full bg-[#5d73c8]"
                            style={{ width: `${Math.max(evidenceCoveragePct, clauseBreakdown.length ? 8 : 0)}%` }}
                          />
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
                      <DrilldownPanel
                        title="Summary Insights"
                        meta="Top action"
                        open={insightsDrilldownOpen.summary}
                        onToggle={() =>
                          setInsightsDrilldownOpen((prev) => ({ ...prev, summary: !prev.summary }))
                        }
                      >
                        <p className="text-[15px] leading-6 text-[var(--pt-ink)]/85">
                          {actionItems.length > 0
                            ? `Primary next step: ${actionItems[0]}`
                            : "No urgent action items were identified from summary analysis."}
                        </p>
                      </DrilldownPanel>
                      <DrilldownPanel
                        title="Key Terms Insights"
                        meta={`${unclearClauses.length + missingClauses.length}`}
                        open={insightsDrilldownOpen.terms}
                        onToggle={() => setInsightsDrilldownOpen((prev) => ({ ...prev, terms: !prev.terms }))}
                      >
                        <ul className="space-y-1 text-sm text-[var(--pt-ink)]/85">
                          {[...missingClauses, ...unclearClauses].slice(0, 3).map((clause) => (
                            <li key={`insight-clarity-${clause.key}`}>
                              {annotateLegalTerms(clause.title, `insight-clarity-${clause.key}`)}
                            </li>
                          ))}
                          {missingClauses.length + unclearClauses.length === 0 && <li>No material clause clarity gaps.</li>}
                        </ul>
                      </DrilldownPanel>
                      <DrilldownPanel
                        title="Questions Insights"
                        meta={`${questionsToAsk.length}`}
                        open={insightsDrilldownOpen.questions}
                        onToggle={() =>
                          setInsightsDrilldownOpen((prev) => ({ ...prev, questions: !prev.questions }))
                        }
                      >
                        <ul className="space-y-1 text-sm text-[var(--pt-ink)]/85">
                          {questionsToAsk.slice(0, 3).map((question, idx) => (
                            <li key={`insight-question-${idx}`}>{question}</li>
                          ))}
                          {questionsToAsk.length === 0 && <li>No suggested questions; use flags as discussion prompts.</li>}
                        </ul>
                      </DrilldownPanel>
                      <DrilldownPanel
                        title="Red Flag Insights"
                        meta={`${highFlags.length}`}
                        open={insightsDrilldownOpen.flags}
                        onToggle={() => setInsightsDrilldownOpen((prev) => ({ ...prev, flags: !prev.flags }))}
                      >
                        <ul className="space-y-1 text-sm text-[var(--pt-ink)]/85">
                          {highFlags.slice(0, 3).map((flag) => (
                            <li key={`insight-high-${flag.id}`}>{flag.title}</li>
                          ))}
                          {highFlags.length === 0 && <li>No high-risk flags were detected.</li>}
                        </ul>
                      </DrilldownPanel>
                    </div>
                  </article>
                </>
              )}

              {activeReportTab === "flags" && (
                <>
                  {redFlags.length > 0 ? (
                    <>
                      <article className="rounded-lg border border-[#efc1b6] bg-gradient-to-r from-[#fff3ef] via-[#fff8f5] to-[#fffdfc] p-3">
                        <div className="flex items-center gap-2">
                          <Image
                            src="/graphics/icon-shield.svg"
                            alt=""
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded-md border border-[#efc1b6] bg-white p-1"
                          />
                          <p className="text-sm font-semibold text-[#7f2e1f]">Red Flag Review</p>
                        </div>
                        <p className="mt-1 text-sm text-[#7f2e1f]/80">
                          Each item below includes what was found and why it matters.
                        </p>
                      </article>

                      <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
                        <p className="text-sm font-semibold text-[var(--pt-ink)]">Flag Severity Mix</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-md border border-[#efc1b6] bg-[#ffe8e3] px-3 py-2">
                            <p className="text-xs text-[#9e3f2d]">High</p>
                            <p className="text-lg font-semibold text-[#7f2e1f]">{highFlagCount}</p>
                          </div>
                          <div className="rounded-md border border-[#ead3a1] bg-[#fff4df] px-3 py-2">
                            <p className="text-xs text-[#8c6526]">Medium</p>
                            <p className="text-lg font-semibold text-[#6e4f1e]">{mediumFlagCount}</p>
                          </div>
                          <div className="rounded-md border border-[#b2ddd4] bg-[#e1f4ef] px-3 py-2">
                            <p className="text-xs text-[#1d655f]">Low</p>
                            <p className="text-lg font-semibold text-[#154f4a]">{lowFlagCount}</p>
                          </div>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-full border border-[var(--pt-border)] bg-white">
                          <div className="flex h-2">
                            <div
                              className="bg-[#e7745c]"
                              style={{ width: `${(highFlagCount / Math.max(redFlags.length, 1)) * 100}%` }}
                            />
                            <div
                              className="bg-[#d8a84b]"
                              style={{ width: `${(mediumFlagCount / Math.max(redFlags.length, 1)) * 100}%` }}
                            />
                            <div
                              className="bg-[#2ba59f]"
                              style={{ width: `${(lowFlagCount / Math.max(redFlags.length, 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </article>


                      {redFlags.map((flag) => (
                        <article key={flag.id} className="pt-card-soft p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-base font-semibold text-[var(--pt-ink)]">
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
                          <p className="mt-2 text-[15px] leading-6 text-[var(--pt-ink)]/85">
                            {annotateLegalTerms(flag.plain_note, `flags-note-${flag.id}`)}
                          </p>
                        </article>
                      ))}

                      {isCoreTier && (
                        <LockedDisclosure
                          title="Full red-flag notes"
                          meta={REPORT_TIER_NAMES.report_69}
                          description="Open the full risk notes, clause context, and negotiation talking points behind these findings."
                          onOpen={() => openUpgradePrompt(fullReportPrompt)}
                        />
                      )}

                      {isProtectTier && protectExtras && protectExtras.deeper_rewrites.length > 0 && (
                        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
                          <p className="text-sm font-semibold text-[var(--pt-ink)]">Rewrite Options</p>
                          <p className="mt-1 text-xs text-[var(--pt-muted)]">For each risk area — push hard, find middle ground, or hold the line.</p>
                          <div className="mt-3 space-y-4">
                            {protectExtras.deeper_rewrites.map((rw) => (
                              <div key={rw.id} className="rounded-lg border border-[var(--pt-border)] bg-white p-3">
                                <p className="text-sm font-semibold text-[var(--pt-ink)]">{rw.issue}</p>
                                {rw.alternatives ? (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                    <div className="rounded-md border border-[#efc1b6] bg-[#fff0ee] px-2.5 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9e3f2d]">Push hard</p>
                                      <p className="mt-1 text-xs leading-5 text-[#7f2e1f]">{rw.alternatives.aggressive}</p>
                                    </div>
                                    <div className="rounded-md border border-[#ead3a1] bg-[#fff9ef] px-2.5 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8c6526]">Middle ground</p>
                                      <p className="mt-1 text-xs leading-5 text-[#6e4f1e]">{rw.alternatives.balanced}</p>
                                    </div>
                                    <div className="rounded-md border border-[#b2ddd4] bg-[#edf8f5] px-2.5 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1d655f]">Hold the line</p>
                                      <p className="mt-1 text-xs leading-5 text-[#154f4a]">{rw.alternatives.minimum}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-1 text-sm leading-6 text-[var(--pt-muted)]">{rw.suggestion}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </article>
                      )}

                      {isProtectTier && protectExtras && protectExtras.fallback_positions.length > 0 && (
                        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
                          <p className="text-sm font-semibold text-[var(--pt-ink)]">Fallback Positions</p>
                          <p className="mt-1 text-xs text-[var(--pt-muted)]">Use these as your negotiating floor if the other side pushes back.</p>
                          <ul className="mt-3 space-y-2">
                            {protectExtras.fallback_positions.map((pos) => (
                              <li key={pos.id} className="rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2.5 text-sm leading-6 text-[var(--pt-ink)]/85">
                                {annotateLegalTerms(pos.position, `fallback-${pos.id}`)}
                              </li>
                            ))}
                          </ul>
                        </article>
                      )}

                      {!isProtectTier && (
                        <LockedDisclosure
                          title="Rewrite options"
                          meta={REPORT_TIER_NAMES.protect_99}
                          description="Open fallback language options and negotiating positions for the highest-priority risk areas."
                          onOpen={() => openUpgradePrompt(rewriteOptionsPrompt)}
                        />
                      )}

                    </>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                      <div className="flex items-start gap-3">
                        <Image
                          src="/graphics/icon-shield.svg"
                          alt=""
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-lg border border-emerald-200 bg-white p-1.5"
                        />
                        <div>
                          <p className="text-base font-semibold text-emerald-900">
                            Your contract looks great.
                          </p>
                          <p className="mt-1 text-sm text-emerald-800">
                            No high-priority red flags were identified in this automated review.
                            You can still check the full terms for nuance before signing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeReportTab === "terms" && (
                <>
                  {clauseBreakdown.length > 0 ? (
                    <>
                      <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
                        <p className="text-sm font-semibold text-[var(--pt-ink)]">Term Coverage Snapshot</p>
                        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                          {/* SVG donut chart */}
                          <div className="mx-auto flex flex-col items-center gap-1.5">
                            <div className="relative h-22 w-22">
                              <svg className="-rotate-90 h-full w-full" viewBox="0 0 36 36">
                                {/* Track */}
                                <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#e8e0d4" strokeWidth="3.4" />
                                {/* Present */}
                                {presentClauseCount > 0 && (
                                  <circle
                                    cx="18" cy="18" r="15.9" fill="transparent"
                                    stroke="#2ba59f" strokeWidth="3.4"
                                    strokeDasharray={`${(presentClauseCount / clauseBreakdown.length) * 100} ${100 - (presentClauseCount / clauseBreakdown.length) * 100}`}
                                    strokeDashoffset="0"
                                  />
                                )}
                                {/* Unclear */}
                                {unclearClauseCount > 0 && (
                                  <circle
                                    cx="18" cy="18" r="15.9" fill="transparent"
                                    stroke="#d8a84b" strokeWidth="3.4"
                                    strokeDasharray={`${(unclearClauseCount / clauseBreakdown.length) * 100} ${100 - (unclearClauseCount / clauseBreakdown.length) * 100}`}
                                    strokeDashoffset={`${-(presentClauseCount / clauseBreakdown.length) * 100}`}
                                  />
                                )}
                                {/* Missing */}
                                {missingClauseCount > 0 && (
                                  <circle
                                    cx="18" cy="18" r="15.9" fill="transparent"
                                    stroke="#e7745c" strokeWidth="3.4"
                                    strokeDasharray={`${(missingClauseCount / clauseBreakdown.length) * 100} ${100 - (missingClauseCount / clauseBreakdown.length) * 100}`}
                                    strokeDashoffset={`${-((presentClauseCount + unclearClauseCount) / clauseBreakdown.length) * 100}`}
                                  />
                                )}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold leading-none text-[var(--pt-ink)]">
                                  {clauseBreakdown.length}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wide text-[var(--pt-muted)]">Total clauses</p>
                          </div>
                          {/* Stat cards */}
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-md border border-[#b2ddd4] bg-[#e1f4ef] px-3 py-2.5">
                              <p className="text-xs text-[#1d655f]">Present</p>
                              <p className="text-xl font-semibold leading-tight text-[#154f4a]">{presentClauseCount}</p>
                            </div>
                            <div className="rounded-md border border-[#ead3a1] bg-[#fff4df] px-3 py-2.5">
                              <p className="text-xs text-[#8c6526]">Unclear</p>
                              <p className="text-xl font-semibold leading-tight text-[#6e4f1e]">{unclearClauseCount}</p>
                            </div>
                            <div className="rounded-md border border-[#efc1b6] bg-[#ffe8e3] px-3 py-2.5">
                              <p className="text-xs text-[#9e3f2d]">Missing</p>
                              <p className="text-xl font-semibold leading-tight text-[#7f2e1f]">{missingClauseCount}</p>
                            </div>
                          </div>
                        </div>
                      </article>

                      {clauseBreakdown.map((clause) => (
                        <article key={clause.key} className="pt-card-soft p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-base font-semibold text-[var(--pt-ink)]">
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
                          <p className="mt-2 text-[15px] leading-6 text-[var(--pt-ink)]/85">
                            {annotateLegalTerms(clause.what_it_means, `terms-meaning-${clause.key}`)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/75">
                            <strong className="text-[var(--pt-ink)]">Watch for:</strong>{" "}
                            {annotateLegalTerms(clause.why_it_matters, `terms-watch-${clause.key}`)}
                          </p>
                        </article>
                      ))}

                      {isCoreTier && (
                        <LockedDisclosure
                          title="Complete term explanations"
                          meta={REPORT_TIER_NAMES.report_69}
                          description="Open missing and unclear terms with full explanations, watch-for notes, and source-backed context."
                          onOpen={() => openUpgradePrompt(fullReportPrompt)}
                        />
                      )}

                      {isProtectTier && protectExtras && protectExtras.advanced_clause_coverage.length > 0 && (
                        <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
                          <p className="text-sm font-semibold text-[var(--pt-ink)]">Advanced Clause Coverage</p>
                          <p className="mt-1 text-xs text-[var(--pt-muted)]">Extended clause analysis for complex risk areas in this agreement.</p>
                          <ul className="mt-3 space-y-2">
                            {protectExtras.advanced_clause_coverage.map((clause, idx) => (
                              <li
                                key={`adv-clause-${idx}`}
                                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--pt-border)] bg-white px-3 py-2"
                              >
                                <p className="text-sm text-[var(--pt-ink)]">{clause.title ?? clause.key}</p>
                                {clause.status && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${clauseStatusClass(
                                      clause.status as "present" | "unclear" | "missing"
                                    )}`}
                                  >
                                    {clause.status}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </article>
                      )}

                      {!isCoreTier && !isProtectTier && (
                        <LockedDisclosure
                          title="Advanced clause coverage"
                          meta={REPORT_TIER_NAMES.protect_99}
                          description="Open extended clause checks for complex risk areas and edge-case contract language."
                          onOpen={() => openUpgradePrompt(protectPlanPrompt)}
                        />
                      )}
                    </>
                  ) : (
                    <div className="pt-card-soft p-3 text-sm text-[var(--pt-muted)]">
                      No clause breakdown is available for this report.
                    </div>
                  )}
                </>
              )}

              {activeReportTab === "document" && (
                isCoreTier ? (
                  <LockedDisclosure
                    title="Document review"
                    meta={REPORT_TIER_NAMES.report_69}
                    description="Open the contract text with risk areas highlighted and suggested wording changes where available."
                    onOpen={() => openUpgradePrompt(documentReviewPrompt)}
                  />
                ) : documentReviewContent
              )}

              {activeReportTab === "questions" && (
                <>
                  {questionsToAsk.length > 0 ? (
                    <>
                      <article className="rounded-lg border border-(--pt-border) bg-(--pt-surface-soft) px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">Questions to raise with the other party</p>
                        <p className="mt-1 text-sm text-(--pt-muted)">
                          Before you sign, bring these questions to the other party — the contractor, company, or individual offering this agreement. You can ask them in a call or use the email draft below to send them in writing.
                        </p>
                      </article>

                      <div className="space-y-2">
                        {questionsToAsk.map((question, idx) => (
                          <details key={`question-${idx}`} className="group rounded-xl border border-(--pt-border) bg-(--pt-surface)">
                            <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-(--pt-border) bg-(--pt-surface-soft) text-[11px] font-bold text-(--pt-muted)">
                                {idx + 1}
                              </span>
                              <span className="flex-1 text-[15px] leading-6 text-foreground">
                                {annotateLegalTerms(question, `question-summary-${idx}`)}
                              </span>
                              <svg
                                className="mt-1 h-4 w-4 shrink-0 text-(--pt-muted) transition-transform group-open:rotate-180"
                                viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                              >
                                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </summary>
                            <div className="border-t border-(--pt-border) px-4 py-3 pl-12">
                              <p className="text-xs font-semibold uppercase tracking-wide text-(--pt-muted)">Why ask this</p>
                              <p className="mt-1 text-sm text-(--pt-muted)">
                                This question helps clarify a term or gap identified in the contract. Their answer will tell you whether the agreement matches what was discussed verbally.
                              </p>
                            </div>
                          </details>
                        ))}
                      </div>

                      {isProtectTier ? (
                        <article className="rounded-lg border border-(--pt-border) bg-(--pt-surface-soft) px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">Send these questions by email</p>
                          <p className="mt-1 text-sm text-(--pt-muted)">
                            Generate a ready-to-send email addressed to the other party, covering the questions above and your key negotiation points.
                          </p>
                          <button
                            id="questions-email-draft-button"
                            type="button"
                            onClick={() => activateAddon("update_email")}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-(--pt-border) bg-white px-3 py-2 text-sm font-semibold text-foreground hover:border-(--pt-accent)"
                          >
                            <Image src="/graphics/icon-search.svg" alt="" width={16} height={16} className="h-4 w-4" />
                            Generate negotiation email
                          </button>
                          {addonNotice ? (
                            <p className="mt-2 text-[11px] text-(--pt-muted)">{addonNotice}</p>
                          ) : null}
                        </article>
                      ) : (
                        <LockedDisclosure
                          title="Negotiation email"
                          meta={REPORT_TIER_NAMES.protect_99}
                          description="Open a ready-to-send email that turns these questions and risk findings into requested contract changes."
                          onOpen={() => openUpgradePrompt(emailDraftPrompt)}
                        />
                      )}

                      {activeEmailDraft ? (
                        <article className="rounded-lg border border-(--pt-border) bg-(--pt-surface-soft) p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Negotiation email draft</p>
                              <p className="text-xs text-(--pt-muted)">Review and personalize before sending.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={copyAddonDraft}
                                className="rounded-md border border-(--pt-border) bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:border-(--pt-accent)"
                              >
                                {copied ? "Copied" : "Copy"}
                              </button>
                              <button
                                type="button"
                                onClick={dismissAddonDraft}
                                className="rounded-md border border-(--pt-border) bg-white px-2.5 py-1 text-xs font-semibold text-(--pt-muted) hover:text-foreground"
                              >
                                Hide
                              </button>
                            </div>
                          </div>
                          {(() => {
                            const parsed = parseEmailDraft(activeEmailDraft.content);
                            return (
                              <div className="mt-3 rounded-lg border border-(--pt-border) bg-white">
                                {parsed.subject ? (
                                  <div className="border-b border-(--pt-border) bg-(--pt-surface-soft) px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-(--pt-muted)">Subject</p>
                                    <p className="mt-0.5 text-sm font-semibold text-foreground">{parsed.subject}</p>
                                  </div>
                                ) : null}
                                <div className="px-3 py-3">
                                  <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                                    {parsed.body || activeEmailDraft.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </article>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {isProtectTier ? (
                        <article className="rounded-lg border border-(--pt-border) bg-(--pt-surface-soft) px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">Send your negotiation points by email</p>
                          <p className="mt-1 text-sm text-(--pt-muted)">
                            No specific questions were flagged for this contract, but you can still generate a negotiation email covering the key risks identified in this review.
                          </p>
                          <button
                            id="questions-email-draft-button"
                            type="button"
                            onClick={() => activateAddon("update_email")}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-(--pt-border) bg-white px-3 py-2 text-sm font-semibold text-foreground hover:border-(--pt-accent)"
                          >
                            <Image src="/graphics/icon-search.svg" alt="" width={16} height={16} className="h-4 w-4" />
                            Generate negotiation email
                          </button>
                          {addonNotice ? (
                            <p className="mt-2 text-[11px] text-(--pt-muted)">{addonNotice}</p>
                          ) : null}
                        </article>
                      ) : (
                        <LockedDisclosure
                          title="Negotiation email"
                          meta={REPORT_TIER_NAMES.protect_99}
                          description="Open a ready-to-send email that turns the risk findings into requested contract changes."
                          onOpen={() => openUpgradePrompt(emailDraftPrompt)}
                        />
                      )}

                      {activeEmailDraft ? (
                        <article className="rounded-lg border border-(--pt-border) bg-(--pt-surface-soft) p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Negotiation email draft</p>
                              <p className="text-xs text-(--pt-muted)">Review and personalize before sending.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={copyAddonDraft}
                                className="rounded-md border border-(--pt-border) bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:border-(--pt-accent)"
                              >
                                {copied ? "Copied" : "Copy"}
                              </button>
                              <button
                                type="button"
                                onClick={dismissAddonDraft}
                                className="rounded-md border border-(--pt-border) bg-white px-2.5 py-1 text-xs font-semibold text-(--pt-muted) hover:text-foreground"
                              >
                                Hide
                              </button>
                            </div>
                          </div>
                          {(() => {
                            const parsed = parseEmailDraft(activeEmailDraft.content);
                            return (
                              <div className="mt-3 rounded-lg border border-(--pt-border) bg-white">
                                {parsed.subject ? (
                                  <div className="border-b border-(--pt-border) bg-(--pt-surface-soft) px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-(--pt-muted)">Subject</p>
                                    <p className="mt-0.5 text-sm font-semibold text-foreground">{parsed.subject}</p>
                                  </div>
                                ) : null}
                                <div className="px-3 py-3">
                                  <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                                    {parsed.body || activeEmailDraft.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </article>
                      ) : null}
                    </>
                  )}
                </>
              )}

              {activeReportTab === "full" && (
                <>
                  {isCoreTier && (
                    <LockedDisclosure
                      title="Complete clause view"
                      meta={REPORT_TIER_NAMES.report_69}
                      description="Open all detected clauses, including missing and unclear terms, with evidence snippets and plain-English notes."
                      onOpen={() => openUpgradePrompt(fullReportPrompt)}
                    />
                  )}
                  <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/graphics/icon-doc.svg"
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-md border border-[var(--pt-border)] bg-white p-1"
                      />
                      <p className="text-sm font-semibold text-[var(--pt-ink)]">Complete Clause View</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--pt-ink)]/80">
                      This view includes all detected clauses with plain-English meaning and evidence snippets.
                    </p>
                  </article>

                  <article className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-3">
                    <p className="text-sm font-semibold text-[var(--pt-ink)]">Report Composition</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">Clauses analyzed</p>
                        <p className="text-lg font-semibold text-[#374175]">{clauseBreakdown.length}</p>
                      </div>
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">With evidence</p>
                        <p className="text-lg font-semibold text-[#374175]">{evidenceClauseCount}</p>
                      </div>
                      <div className="rounded-md border border-[#d8dff5] bg-white px-3 py-2">
                        <p className="text-xs text-[#54629b]">Supporting notes</p>
                        <p className="text-lg font-semibold text-[#374175]">{reportSupportingSections.length}</p>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full border border-[#d8dff5] bg-white">
                      <div className="h-2 bg-[#5d73c8]" style={{ width: `${Math.max(evidenceCoveragePct, 4)}%` }} />
                    </div>
                  </article>

                  {clauseBreakdown.map((clause) => (
                    <article
                      key={`full-${clause.key}`}
                      className="rounded-md border border-[var(--pt-border)] bg-white p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-[var(--pt-ink)]">
                        {annotateLegalTerms(clause.title, `full-title-${clause.key}`)}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${clauseStatusClass(
                            clause.status
                          )}`}
                        >
                          {clause.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[15px] leading-6 text-[var(--pt-ink)]/85">
                        {annotateLegalTerms(clause.what_it_means, `full-meaning-${clause.key}`)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--pt-ink)]/75">
                        <strong className="text-[var(--pt-ink)]">Why it matters:</strong>{" "}
                        {annotateLegalTerms(clause.why_it_matters, `full-why-${clause.key}`)}
                      </p>
                      {clause.evidence && (
                        <blockquote className="mt-2 border-l-2 border-[var(--pt-border)] pl-3 text-xs text-[var(--pt-muted)]">
                          {annotateLegalTerms(clause.evidence, `full-evidence-${clause.key}`)}
                        </blockquote>
                      )}
                    </article>
                  ))}

                  {/* Technical Extraction Notes — hidden from users, uncomment for debugging parser output
                  {reportSupportingSections.length > 0 && (
                    <article className="pt-card-soft p-3">
                      <h3 className="text-base font-semibold text-[var(--pt-ink)]">Technical Extraction Notes (Optional)</h3>
                      <p className="mt-1 text-sm text-[var(--pt-ink)]/75">
                        This section shows what the parser detected in the source document. It is mainly diagnostic metadata.
                      </p>
                      <div className="mt-2 space-y-2">
                        {reportSupportingSections.map((section) => (
                          <details
                            key={`support-${section.key}`}
                            className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface)] p-3"
                          >
                            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
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
                            </summary>
                            <p className="mt-2 text-[15px] leading-6 text-[var(--pt-ink)]/85">
                              {annotateLegalTerms(section.body, `support-body-${section.key}`)}
                            </p>
                          </details>
                        ))}
                      </div>
                    </article>
                  )}
                  */}

                  <p className="text-xs text-[var(--pt-muted)]">
                    This secure result link remains available for up to {retentionDays} days.
                    Save or bookmark it to revisit your results during that period.
                    Account-based result history is coming soon.
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-3 text-xl text-[var(--pt-ink)]">
              {activeBasicTab === "summary" && "Summary"}
              {activeBasicTab === "supporting" && "Supporting Details"}
              {activeBasicTab === "document" && "Document Review"}
            </h2>
            <div className="space-y-3">
              {activeBasicTab === "summary" ? (
                <article className="pt-card-soft p-3 text-sm text-[var(--pt-muted)]">
                  {annotateLegalTerms(data.overview, "basic-overview")}
                </article>
              ) : activeBasicTab === "document" ? (
                documentReviewContent
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
    </>
  );
}
