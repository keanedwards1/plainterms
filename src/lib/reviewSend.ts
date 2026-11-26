import type { PtReview, PtReviewIssue } from "@/lib/plainterms-schema";

export type SendMode = "email" | "contract" | "both";

/** The negotiation email, built from the asks the user picked. */
export function negotiationEmail(review: PtReview, picked: PtReviewIssue[], mode: SendMode) {
  const other = review.perspective.other_short || review.perspective.other_party;
  const n = picked.length;
  const lines = picked.map((issue, i) => `${i + 1}. ${issue.ask_email_line}`).join("\n\n");
  const attach =
    mode === "both" ? "I've attached the agreement with these changes marked up, so you can accept or reject each one.\n\n" : "";
  const body =
    n === 0
      ? `Hi [Name],\n\nThanks for sending the agreement. I've read it through and have a few questions before I sign.\n\n${attach}Happy to talk them through on a call.\n\nThanks,\n[Your name]`
      : `Hi [Name],\n\nThanks for sending the agreement. I'm keen to get started. Before I sign, I'd like to agree ${
          n === 1 ? "one change" : `${n} changes`
        }:\n\n${lines}\n\n${attach}Happy to talk them through on a call.\n\nThanks,\n[Your name]`;
  return { subject: `A few changes before I sign`, body, to: other };
}

export function declineEmail() {
  return {
    subject: "The agreement",
    body: "Hi [Name],\n\nThanks for sending the agreement and for the time you put into it. I've decided not to go ahead.\n\nThanks again, and all the best.\n\n[Your name]",
  };
}

export function mailtoHref(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * A calendar file listing the contract's key dates. Dates in a contract are
 * usually relative ("60 days after invoice"), so each becomes an all-day
 * reminder for today that the user can move, with the timing in its title.
 */
export function datesCalendar(review: PtReview, title: string) {
  const now = new Date();
  const day = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = review.dates.map((d, i) =>
    [
      "BEGIN:VEVENT",
      `UID:${stamp}-${i}@plainterms`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${icsEscape(`${d.what} (${d.when})`)}`,
      `DESCRIPTION:${icsEscape(`${title}: ${d.when}. ${d.what}.`)}`,
      "END:VEVENT",
    ].join("\r\n")
  );
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PlainTerms//Contract dates//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

/** Saves text as a file in the browser. */
export function downloadText(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
