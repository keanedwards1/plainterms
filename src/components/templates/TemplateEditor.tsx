"use client";

import "./templates.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import SignatureDialog from "@/components/templates/SignatureDialog";
import TemplateDocument, { type RenderBlank, type RenderSignature } from "@/components/templates/TemplateDocument";
import { MAX_LENGTH, cleanValue, fileName, fill, readDraft, readSignatures, todayLabel } from "@/lib/templateKit/fill";
import type { Branding, Signatures, TemplateDoc, TemplateField, TemplateValues } from "@/lib/templateKit/types";

// Answers and signatures wait here only while someone signs in to download, then are removed.
// Session storage is per tab and is cleared when the tab closes.
const DRAFT_KEY = "pt.templateDraft";
// A US Letter page on screen (96px per inch), and its 0.75in top and bottom margins.
const PAGE_PX = 11 * 96;
const MARGINS_PX = 1.5 * 96;
const noop = () => () => {};

type Mode = "blank" | "fill";

// The PlainTerms mark, drawn to a PNG once for the PDF and Word footers.
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307 307"><rect x="5" y="5" width="297" height="297" fill="none" stroke="#e9783a" stroke-width="10"/><path fill="#e9783a" fill-rule="evenodd" d="M39,17H193A22,22 0 0 1 215,39V185A22,22 0 0 1 193,207H39A22,22 0 0 1 17,185V39A22,22 0 0 1 39,17ZM114,92H265A22,22 0 0 1 287,114V265A22,22 0 0 1 265,287H114A22,22 0 0 1 92,265V114A22,22 0 0 1 114,92Z"/></svg>';

function logoPng(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(undefined);
      ctx.drawImage(img, 0, 0, 96, 96);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(undefined);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;
  });
}

const INPUT_TYPE: Partial<Record<TemplateField["type"], string>> = { date: "date", email: "email", phone: "tel" };

/** A blank in the document you can click and type into. Every copy of the same blank stays in sync. */
function BlankInput({ field, value, onChange, onLine }: { field: TemplateField; value: string; onChange: (v: string) => void; onLine: boolean }) {
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
    const rows = Math.max(3, value.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 86)), 0));
    return <textarea {...common} rows={rows} className="pt-blank pt-blank-long" onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      {...common}
      type={INPUT_TYPE[field.type] ?? "text"}
      inputMode={field.type === "money" ? "decimal" : field.type === "number" ? "numeric" : undefined}
      size={Math.max(4, (value || field.label).length + 1)}
      className={`pt-blank${field.type === "date" ? " pt-blank-date" : ""}${onLine ? " pt-blank-line" : ""}`}
      spellCheck={field.type === "text"}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const PRINTER = "M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z";
const DOWNLOAD = "M12 4v11m0 0-4-4m4 4 4-4M5 20h14";

