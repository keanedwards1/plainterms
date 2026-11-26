"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PtResult, PtReviewIssue } from "@/lib/plainterms-schema";
import { findLoose } from "@/lib/contractText";
import { diffWords } from "@/lib/wordDiff";
import { G } from "@/components/review/Glossed";
import { SevChip } from "@/components/review/parts";

type Revision = NonNullable<NonNullable<PtResult["document"]>["revision"]>;
type View = "original" | "tracked" | "revised";

type Props = {
  text: string;
  issues: PtReviewIssue[];
  revision?: Revision;
  canSeeRevision: boolean;
  onPro: (feature: string) => void;
  fileLabel: string;
};

type Mark = { n: number; issue: PtReviewIssue; start: number; end: number };

/** Original text with each issue's quote highlighted and numbered. */
function renderMarked(text: string, marks: Mark[], active: number, onPick: (n: number) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const m of [...marks].sort((a, b) => a.start - b.start)) {
    if (m.start > cursor) out.push(<G key={`t${cursor}`}>{text.slice(cursor, m.start)}</G>);
    out.push(
      <span
        key={`m${m.n}`}
        className={`rv-mk rv-${m.issue.severity}`}
        data-n={m.n}
        data-on={active === m.n}
        role="button"
        tabIndex={0}
        aria-label={`Issue ${m.n}: ${m.issue.title}`}
        onClick={() => onPick(m.n)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick(m.n);
          }
        }}
      >
        <G>{text.slice(m.start, m.end)}</G>
        <sup aria-hidden="true">{m.n}</sup>
      </span>
    );
    cursor = m.end;
  }
  if (cursor < text.length) out.push(<G key="tail">{text.slice(cursor)}</G>);
  return out;
}

