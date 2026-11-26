"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PtReviewIssue } from "@/lib/plainterms-schema";
import { blockParts, locateRedlines, redlineBlocks } from "@/lib/redline";
import { acceptAll, type DiffPart } from "@/lib/wordDiff";
import { contractDocx } from "@/lib/exportDocx";
import { G } from "@/components/review/Glossed";
import { ICONS, Icon, SevChip, type Sev } from "@/components/review/parts";

const ZOOMS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
const SEV_RANK: Record<Sev, number> = { high: 0, medium: 1, low: 2 };

type Props = {
  text: string;
  issues: PtReviewIssue[];
  picked: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  fileBase: string;
};

function Parts({ parts }: { parts: DiffPart[] }) {
  return (
    <>
      {parts.map((part, i) =>
        part.type === "eq" ? (
          <G key={i}>{part.text}</G>
        ) : part.type === "del" ? (
          <del key={i}>{part.text}</del>
        ) : (
          <ins key={i}>
            <G>{part.text}</G>
          </ins>
        )
      )}
    </>
  );
}

/** The contract with the picked changes written in, ready to edit and download. */
export default function RedlineEditor({ text, issues, picked, onToggle, fileBase }: Props) {
  const [clean, setClean] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const deskRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => redlineBlocks(text, locateRedlines(text, issues)), [text, issues]);
  const partsByBlock = useMemo(() => blocks.map((b) => blockParts(b, picked, edits)), [blocks, picked, edits]);
  const changeCount = blocks.reduce((n, b) => n + b.items.filter((i) => picked.has(i.issue.id)).length, 0);

  // Pinch on a trackpad (or ctrl+scroll) inside the contract zooms it; plain scrolling still moves the page at the ends.
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(2, Math.max(0.8, z * (1 - e.deltaY * 0.01))));
    };
    desk.addEventListener("wheel", onWheel, { passive: false });
    return () => desk.removeEventListener("wheel", onWheel);
  }, []);

  const step = (up: boolean) =>
    setZoom((z) => (up ? (ZOOMS.find((s) => s > z + 0.01) ?? 2) : ([...ZOOMS].reverse().find((s) => s < z - 0.01) ?? 0.8)));

  const cleanText = () => partsByBlock.map((p) => acceptAll(p)).join("\n\n");

  async function copyClean() {
    try {
      await navigator.clipboard.writeText(cleanText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function downloadWord() {
    setBusy(true);
    try {
      const blob = await contractDocx(partsByBlock, "You");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase} (marked up).docx`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="rv-rl-tools">
        <div className="rv-seg" role="group" aria-label="Contract view">
          <button type="button" aria-pressed={!clean} onClick={() => setClean(false)}>
            Marked up
          </button>
          <button type="button" aria-pressed={clean} onClick={() => setClean(true)}>
            Clean
          </button>
        </div>
        <span className="rv-label rv-rl-hint">
          {changeCount} change{changeCount === 1 ? "" : "s"} · tick, untick or edit
        </span>
        <div className="rv-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" disabled={zoom <= 0.8} onClick={() => step(false)}>
            −
          </button>
          <button type="button" className="rv-zv" aria-label="Reset zoom" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => step(true)}>
            +
          </button>
        </div>
      </div>

      <div className={`rv-desk ${clean ? "rv-clean" : ""}`} ref={deskRef}>
        <div className="rv-paper" style={{ ["--z" as string]: zoom }}>
          {blocks.map((block, bi) => {
            if (block.items.length === 0) return <p key={bi}>{<G>{block.paragraph.text}</G>}</p>;
            const on = block.items.filter((i) => picked.has(i.issue.id));
            const sev = [...block.items].sort((a, b) => SEV_RANK[a.issue.severity] - SEV_RANK[b.issue.severity])[0].issue.severity;
            return (
              <div key={bi} className="rv-rl-sec" data-sev={sev} data-off={on.length === 0}>
                {block.items.map(({ issue }) => (
                  <div key={issue.id}>
                    <div className="rv-rl-bar">
                      <label className="rv-rl-keep">
                        <input type="checkbox" checked={picked.has(issue.id)} onChange={(e) => onToggle(issue.id, e.target.checked)} />
                        {issue.section_ref ? `§${issue.section_ref}` : "Change"}
                      </label>
                      <SevChip sev={issue.severity} />
                      <span>
                        <G>{issue.title}</G>
                      </span>
                      <button
                        type="button"
                        className="rv-rl-edit"
                        aria-expanded={editing === issue.id}
                        onClick={() => {
                          if (!picked.has(issue.id)) onToggle(issue.id, true);
                          setEditing(editing === issue.id ? null : issue.id);
                        }}
                      >
                        {editing === issue.id ? "Done" : "Edit"}
                      </button>
                    </div>
                    {editing === issue.id ? (
                      <textarea
                        className="rv-rl-text"
                        aria-label={`Your wording for ${issue.title}`}
                        rows={4}
                        value={edits[issue.id] ?? issue.redline?.after ?? ""}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [issue.id]: e.target.value }))}
                      />
                    ) : null}
                  </div>
                ))}
                <p>
                  <Parts parts={partsByBlock[bi]} />
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rv-acts">
        <button type="button" className="pt-btn pt-btn-outline h-10 px-4 text-sm" onClick={copyClean}>
          <Icon d={ICONS.copy} />
          {copied ? "Copied" : "Copy clean text"}
        </button>
        <button type="button" className="pt-btn pt-btn-outline h-10 px-4 text-sm" onClick={() => window.print()}>
          <Icon d={ICONS.download} />
          PDF
        </button>
        <button type="button" className="pt-btn pt-btn-solid h-10 px-4 text-sm" onClick={downloadWord} disabled={busy}>
          <Icon d={ICONS.download} />
          {busy ? "Preparing…" : "Download Word (.docx)"}
        </button>
      </div>
      <p className="rv-quiet mt-2.5">
        <G>The Word file keeps your edits as tracked changes, so the other side can accept or reject each one.</G>
      </p>
      <p role="status" className="sr-only">
        {copied ? "Clean text copied" : ""}
      </p>

      <div className="rv-print" aria-hidden="true">
        {partsByBlock.map((p, i) => (
          <p key={i}>{acceptAll(p)}</p>
        ))}
      </div>
    </div>
  );
}
