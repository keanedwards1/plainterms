"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PtReviewIssue } from "@/lib/plainterms-schema";
import { findLoose } from "@/lib/contractText";
import { G } from "@/components/review/Glossed";
import { SevChip } from "@/components/review/parts";


type Props = {
  text: string;
  issues: PtReviewIssue[];
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

export default function ContractNotes({ text, issues, fileLabel }: Props) {
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
    // Number and list the notes in reading order, so each sits beside its highlight.
    return out.sort((a, b) => a.start - b.start).map((m, i) => ({ ...m, n: i + 1 }));
  }, [text, issues]);

  // Line each margin note up with its highlight, without overlapping.
  const place = useCallback(() => {
    const split = splitRef.current;
    const page = pageRef.current;
    const margin = marginRef.current;
    if (!split || !page || !margin) return;
    // Phones stack the notes under the contract; only wide screens line them up.
    if (window.matchMedia("(max-width: 1100px)").matches) {
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
  }, [marks]);

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

  return (
    <div>
      <div className="rv-dvbar">
        <span className="rv-sp" />
        <span className="rv-label">{fileLabel}</span>
      </div>
      <div className="rv-split" ref={splitRef}>
        <article ref={pageRef} className="pt-framed rv-page" aria-label="Contract">
          {renderMarked(text, marks, active, setActive)}
        </article>
        <aside ref={marginRef} className="rv-margin" aria-label="Notes">
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
