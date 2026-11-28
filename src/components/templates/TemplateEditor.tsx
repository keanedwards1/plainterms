"use client";

import "./templates.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import TemplateDocument, { type RenderBlank } from "@/components/templates/TemplateDocument";
import { MAX_LENGTH, cleanValue, fileName, readDraft } from "@/lib/templateKit/fill";
import type { TemplateDoc, TemplateField, TemplateValues } from "@/lib/templateKit/types";

// Answers wait here only while someone signs in to download, then are removed. Session storage
// is per tab and is cleared when the tab closes.
const DRAFT_KEY = "pt.templateDraft";
// A US Letter page on screen (96px per inch), and its 0.75in top and bottom margins.
const PAGE_PX = 11 * 96;
const MARGINS_PX = 1.5 * 96;
const noop = () => () => {};

const INPUT_TYPE: Partial<Record<TemplateField["type"], string>> = { date: "date", email: "email", phone: "tel" };

/** A blank in the document you can click and type into. Every copy of the same blank stays in sync. */
function BlankInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const common = {
    value,
    "aria-label": field.label,
    title: field.hint ?? field.label,
    placeholder: field.label,
    maxLength: MAX_LENGTH[field.type],
    autoComplete: "off",
    "data-blank": field.id,
    "data-empty": value.trim() ? undefined : "true",
  };
  if (field.type === "long") {
    const rows = Math.max(2, value.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 78)), 0));
    return <textarea {...common} rows={rows} className="pt-blank pt-blank-long" onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      {...common}
      type={INPUT_TYPE[field.type] ?? "text"}
      inputMode={field.type === "money" ? "decimal" : field.type === "number" ? "numeric" : undefined}
      size={Math.max(4, (value || field.label).length + 1)}
      className={field.type === "date" ? "pt-blank pt-blank-date" : "pt-blank"}
      spellCheck={field.type === "text"}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Toolbar({
  filled,
  total,
  pages,
  signedIn,
  busy,
  onNext,
  onClear,
  onWord,
  onPrint,
  onSignIn,
}: {
  filled: number;
  total: number;
  pages: number;
  signedIn: boolean;
  busy: boolean;
  onNext: () => void;
  onClear: () => void;
  onWord: () => void;
  onPrint: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="pt-teditor-bar" role="toolbar" aria-label="Document">
      <div className="pt-teditor-status">
        <span>
          {filled} of {total} filled in
        </span>
        <span className="pt-teditor-meter" aria-hidden="true">
          <i style={{ width: `${total ? Math.round((filled / total) * 100) : 0}%` }} />
        </span>
        <span className={pages > 2 ? "pt-teditor-pages pt-teditor-over" : "pt-teditor-pages"}>
          {pages > 2 ? `${pages} pages: shorten long answers to fit 2` : `${pages} ${pages === 1 ? "page" : "pages"} · Letter`}
        </span>
      </div>
      <div className="pt-teditor-actions">
        <button type="button" className="pt-btn pt-btn-ghost px-3 py-2 text-sm" onClick={onNext} disabled={filled === total}>
          Next blank
        </button>
        {filled ? (
          <button type="button" className="pt-btn pt-btn-ghost px-3 py-2 text-sm" onClick={onClear}>
            Clear
          </button>
        ) : null}
        {signedIn ? (
          <>
            <button type="button" className="pt-btn pt-btn-outline px-3.5 py-2 text-sm" onClick={onPrint}>
              Print or PDF
            </button>
            <button type="button" className="pt-btn pt-btn-solid px-3.5 py-2 text-sm" onClick={onWord} disabled={busy} aria-busy={busy}>
              {busy ? "Making file…" : "Download Word"}
            </button>
          </>
        ) : (
          <button type="button" className="pt-btn pt-btn-solid px-3.5 py-2 text-sm" onClick={onSignIn}>
            Sign in to download
          </button>
        )}
      </div>
    </div>
  );
}