export default function TemplateEditor({ doc, signedIn, branded }: { doc: TemplateDoc; signedIn: boolean; branded: boolean }) {
  const [mode, setMode] = useState<Mode>("blank");
  const [values, setValues] = useState<TemplateValues>({});
  const [signatures, setSignatures] = useState<Signatures>({});
  const [signing, setSigning] = useState<{ key: string; role: string; name: string } | null>(null);
  const [busy, setBusy] = useState<"pdf" | "word" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState(1);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  // Back from signing in: put the answers and signatures back, then forget the stored copy.
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
      const parsed = JSON.parse(raw) as { mode?: unknown; signatures?: unknown };
      const draft = readDraft(doc, parsed);
      if (!draft) return;
      // Restoring after a redirect is a one-off sync from storage into state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(draft.values);
      setSignatures(readSignatures(doc, parsed.signatures));
      setMode(parsed.mode === "fill" ? "fill" : "blank");
    } catch {
      // A damaged draft is ignored.
    }
  }, [doc]);

  // How many Letter pages the text fills, for the page breaks and the toolbar.
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

  const byId = new Map(doc.fields.map((f) => [f.id, f]));
  const set = useCallback((field: TemplateField, v: string) => setValues((prev) => ({ ...prev, [field.id]: cleanValue(field, v) })), []);
  const renderBlank: RenderBlank = (piece, key, where) => {
    const field = byId.get(piece.field.id) ?? piece.field;
    return <BlankInput key={key} field={field} value={values[field.id] ?? ""} onChange={(v) => set(field, v)} onLine={where === "line"} />;
  };

  const nameFor = (key: string) => {
    const [b, p] = key.split(".").map(Number);
    const block = doc.body[b];
    const party = block?.t === "sign" ? block.parties[p] : undefined;
    return party?.name ? fill(party.name, doc, values).map((x) => (x.kind === "text" ? x.text : x.value)).join("").trim() : "";
  };
  const renderSignature: RenderSignature = (key, role) => {
    const mark = signatures[key];
    if (mark) {
      return (
        <span className="pt-sigset">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark.image} alt={`${role} signature`} className="pt-tdoc-sigimg" />
          <button
            type="button"
            className="pt-sigset-remove"
            onClick={() =>
              setSignatures((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              })
            }
          >
            Remove
          </button>
        </span>
      );
    }
    const tipId = `sign-tip-${key.replace(".", "-")}`;
    return (
      <span className="pt-tip">
        <button type="button" className="pt-sign-btn" aria-describedby={tipId} onClick={() => setSigning({ key, role, name: nameFor(key) })}>
          <Icon d="M4 18c3-1 5-9 8-9 2 0 0 7 3 7 1.5 0 2.5-2 4-2M4 21h16" />
          Sign as {role}
        </button>
        <span id={tipId} role="tooltip" className="pt-tip-bubble">
          <b>Sign only on your own line</b>
          Each person signs for themselves. After you sign, send the document to the other party so they can add their signature. Don&apos;t sign for anyone else unless they have authorized you to.
        </span>
      </span>
    );
  };

  const filling = mode === "fill";
  const outValues = filling ? values : {};
  const outSignatures = filling ? signatures : {};
  const filled = doc.fields.filter((f) => values[f.id]?.trim()).length;
  const signerCount = doc.body.reduce((n, b) => n + (b.t === "sign" ? b.parties.length : 0), 0);
  const signedCount = Object.keys(signatures).length;

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
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ slug: doc.slug, version: doc.version, values, signatures, mode }));
    } catch {
      // Without storage they'll fill it in again after signing in.
    }
    // /sign-in is a route handler that redirects to the sign-in provider, so it needs a full page load.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/sign-in?returnTo=${encodeURIComponent(`/templates/${doc.slug}`)}`);
  };

  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const download = async (kind: "pdf" | "word") => {
    setBusy(kind);
    setError(null);
    try {
      const brand: Branding = { show: branded, logo: branded ? await logoPng() : undefined };
      if (kind === "pdf") {
        const { templatePdf } = await import("@/lib/templateKit/pdf");
        save(await templatePdf(doc, outValues, outSignatures, brand), fileName(doc, "pdf", filling ? "" : "blank"));
      } else {
        const { templateDocx } = await import("@/lib/templateKit/docx");
        save(await templateDocx(doc, outValues, outSignatures, brand), fileName(doc, "docx", filling ? "" : "blank"));
      }
    } catch {
      setError(`The ${kind === "pdf" ? "PDF" : "Word file"} couldn't be made. Try again, or use Print.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pt-teditor">
      <div className="pt-teditor-bar" role="toolbar" aria-label="Document">
        <div className="pt-teditor-mode" role="radiogroup" aria-label="Version">
          <button type="button" role="radio" aria-checked={!filling} onClick={() => setMode("blank")}>
            Blank template
          </button>
          <button type="button" role="radio" aria-checked={filling} onClick={() => setMode("fill")}>
            Fill in and sign
          </button>
        </div>

        <div className="pt-teditor-status">
          {filling ? (
            <>
              <span>
                {filled} of {doc.fields.length} filled
                {signerCount ? ` · ${signedCount} of ${signerCount} signed` : ""}
              </span>
              <span className="pt-teditor-meter" aria-hidden="true">
                <i style={{ width: `${doc.fields.length ? Math.round((filled / doc.fields.length) * 100) : 0}%` }} />
              </span>
              <button type="button" className="pt-teditor-link" onClick={nextBlank} disabled={filled === doc.fields.length}>
                Next blank
              </button>
              {filled || signedCount ? (
                <button
                  type="button"
                  className="pt-teditor-link"
                  onClick={() => {
                    setValues({});
                    setSignatures({});
                  }}
                >
                  Clear
                </button>
              ) : null}
            </>
          ) : (
            <span className="pt-teditor-pages">Lines for every blank, ready to print and fill in by hand</span>
          )}
          <span className={pages > 2 ? "pt-teditor-pages pt-teditor-over" : "pt-teditor-pages"}>
            {pages > 2 ? `${pages} pages: shorten long answers` : `${pages} ${pages === 1 ? "page" : "pages"} · Letter`}
          </span>
        </div>

        <div className="pt-teditor-actions">
          {signedIn ? (
            <>
              <button type="button" className="pt-btn pt-btn-ghost gap-1.5 px-3 py-2 text-sm" onClick={() => window.print()}>
                <Icon d={PRINTER} />
                Print
              </button>
              <button type="button" className="pt-btn pt-btn-outline gap-1.5 px-3 py-2 text-sm" onClick={() => download("pdf")} disabled={busy !== null} aria-busy={busy === "pdf"}>
                <Icon d={DOWNLOAD} />
                {busy === "pdf" ? "Making PDF…" : "PDF"}
              </button>
              <button type="button" className="pt-btn pt-btn-solid gap-1.5 px-3 py-2 text-sm" onClick={() => download("word")} disabled={busy !== null} aria-busy={busy === "word"}>
                <Icon d={DOWNLOAD} />
                {busy === "word" ? "Making file…" : "Word"}
              </button>
            </>
          ) : (
            <button type="button" className="pt-btn pt-btn-solid px-3.5 py-2 text-sm" onClick={signIn}>
              Sign in to download
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="pt-teditor-error">
          {error}
        </p>
      ) : null}

      <div className="pt-teditor-body">
        <div className="pt-teditor-canvas">
          <div ref={sheetRef} className="pt-tsheet" style={{ "--pt-pages": pages } as React.CSSProperties}>
            <div ref={contentRef}>
              {filling ? (
                <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
                  <TemplateDocument doc={doc} values={values} signatures={signatures} renderBlank={renderBlank} renderSignature={renderSignature} branded={branded} upgradeHref="/dashboard/billing" />
                </form>
              ) : (
                <TemplateDocument doc={doc} values={{}} branded={branded} upgradeHref="/dashboard/billing" />
              )}
            </div>
            {Array.from({ length: pages - 1 }, (_, i) => (
              <div key={i} className="pt-tsheet-break" style={{ top: `${(i + 1) * PAGE_PX}px` }} aria-hidden="true">
                <span>Page {i + 2}</span>
              </div>
            ))}
          </div>
        </div>

        <section id="notes" className="pt-teditor-notes scroll-mt-24" aria-labelledby="notes-heading">
          <h2 id="notes-heading">Before you use this</h2>
          <ul>
            {doc.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p>
            PlainTerms is not a law firm, and this template is not legal advice. It is a general starting point that may not fit your
            situation or meet every rule where you live. Read the whole document before you sign it, and talk to a lawyer if a lot is at
            stake.
          </p>
          {doc.basedOn ? <p>Based on {doc.basedOn}</p> : null}
          {signedIn ? null : <p>Downloading needs a free account. Your answers stay on this device and come back after you sign in.</p>}
        </section>
      </div>

      <SignatureDialog
        open={signing !== null}
        role={signing?.role ?? ""}
        suggestedName={signing?.name ?? ""}
        onClose={() => setSigning(null)}
        onAdopt={(image) => {
          if (signing) setSignatures((prev) => ({ ...prev, [signing.key]: { image, signedOn: todayLabel() } }));
          setSigning(null);
        }}
      />

      {/* What prints: the plain document, with lines for anything left blank. It sits directly in <body>
          so printing can hide the rest of the app entirely, with no empty pages. */}
      {mounted
        ? createPortal(
            <div className="pt-print-root">
              <TemplateDocument doc={doc} values={outValues} signatures={outSignatures} branded={branded} className="pt-tdoc-print" />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
