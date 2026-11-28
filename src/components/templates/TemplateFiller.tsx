"use client";

import "./templates.css";
import { useEffect, useId, useState } from "react";
import TemplateDocument from "@/components/templates/TemplateDocument";
import { MAX_LENGTH, cleanValue, fileName, readDraft } from "@/lib/templateKit/fill";
import type { TemplateDoc, TemplateField, TemplateValues } from "@/lib/templateKit/types";

// Answers wait here only while someone signs in to download, then are removed. Session storage
// is per tab and is cleared when the tab closes.
const DRAFT_KEY = "pt.templateDraft";

const INPUT_TYPE: Record<TemplateField["type"], string> = {
  text: "text",
  long: "text",
  date: "date",
  money: "text",
  email: "email",
  phone: "tel",
  number: "text",
};

function Field({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const common = {
    id,
    value,
    maxLength: MAX_LENGTH[field.type],
    placeholder: field.placeholder,
    autoComplete: "off",
    "aria-describedby": field.hint ? hintId : undefined,
    className: "pt-tform-input",
  };
  return (
    <div className="pt-tform-field">
      <label htmlFor={id}>{field.label}</label>
      {field.type === "long" ? (
        <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={INPUT_TYPE[field.type]}
          inputMode={field.type === "money" ? "decimal" : field.type === "number" ? "numeric" : undefined}
          spellCheck={field.type === "text"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.hint ? (
        <p id={hintId} className="pt-tform-hint">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

export default function TemplateFiller({ doc, signedIn }: { doc: TemplateDoc; signedIn: boolean }) {
  const [values, setValues] = useState<TemplateValues>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(doc.fields.map((f) => [f.id, f]));

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

  const set = (field: TemplateField, v: string) => setValues((prev) => ({ ...prev, [field.id]: cleanValue(field, v) }));

  const signInToDownload = () => {
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

  const filled = Object.values(values).filter((v) => v.trim()).length;

  return (
    <div className="pt-tfill">
      <div className="pt-tfill-side">
        <form className="pt-tform" onSubmit={(e) => e.preventDefault()} data-clarity-mask="true" autoComplete="off">
          {doc.groups.map((group) => (
            <fieldset key={group.title} className="pt-tform-group">
              <legend>{group.title}</legend>
              {group.fields.map((fid) => {
                const field = byId.get(fid);
                return field ? <Field key={fid} field={field} value={values[fid] ?? ""} onChange={(v) => set(field, v)} /> : null;
              })}
            </fieldset>
          ))}
          <p className="pt-tform-note">
            Leave anything blank to fill it in by hand. {filled} of {doc.fields.length} filled in.
          </p>
        </form>

        <section className="pt-tfill-notes" aria-labelledby="before-heading">
          <h2 id="before-heading">Before you use this</h2>
          <ul>
            {doc.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="pt-tfill-legal">
            PlainTerms is not a law firm, and this template is not legal advice. It is a general starting point that may not fit your
            situation or meet every rule where you live. Read the whole document before you sign it, and talk to a lawyer if a lot is at
            stake.
          </p>
          {doc.basedOn ? <p className="pt-tfill-source">Based on {doc.basedOn}</p> : null}
        </section>

        <div className="pt-tfill-actions">
          {signedIn ? (
            <>
              <button type="button" className="pt-btn pt-btn-solid px-4 py-2.5 text-sm" onClick={downloadWord} disabled={busy} aria-busy={busy}>
                {busy ? "Making the file…" : "Download Word file"}
              </button>
              <button type="button" className="pt-btn pt-btn-outline px-4 py-2.5 text-sm" onClick={() => window.print()}>
                Print or save as PDF
              </button>
            </>
          ) : (
            <>
              <button type="button" className="pt-btn pt-btn-solid px-4 py-2.5 text-sm" onClick={signInToDownload}>
                Sign in to download
              </button>
              <p className="pt-tfill-hint">Free account. Your answers stay on this device and come back after you sign in.</p>
            </>
          )}
          {filled ? (
            <button type="button" className="pt-tfill-clear" onClick={() => setValues({})}>
              Clear answers
            </button>
          ) : null}
          {error ? (
            <p role="alert" className="pt-tfill-error">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="pt-tfill-preview">
        <TemplateDocument doc={doc} values={values} />
      </div>
    </div>
  );
}
