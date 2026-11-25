import type { Metadata } from "next";
import EmailComposer from "@/components/emails/EmailComposer";
import { SoonChip } from "@/components/tools/ToolHeader";

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

        <EmailComposer connected={false} />
      </div>
    </main>
  );
}