export default function TemplateEditor({ doc, signedIn }: { doc: TemplateDoc; signedIn: boolean }) {
  const [values, setValues] = useState<TemplateValues>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState(1);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Back from signing in: put the answers back, then forget the stored copy.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(DRAFT_KEY);
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const draft = readDraft(doc, JSON.parse(raw));
      // Restoring after a redirect is a one-off sync from storage into state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (draft) setValues(draft.values);
    } catch {
      // A damaged draft is ignored.
    }
  }, [doc]);

  // How many Letter pages the text fills, for the page breaks and the toolbar. Measured from the text
  // itself, so the page can shrink back when answers get shorter.
  const contentRef = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;
    const measure = () => {
      const paged = window.matchMedia("(min-width: 900px)").matches;
      setPages(paged ? Math.max(1, Math.ceil((content.offsetHeight + MARGINS_PX - 2) / PAGE_PX)) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const byId = new Map(doc.fields.map((f) => [f.id, f]));
  const set = useCallback((field: TemplateField, v: string) => setValues((prev) => ({ ...prev, [field.id]: cleanValue(field, v) })), []);
  const renderBlank: RenderBlank = (piece, key) => {
    const field = byId.get(piece.field.id) ?? piece.field;
    return <BlankInput key={key} field={field} value={values[field.id] ?? ""} onChange={(v) => set(field, v)} />;
  };

  const filled = doc.fields.filter((f) => values[f.id]?.trim()).length;

  // Jump to the next empty blank after the one in focus, wrapping to the top.
  const nextBlank = () => {
    const blanks = [...(sheetRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-blank]") ?? [])];
    const empty = blanks.filter((el) => !el.value.trim());
    if (!empty.length) return;
    const current = blanks.indexOf(document.activeElement as HTMLInputElement);
    const target = empty.find((el) => blanks.indexOf(el) > current) ?? empty[0];
    target.focus();
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const signIn = () => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ slug: doc.slug, version: doc.version, values }));
    } catch {
      // Without storage they'll fill it in again after signing in.
    }
    // /sign-in is a route handler that redirects to the sign-in provider, so it needs a full page load.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/sign-in?returnTo=${encodeURIComponent(`/templates/${doc.slug}`)}`);
  };

  const downloadWord = async () => {
    setBusy(true);
    setError(null);
    try {
      const { templateDocx } = await import("@/lib/templateKit/docx");
      const blob = await templateDocx(doc, values);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(doc, "docx");
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("The Word file couldn't be made. Try again, or use Print to save a PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-teditor">
      <Toolbar
        filled={filled}
        total={doc.fields.length}
        pages={pages}
        signedIn={signedIn}
        busy={busy}
        onNext={nextBlank}
        onClear={() => setValues({})}
        onWord={downloadWord}
        onPrint={() => window.print()}
        onSignIn={signIn}
      />
      {error ? (
        <p role="alert" className="pt-teditor-error">
          {error}
        </p>
      ) : null}

      <div className="pt-teditor-body">
        <div className="pt-teditor-canvas">
          <div ref={sheetRef} className="pt-tsheet" style={{ "--pt-pages": pages } as React.CSSProperties}>
            <form ref={contentRef} onSubmit={(e) => e.preventDefault()} autoComplete="off">
              <TemplateDocument doc={doc} values={values} renderBlank={renderBlank} className="pt-tdoc-edit" />
            </form>
            {Array.from({ length: pages - 1 }, (_, i) => (
              <div key={i} className="pt-tsheet-break" style={{ top: `${(i + 1) * PAGE_PX}px` }} aria-hidden="true">
                <span>Page {i + 2}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="pt-teditor-side" aria-labelledby="before-heading">
          <h2 id="before-heading">Before you use this</h2>
          <ul>
            {doc.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="pt-teditor-legal">
            PlainTerms is not a law firm, and this template is not legal advice. It is a general starting point that may not fit your
            situation or meet every rule where you live. Read the whole document before you sign it, and talk to a lawyer if a lot is at
            stake.
          </p>
          {doc.basedOn ? <p className="pt-teditor-source">Based on {doc.basedOn}</p> : null}
          <p className="pt-teditor-source">Click any highlighted blank to type. Anything left blank prints as a line to fill in by hand.</p>
          {signedIn ? null : <p className="pt-teditor-source">Downloading needs a free account. Your answers stay on this device and come back after you sign in.</p>}
        </aside>
      </div>

      {/* What prints: the plain document, with lines for anything left blank. It sits directly in <body>
          so printing can hide the rest of the app entirely, with no empty pages. */}
      {mounted
        ? createPortal(
            <div className="pt-print-root">
              <TemplateDocument doc={doc} values={values} className="pt-tdoc-print" />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
