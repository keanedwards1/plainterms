"use client";

import { useId, useMemo, useState } from "react";
import { EMAIL_GROUPS, EMAIL_TEMPLATES } from "@/lib/emailTemplates";

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
 * Pick a template, fill a few details and the email writes itself. The draft
 * stays editable; changing the template or a detail rebuilds it.
 */
export default function EmailComposer({ connected }: { connected: boolean }) {
  const [slug, setSlug] = useState(EMAIL_TEMPLATES[0].slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [to, setTo] = useState("");
  const [edited, setEdited] = useState<{ subject: string; body: string } | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const id = useId();

  const template = EMAIL_TEMPLATES.find((t) => t.slug === slug) ?? EMAIL_TEMPLATES[0];
  const generated = useMemo(() => ({ subject: template.subject(values), body: template.body(values) }), [template, values]);
  const subject = edited?.subject ?? generated.subject;
  const body = edited?.body ?? generated.body;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? EMAIL_TEMPLATES.filter((t) => `${t.name} ${t.line}`.toLowerCase().includes(q)) : EMAIL_TEMPLATES;
  }, [query]);

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
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
      <aside className="pt-panel p-3 lg:sticky lg:top-6" aria-label="Email templates">
        <label className="relative block">
          <span className="sr-only">Search templates</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--pt-muted)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className={`${INPUT} pl-9`} />
        </label>
        <div className="mt-2 max-h-[15rem] overflow-y-auto lg:max-h-[34rem]">
          {EMAIL_GROUPS.map((group) => {
            const items = list.filter((t) => t.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mt-3">
                <p className="pt-label px-2">{group}</p>
                <ul className="mt-1.5 grid gap-0.5">
                  {items.map((t) => (
                    <li key={t.slug}>
                      <button
                        type="button"
                        aria-pressed={t.slug === slug}
                        onClick={() => {
                          setSlug(t.slug);
                          setValues({});
                          setEdited(null);
                        }}
                        className="w-full rounded-(--pt-radius-pop) px-2.5 py-2 text-left transition-colors hover:bg-(--pt-surface-soft) aria-pressed:bg-(--pt-ink) aria-pressed:text-white"
                      >
                        <span className="block text-[0.9375rem] font-medium">{t.name}</span>
                        <span className="block text-[0.8125rem] leading-snug opacity-70">{t.line}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!list.length ? <p className="px-2 py-6 text-center text-sm text-(--pt-muted)">No templates match &ldquo;{query}&rdquo;.</p> : null}
        </div>
      </aside>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:items-start">
        <form className="pt-panel grid gap-3.5 p-5" onSubmit={(e) => e.preventDefault()} aria-label="Details">
          <p className="font-heading text-lg font-semibold tracking-[-0.03em]">{template.name}</p>
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
