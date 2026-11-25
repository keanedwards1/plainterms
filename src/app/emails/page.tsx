import type { Metadata } from "next";
import Link from "next/link";
import { SoonChip } from "@/components/tools/ToolHeader";
import { EMAIL_GROUPS, EMAIL_TEMPLATES } from "@/lib/emailTemplates";
import "@/components/home/home.css";

export const metadata: Metadata = {
  title: "Emails",
  description: "Draft and send emails with contracts and legal documents attached, from ready-made templates.",
};

function ProviderButton({ name, mark }: { name: string; mark: React.ReactNode }) {
  return (
    <button type="button" disabled className="pt-btn pt-btn-outline h-11 gap-2.5 px-4 text-[0.9375rem]">
      {mark}
      Connect {name}
    </button>
  );
}

export default function EmailsPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide pb-10">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5 pb-8 pt-6 sm:pt-10">
          <div>
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">Emails</h1>
            <p className="mt-3 max-w-[60ch] text-lg text-(--pt-muted)">
              Start from a template, fill in a few details and send it with the right contract attached.
            </p>
          </div>
        </header>

        <section aria-labelledby="connect-heading" className="pt-panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="connect-heading" className="text-xl">
                Connect your email
              </h2>
              <SoonChip />
            </div>
            <p className="mt-1 text-[0.9375rem] text-(--pt-muted)">Send from your own address and keep the replies in one thread.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ProviderButton
              name="Gmail"
              mark={
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <path d="M3 7.5 12 13l9-5.5V18a1 1 0 0 1-1 1h-2.5v-8.2L12 14.2l-5.5-3.4V19H4a1 1 0 0 1-1-1z" fill="#4c93c4" />
                  <path d="M3 6.6c0-1.3 1.5-2 2.5-1.3L12 9.8l6.5-4.5c1-.7 2.5 0 2.5 1.3v.9L12 13 3 7.5z" fill="#e9783a" />
                </svg>
              }
            />
            <ProviderButton
              name="Outlook"
              mark={
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <rect x="3" y="5" width="12" height="14" rx="2" fill="#4c93c4" />
                  <circle cx="9" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.8" />
                  <path d="M15 8h5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-5" fill="none" stroke="#15322c" strokeWidth="1.6" />
                </svg>
              }
            />
          </div>
        </section>

        {EMAIL_GROUPS.map((group) => (
          <section key={group} aria-labelledby={`g-${group}`} className="mt-10">
            <h2 id={`g-${group}`} className="text-2xl tracking-[-0.04em]">
              {group}
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {EMAIL_TEMPLATES.filter((t) => t.group === group).map((t) => (
                <li key={t.slug}>
                  <Link href={`/emails/${t.slug}`} className="pt-tpl grid gap-1.5">
                    <span className="pt-tpl-paper !gap-2" aria-hidden="true">
                      <span className="flex items-center gap-1.5 border-b border-(--pt-line) pb-2 text-[0.6875rem] text-(--pt-muted)">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
                        </svg>
                        New email
                      </span>
                      <b className="line-clamp-2 font-heading text-[0.8125rem] font-semibold">{t.subject(Object.fromEntries(t.fields.map((f) => [f.key, f.placeholder])))}</b>
                      <i />
                      <i />
                      <i />
                      {t.attachment ? (
                        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-[3px] border border-(--pt-line-strong) bg-(--pt-surface-soft) px-1.5 py-0.5 text-[0.625rem] text-(--pt-ink-soft)">
                          {t.attachment}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 font-medium">{t.name}</span>
                    <span className="text-sm leading-snug text-(--pt-muted)">{t.line}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