/** Original text with the revised draft's changes shown as tracked edits. */
function renderTracked(text: string, revision: Revision): ReactNode[] {
  const taken: Array<{ start: number; end: number }> = [];
  const located = (revision.changes ?? [])
    .map((change) => {
      const range = findLoose(text, change.before, taken);
      if (!range) return null;
      taken.push(range);
      return { ...range, change };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => a.start - b.start);

  const out: ReactNode[] = [];
  let cursor = 0;
  located.forEach((loc, i) => {
    if (loc.start > cursor) out.push(<G key={`t${i}`}>{text.slice(cursor, loc.start)}</G>);
    const after = loc.change.after.replace(/\s*\n\s*/g, " ").trim();
    diffWords(text.slice(loc.start, loc.end), after).forEach((part, j) => {
      if (part.type === "eq") out.push(<G key={`c${i}-${j}`}>{part.text}</G>);
      else if (part.type === "del")
        out.push(
          <del key={`c${i}-${j}`} data-tip={loc.change.reason}>
            {part.text}
          </del>
        );
      else
        out.push(
          <ins key={`c${i}-${j}`} data-tip={loc.change.reason}>
            <G>{part.text}</G>
          </ins>
        );
    });
    cursor = loc.end;
  });
  if (cursor < text.length) out.push(<G key="tail">{text.slice(cursor)}</G>);
  return out;
}

export default function ContractNotes({ text, issues, revision, canSeeRevision, onPro, fileLabel }: Props) {
  const [view, setView] = useState<View>("original");
  const [active, setActive] = useState(1);
  const splitRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const marginRef = useRef<HTMLElement>(null);
  const noteRefs = useRef<Array<HTMLDivElement | null>>([]);

  const marks = useMemo(() => {
    const taken: Array<{ start: number; end: number }> = [];
    const out: Mark[] = [];
    issues.forEach((issue, i) => {
      const range = findLoose(text, issue.quote, taken);
      if (!range) return;
      taken.push(range);
      out.push({ n: i + 1, issue, ...range });
    });
    return out;
  }, [text, issues]);

  // Line each margin note up with its highlight, without overlapping.
  const place = useCallback(() => {
    const split = splitRef.current;
    const page = pageRef.current;
    const margin = marginRef.current;
    if (!split || !page || !margin) return;
    // Phones stack the notes under the contract; only wide screens line them up.
    if (view !== "original" || window.matchMedia("(max-width: 1100px)").matches) {
      noteRefs.current.forEach((note) => note?.style.removeProperty("top"));
      margin.style.removeProperty("min-height");
      return;
    }
    const top0 = split.getBoundingClientRect().top;
    let last = 0;
    marks.forEach((m, i) => {
      const note = noteRefs.current[i];
      const el = page.querySelector<HTMLElement>(`.rv-mk[data-n="${m.n}"]`);
      const y = Math.max(el ? el.getBoundingClientRect().top - top0 - 14 : last, last);
      if (note) note.style.top = `${y}px`;
      last = y + (note?.offsetHeight ?? 140) + 12;
    });
    margin.style.minHeight = `${last}px`;
  }, [marks, view]);

  useLayoutEffect(() => {
    place();
    const ro = new ResizeObserver(place);
    if (pageRef.current) ro.observe(pageRef.current);
    window.addEventListener("resize", place);
    void document.fonts?.ready.then(place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [place]);

  function pick(n: number, scroll = false) {
    setActive(n);
    if (scroll) {
      const el = pageRef.current?.querySelector(`.rv-mk[data-n="${n}"]`);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }

  const revisionBody = (() => {
    if (view === "original") return renderMarked(text, marks, active, setActive);
    const feature = view === "tracked" ? "Track changes" : "Revised draft";
    if (!canSeeRevision || !revision || revision.status === "not_available" || revision.locked) {
      return (
        <p className="rv-pro-note">
          Pro writes every fix into the contract{view === "tracked" ? ", shown as tracked changes" : " as a clean draft you can sign"}.
          <button type="button" className="rv-link font-semibold text-(--pt-ink) underline underline-offset-3" onClick={() => onPro(feature)}>
            See Pro
          </button>
        </p>
      );
    }
    if (revision.status === "processing") return <p className="rv-pro-note">Writing the revised draft. This usually takes a minute or two.</p>;
    if (revision.status !== "ready" || !revision.revised_text) {
      return <p className="rv-pro-note">{revision.message || "The revised draft isn't available for this document."}</p>;
    }
    if (view === "tracked") return renderTracked(text, revision);
    return <G>{revision.revised_text}</G>;
  })();

  return (
    <div>
      <div className="rv-dvbar">
        <div className="rv-seg" role="group" aria-label="Document view">
          {(
            [
              ["original", "Original"],
              ["tracked", "Track changes"],
              ["revised", "Revised"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </div>
        <span className="rv-sp" />
        <span className="rv-label">{fileLabel}</span>
      </div>
      <div className="rv-split" ref={splitRef}>
        <article ref={pageRef} className="pt-framed rv-page" aria-label="Contract">
          {revisionBody}
        </article>
        <aside ref={marginRef} className="rv-margin" aria-label="Notes" style={{ visibility: view === "original" ? "visible" : "hidden" }}>
          {marks.map((m, i) => (
            <div
              key={m.n}
              ref={(el) => {
                noteRefs.current[i] = el;
              }}
              className="rv-note"
              data-on={active === m.n}
              role="button"
              tabIndex={0}
              onClick={() => pick(m.n, true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(m.n, true);
                }
              }}
            >
              <div className="rv-note-row">
                <SevChip sev={m.issue.severity} prefix={`${m.n} · `} />
                {m.issue.section_ref ? <span className="rv-label">§{m.issue.section_ref}</span> : null}
              </div>
              <h4>
                <G>{m.issue.title}</G>
              </h4>
              <p>
                <G>{m.issue.why_short}</G>
              </p>
              {m.issue.usual ? (
                <p className="rv-fx">
                  <span className="rv-usual">Usual</span>
                  <span>
                    <G>{m.issue.usual}</G>
                  </span>
                </p>
              ) : null}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
