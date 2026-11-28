"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";

type Field = { key: string; label: string; placeholder: string; long?: boolean };

type Kind = {
  key: string;
  name: string;
  subject: (v: Record<string, string>) => string;
  fields: Field[];
  body: (v: Record<string, string>) => string[];
};

const KINDS: Kind[] = [
  {
    key: "demand",
    name: "Money you're owed",
    subject: (v) => `Re: Payment of ${v.amount || "the amount owed"}`,
    fields: [
      { key: "to", label: "Who owes you", placeholder: "Brightline Remodeling" },
      { key: "what", label: "What happened", placeholder: "I paid for cabinet installation on October 3 and the work never started.", long: true },
      { key: "amount", label: "Amount", placeholder: "$6,200" },
      { key: "by", label: "Pay by", placeholder: "January 15" },
    ],
    body: (v) => [
      `${v.what || "[What happened]"}`,
      `I am asking you to pay ${v.amount || "[amount]"} by ${v.by || "[date]"}. You can pay by check or bank transfer to the address below.`,
      `If I have not received payment by then, I will consider my other options, including a claim in small claims court.`,
    ],
  },
  {
    key: "deposit",
    name: "Security deposit back",
    subject: () => "Re: Return of my security deposit",
    fields: [
      { key: "to", label: "Landlord or property manager", placeholder: "Harbor Point Apartments" },
      { key: "address", label: "Rental address", placeholder: "214 Harbor Point Dr, Unit 3B" },
      { key: "moved", label: "Move-out date", placeholder: "October 31" },
      { key: "amount", label: "Deposit amount", placeholder: "$1,800" },
    ],
    body: (v) => [
      `I moved out of ${v.address || "[rental address]"} on ${v.moved || "[move-out date]"} and returned the keys.`,
      `Please return my security deposit of ${v.amount || "[amount]"}, along with an itemized list of any deductions, within the time your state's law allows.`,
      `Please send it to the address below. Thank you.`,
    ],
  },
  {
    key: "complaint",
    name: "Complaint to a contractor",
    subject: (v) => `Re: ${v.project || "Unfinished work"}`,
    fields: [
      { key: "to", label: "Contractor", placeholder: "Summit Roofing" },
      { key: "project", label: "Project", placeholder: "Roof replacement at 18 Elm St" },
      { key: "problem", label: "What's wrong", placeholder: "The flashing around the chimney leaks and two shingles are missing.", long: true },
      { key: "fix", label: "What you want", placeholder: "Repair the flashing and replace the shingles" },
      { key: "by", label: "By when", placeholder: "December 20" },
    ],
    body: (v) => [
      `I am writing about the ${v.project ? v.project.charAt(0).toLowerCase() + v.project.slice(1) : "[project]"}. ${v.problem || "[What's wrong]"}`,
      `Please ${v.fix ? v.fix.charAt(0).toLowerCase() + v.fix.slice(1) : "[what you want]"} by ${v.by || "[date]"}, as our contract requires.`,
      `Please reply in writing to confirm when you will do this.`,
    ],
  },
];

const noop = () => () => {};

/**
 * Today's date for the top of the letter. The server can't know the visitor's time zone, so while the page
 * hydrates this uses the UTC date (matching the server's HTML), then the visitor's local date straight after.
 */
function today(local: boolean) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: local ? undefined : "UTC" }).format(
    new Date(),
  );
}

export default function LetterWriter() {
  const [kindKey, setKindKey] = useState(KINDS[0].key);
  const [values, setValues] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const formId = useId();
  const local = useSyncExternalStore(noop, () => true, () => false);
  const kind = KINDS.find((k) => k.key === kindKey) ?? KINDS[0];

  const paragraphs = useMemo(() => kind.body(values), [kind, values]);
  const plainText = useMemo(
    () => [today(local), "", values.to || "", "", kind.subject(values), "", ...paragraphs.flatMap((p) => [p, ""]), "Sincerely,", name || "[Your name]"].join("\n"),
    [local, kind, values, paragraphs, name],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div role="group" aria-label="Kind of letter" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={k.key === kindKey}
            className="pt-btn-tag"
            onClick={() => {
              setKindKey(k.key);
              setValues({});
            }}
          >
            {k.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        <form className="pt-panel grid gap-4 p-6" onSubmit={(e) => e.preventDefault()} aria-label="Letter details">
          {kind.fields.map((field) => {
            const id = `${formId}-${field.key}`;
            const common = {
              id,
              value: values[field.key] ?? "",
              placeholder: field.placeholder,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [field.key]: e.target.value })),
              className:
                "w-full rounded-(--pt-radius-control) border border-(--pt-line-strong) bg-white px-3.5 py-3 text-base text-(--pt-ink) placeholder:text-(--pt-muted)/70 focus:border-(--pt-ink) focus:outline-none",
            };
            return (
              <div key={field.key} className="grid gap-1.5">
                <label htmlFor={id} className="text-sm font-medium">
                  {field.label}
                </label>
                {field.long ? <textarea rows={3} {...common} /> : <input {...common} />}
              </div>
            );
          })}
          <div className="grid gap-1.5">
            <label htmlFor={`${formId}-name`} className="text-sm font-medium">
              Your name
            </label>
            <input
              id={`${formId}-name`}
              value={name}
              placeholder="Alex Morgan"
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-(--pt-radius-control) border border-(--pt-line-strong) bg-white px-3.5 py-3 text-base placeholder:text-(--pt-muted)/70 focus:border-(--pt-ink) focus:outline-none"
            />
          </div>
        </form>

        <div>
          <article className="pt-letter pt-framed grid gap-4 bg-white px-7 py-9 leading-relaxed sm:px-11 sm:py-11" aria-label="Your letter">
            <p className="text-(--pt-muted)">{today(local)}</p>
            <p>{values.to || <span className="rounded bg-(--pt-line) px-1 text-transparent">Recipient name</span>}</p>
            <p className="font-semibold">{kind.subject(values)}</p>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p>
              Sincerely,
              <br />
              {name || "[Your name]"}
            </p>
          </article>
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <button type="button" onClick={copy} className="pt-btn pt-btn-outline px-4 py-2.5 text-sm">
              {copied ? "Copied" : "Copy text"}
            </button>
            <button type="button" onClick={() => window.print()} className="pt-btn pt-btn-solid px-4 py-2.5 text-sm">
              Print or save as PDF
            </button>
          </div>
          <p role="status" className="sr-only">
            {copied ? "Letter copied to the clipboard" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
