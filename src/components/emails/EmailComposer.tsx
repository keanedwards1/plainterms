"use client";

import { useId, useMemo, useState } from "react";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplates";

const INPUT =
  "w-full rounded-(--pt-radius-control) border border-(--pt-line-strong) bg-white px-3 py-2.5 text-[0.9375rem] text-(--pt-ink) placeholder:text-(--pt-muted)/70 focus:border-(--pt-ink) focus:outline-none";

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h9l5 5v11H5z" />
      <path d="M14 4v5h5" />
    </svg>
  );
}

/**
 * Fill a few details and the email writes itself. The draft stays editable;
 * changing a detail rebuilds it.
 */
export default function EmailComposer({ slug, connected }: { slug: string; connected: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [to, setTo] = useState("");
  const [edited, setEdited] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const id = useId();

  const template = EMAIL_TEMPLATES.find((t) => t.slug === slug) ?? EMAIL_TEMPLATES[0];
  const generated = useMemo(() => ({ subject: template.subject(values), body: template.body(values) }), [template, values]);
  const subject = edited?.subject ?? generated.subject;
  const body = edited?.body ?? generated.body;

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start">
        <form className="pt-panel grid gap-3.5 p-5" onSubmit={(e) => e.preventDefault()} aria-label="Details">
          <p className="font-heading text-lg font-semibold tracking-[-0.03em]">Details</p>
          {template.fields.map((field) => (
            <label key={field.key} className="grid gap-1.5 text-sm font-medium">
              {field.label}
              <input
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [field.key]: e.target.value }));
                  setEdited(null);
                }}
                className={`${INPUT} font-normal`}
              />
            </label>
          ))}
        </form>

        <section className="pt-framed grid gap-0 overflow-hidden bg-white" aria-label="Your email">
          <div className="grid gap-0 border-b border-(--pt-line)">
            <label htmlFor={`${id}-to`} className="flex items-center gap-3 border-b border-(--pt-line) px-4 py-2.5 text-sm">
              <span className="w-14 shrink-0 text-(--pt-muted)">To</span>
              <input id={`${id}-to`} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none" />
            </label>
            <label htmlFor={`${id}-subject`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-14 shrink-0 text-(--pt-muted)">Subject</span>
              <input
                id={`${id}-subject`}
                value={subject}
                onChange={(e) => setEdited({ subject: e.target.value, body })}
                className="min-w-0 flex-1 bg-transparent text-[0.9375rem] font-medium outline-none"
              />
            </label>
          </div>
          <label htmlFor={`${id}-body`} className="sr-only">
            Message
          </label>
          <textarea
            id={`${id}-body`}
            value={body}
            onChange={(e) => setEdited({ subject, body: e.target.value })}
            rows={13}
            className="block w-full resize-y bg-transparent px-4 py-4 text-[0.9375rem] leading-relaxed outline-none"
          />
          {template.attachment ? (
            <div className="px-4 pb-4">
              <span className="inline-flex items-center gap-2 rounded-(--pt-radius-control) border border-(--pt-line-strong) bg-(--pt-surface-soft) px-3 py-2 text-sm">
                <DocIcon />
                {template.attachment}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--pt-line) bg-(--pt-surface-soft) px-4 py-3">
            {edited ? (
              <button type="button" onClick={() => setEdited(null)} className="text-sm text-(--pt-muted) underline underline-offset-4 hover:text-(--pt-ink)">
                Undo my edits
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="pt-btn pt-btn-outline h-10 px-4 text-sm">
                {copied ? "Copied" : "Copy"}
              </button>
              <a href={mailto} className="pt-btn pt-btn-outline h-10 px-4 text-sm">
                Open in my email app
              </a>
              <button type="button" disabled={!connected} className="pt-btn pt-btn-solid h-10 px-5 text-sm" title={connected ? undefined : "Connect your email to send from here"}>
                Send
              </button>
            </div>
          </div>
        </section>
        <p role="status" className="sr-only">
          {copied ? "Email copied to the clipboard" : ""}
        </p>
      </div>
    </div>
  );
}
