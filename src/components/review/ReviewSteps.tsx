"use client";

import "./review.css";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import type { PtResult, PtReview, PtReviewIssue } from "@/lib/plainterms-schema";
import { contractTitle, formatContractText } from "@/lib/contractText";
import { datesCalendar, declineEmail, downloadText, mailtoHref, negotiationEmail, type SendMode } from "@/lib/reviewSend";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import HalftoneDisc from "@/components/art/HalftoneDisc";
import { ToolIcon } from "@/components/home/ToolRow";
import ContractNotes from "@/components/review/ContractNotes";
import RedlineEditor from "@/components/review/RedlineEditor";
import { G, GlossTooltip } from "@/components/review/Glossed";
import { ICONS, Icon, RiskMeter, SevChip } from "@/components/review/parts";

type Choice = "negotiate" | "sign" | "walk";

const PRIORITY: Record<PtReviewIssue["priority"], string> = { must: "Must have", worth: "Worth asking", nice: "Nice to have" };
const PREP_TITLE: Record<Choice, string> = { negotiate: "What would you like to revise?", sign: "Signing as-is", walk: "Walk away" };
const SEND_TITLE: Record<Choice, string> = { negotiate: "Send your changes", sign: "Sign it", walk: "Let them know" };
const N = 6;

type Props = {
  data: PtResult;
  review: PtReview;
  signedIn: boolean;
  classicHref: string;
};

/** One what-if row that opens smoothly (height and fade), with a plus that turns into a minus. */
function WhatIf({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="rv-wi-item">
      <button type="button" className="rv-wi-q" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span>
          <G>{q}</G>
        </span>
        <span className="rv-wi-icon" aria-hidden="true" />
      </button>
      <div id={id} className="rv-wi-panel" data-open={open} aria-hidden={!open}>
        <div>
          <p>
            <G>{a}</G>
          </p>
        </div>
      </div>
    </div>
  );
}

function Steps({
  step,
  setStep,
  labels,
  busy,
}: {
  step: number;
  setStep: (n: number) => void;
  labels: Array<[string, string]>;
  busy: boolean[];
}) {
  return (
    <nav className="rv-steps" aria-label="Steps">
      {labels.map(([icon, title], i) => (
        <button key={title} type="button" className="rv-step" aria-current={i === step ? "step" : undefined} onClick={() => setStep(i)}>
          <ToolIcon name={icon} />
          <span className="min-w-0">
            {title}
          </span>
          {busy[i] ? (
            <span className="pt-spinner" aria-label="Still being written" />
          ) : i < step ? (
            <span className="rv-tick" aria-label="Done">
              <Icon d={ICONS.check} className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}

export default function ReviewSteps({ data, review, signedIn, classicHref }: Props) {
  const issues = review.issues;
  const other = review.perspective.other_short || review.perspective.other_party;
  const text = useMemo(() => formatContractText(data.document?.extracted_text ?? ""), [data.document?.extracted_text]);
  const entitlements = data.entitlements;
  const canEditContract = entitlements ? entitlements.rewrites : true;

  const [step, setStepState] = useState(0);
  const [choice, setChoice] = useState<Choice>(review.verdict.action === "sign" ? "sign" : "negotiate");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(issues.filter((i) => i.priority !== "nice").map((i) => i.id)));
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [showFallbacks, setShowFallbacks] = useState(false);
  const [mode, setMode] = useState<SendMode>(canEditContract ? "both" : "email");
  const [emailView, setEmailView] = useState<"email" | "call">("email");
  const [editedEmail, setEditedEmail] = useState<{ key: string; body: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [proFeature, setProFeature] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const counts = { high: 0, medium: 0, low: 0 };
  for (const i of issues) counts[i.severity] += 1;
  const pickedIssues = issues.filter((i) => picked.has(i.id));
  const title = contractTitle(text, data.document?.file_name);
  const fileBase = (data.document?.file_name ?? title).replace(/\.[a-z0-9]{2,5}$/i, "");

  function setStep(n: number) {
    setStepState(n);
    const nav = navRef.current;
    if (nav && nav.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: nav.getBoundingClientRect().top + window.scrollY - 24, behavior: reduce ? "auto" : "smooth" });
    }
  }
  function toggle(id: string, on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }

  const back = (to: number, label: string) => (
    <button type="button" className="pt-btn pt-btn-ghost h-11 px-4" onClick={() => setStep(to)}>
      <Icon d={ICONS.back} />
      {label}
    </button>
  );
  const next = (to: number, label: string) => (
    <button type="button" className="pt-btn pt-btn-solid h-11 px-5" onClick={() => setStep(to)}>
      {label}
      <Icon d={ICONS.arrow} />
    </button>
  );

  const generated = negotiationEmail(review, pickedIssues, mode);
  const emailKey = `${[...picked].sort().join(",")}|${mode}`;
  const emailBody = editedEmail?.key === emailKey ? editedEmail.body : generated.body;
  const decline = declineEmail();

  /* ---------- steps ---------- */

  const deal = (
    <div className="rv-stage">
      <section className="pt-framed rv-focus">
        <p className="rv-label">
          Reviewed for {review.perspective.party}
          {review.perspective.role ? `, the ${review.perspective.role}` : ""}
        </p>
        <h2 className="rv-step-title mt-1">{review.verdict.headline}</h2>
        <p className="rv-lead">
          <G>{review.verdict.line}</G>
        </p>
        <RiskMeter score={review.risk.score} label={review.risk.label} />
        <dl className="rv-facts">
          {review.deal.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                <G>{row.value}</G>
                {row.flag ? (
                  <>
                    {" "}
                    <span className="rv-flag">
                      <G>{row.flag.charAt(0).toUpperCase() + row.flag.slice(1)}</G>.
                    </span>
                  </>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <div className="rv-nav">
          <span />
          {next(1, "Next: review")}
        </div>
      </section>
      {review.gaps.length ? (
        <aside className="pt-panel rv-card rv-mini">
          <h3>Not in the contract</h3>
          <ul className="rv-list">
            {review.gaps.map((g) => (
              <li key={g}>
                <i className="rv-dot" aria-hidden="true" />
                <span>
                  <G>{g}</G>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );

  const contract = (
    <>
      <div className="pt-panel rv-topline">
        <span className="rv-rpill">
          <b>{review.risk.score}</b>
          <span>/100 · {review.risk.label[0].toUpperCase() + review.risk.label.slice(1)} risk</span>
        </span>
        {counts.high ? <span className="rv-chip rv-high">{counts.high} high risk</span> : null}
        {counts.medium ? <span className="rv-chip rv-medium">{counts.medium} medium risk</span> : null}
        {counts.low ? <span className="rv-chip rv-low">{counts.low} low risk</span> : null}
        <span className="rv-sp" />
        <span className="rv-label hidden sm:inline">Reviewed for {review.perspective.party}</span>
      </div>
      <ContractNotes
        text={text}
        issues={issues}
        fileLabel={`${data.document?.file_name ?? "Contract"}${data.document?.word_count ? ` · ${data.document.word_count} words` : ""}`}
      />
      <div className="rv-below">
        {review.good.length ? (
          <section className="pt-panel rv-card rv-mini">
            <h3>Checked and fine</h3>
            <ul className="rv-list">
              {review.good.map((g) => (
                <li key={g.text}>
                  <Icon d={ICONS.check} className="rv-ok h-4 w-4" />
                  <span>
                    <G>{g.text}</G>
                    {g.section_ref ? <span className="rv-ref"> §{g.section_ref}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {review.gaps.length ? (
          <section className="pt-panel rv-card rv-mini">
            <h3>Not in the contract</h3>
            <ul className="rv-list">
              {review.gaps.map((g) => (
                <li key={g}>
                  <i className="rv-dot" aria-hidden="true" />
                  <span>
                    <G>{g}</G>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <div className="pt-framed rv-bottombar">
        {back(0, "Overview")}
        <b className="rv-strong">
          {issues.length} issue{issues.length === 1 ? "" : "s"}
          {counts.high ? `, ${counts.high} high` : ""}
        </b>
        <span className="rv-sp" />
        {next(2, "Next: options")}
      </div>
    </>
  );

  const decideOptions: Array<[Choice, string, string, string]> = [
    ["negotiate", "Negotiate", `Ask ${other} for changes by email, with an edited contract, or both.`, "A few days"],
    ["sign", "Sign as-is", `Start now and accept the ${issues.length} term${issues.length === 1 ? "" : "s"} flagged in step 2.`, "Today"],
    ["walk", "Walk away", `Pass on this contract. Worth weighing if ${other} won't move on the must-haves.`, "Start over"],
  ];
  const decide = (
    <section className="pt-framed rv-focus rv-options">
            <h2 className="rv-step-title">What do you want to do?</h2>
      <p className="rv-lead">Your call. Here&apos;s what each choice means for you.</p>
      <div className="rv-choices mt-6" role="radiogroup" aria-label="What you want to do">
        {decideOptions.map(([key, label, desc, meta]) => (
          <label key={key} className="rv-choice">
            <input type="radio" name="rv-choice" value={key} checked={choice === key} onChange={() => setChoice(key)} />
            <span className="rv-choice-top">
              <Icon d={key === "negotiate" ? ICONS.ask : key === "sign" ? ICONS.check : ICONS.back} className="h-5 w-5" />
              <span className="rv-radio" />
            </span>
            <b>{label}</b>
            <p>{desc}</p>
            <span className="rv-label">{meta}</span>
          </label>
        ))}
      </div>
      <p className="rv-signpost">If a lot is riding on this contract, a lawyer can read the full document, including anything attached, before you sign.</p>
      <div className="rv-nav">
        {back(1, "Review")}
        {next(3, "Next: plan")}
      </div>
    </section>
  );

  const checklist = review.checklist.length ? (
    <section className="pt-panel rv-card rv-loose">
      <div className="rv-card-h" style={{ marginBottom: 6 }}>
        <h3>Before you sign: loose ends to tie up</h3>
      </div>
      <div className="rv-checks">
        {review.checklist.map((c, i) => (
          <label key={c.title}>
            <input
              type="checkbox"
              checked={checked.has(i)}
              onChange={(e) =>
                setChecked((prev) => {
                  const nextSet = new Set(prev);
                  if (e.target.checked) nextSet.add(i);
                  else nextSet.delete(i);
                  return nextSet;
                })
              }
            />
            <span>
              <b>
                <G>{c.title}</G>
              </b>
              <small>
                <G>{c.detail}</G>
              </small>
            </span>
          </label>
        ))}
      </div>
    </section>
  ) : null;

  const prepare = (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="rv-step-title">{PREP_TITLE[choice]}</h2>
        </div>
        {choice === "negotiate" ? (
          <button type="button" role="switch" aria-checked={showFallbacks} className="rv-toggle" onClick={() => setShowFallbacks((v) => !v)}>
            <span className="rv-toggle-track" aria-hidden="true" />
            Show Fallback
          </button>
        ) : null}
      </div>
      <div className="rv-prep rv-plan" data-solo="true">
        <div className="grid gap-4">
          {choice === "negotiate" ? (
            <section className="pt-panel rv-card">
              <div className="rv-asks">
                {issues.map((issue) => (
                  <label key={issue.id} className="rv-ask">
                    <input type="checkbox" checked={picked.has(issue.id)} onChange={(e) => toggle(issue.id, e.target.checked)} />
                    <div>
                      <span className="rv-ask-t">
                        <SevChip sev={issue.severity} />
                        <span>
                          <G>{issue.title}</G>
                        </span>
                        <span className="rv-prio">{PRIORITY[issue.priority]}</span>
                      </span>
                      <div className="rv-lines">
                        <div>
                          <span className="rv-k">Revision</span>
                          <span>
                            <G>{issue.ask_short}</G>
                          </span>
                        </div>
                        {showFallbacks && issue.fallback ? (
                          <div>
                            <span className="rv-k">Fallback</span>
                            <span>
                              <G>{issue.fallback}</G>
                            </span>
                          </div>
                        ) : null}
                        {issue.walk_away_if ? (
                          <div>
                            <span className="rv-k">Walk away if</span>
                            <span className="rv-walk">
                              <G>{issue.walk_away_if}</G>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          ) : choice === "sign" ? (
            <section className="pt-panel rv-card">
              <div className="rv-card-h">
                <h3>What you&apos;re agreeing to</h3>
              </div>
              <ul className="rv-agree">
                {review.sign_as_is.map((s) => (
                  <li key={s.text}>
                    <SevChip sev={s.severity} />
                    <span>
                      <G>{s.text}</G>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="rv-quiet mt-3.5">Once it&apos;s signed, any change needs {other} to agree.</p>
            </section>
          ) : (
            <section className="pt-panel rv-card">
              <div className="rv-card-h">
                <h3>Nothing to undo</h3>
              </div>
              <p>You haven&apos;t signed, so you don&apos;t owe {other} anything. A short note is enough, and the next step writes it for you.</p>
            </section>
          )}
        </div>
      </div>
      <div className="rv-nav">
        {back(2, "Options")}
        {next(4, "Next: send")}
      </div>
    </>
  );

  const sendModes: Array<[SendMode, keyof typeof ICONS, string, string]> = [
    ["email", "mail", "Email", "List your changes in an email."],
    ["contract", "doc", "Edited contract", "Mark up the contract and download it."],
    ["both", "copy", "Both", "An email with the marked-up contract attached."],
  ];
  const emailPanel = (
    <section className="pt-panel rv-card">
      <div className="rv-card-h">
        <h3>Email</h3>
        <div className="rv-seg" role="group" aria-label="Email or call">
          <button type="button" aria-pressed={emailView === "email"} onClick={() => setEmailView("email")}>
            Email
          </button>
          <button type="button" aria-pressed={emailView === "call"} onClick={() => setEmailView("call")}>
            Call script
          </button>
        </div>
      </div>
      {emailView === "email" ? (
        <>
          <div className="rv-mailbox">
            <p className="rv-mhd">
              To: {other} · Subject: {generated.subject}
            </p>
            <textarea aria-label="Email" value={emailBody} onChange={(e) => setEditedEmail({ key: emailKey, body: e.target.value })} />
            {mode === "both" ? (
              <p className="rv-att">
                <Icon d={ICONS.doc} />
                {fileBase} (marked up).docx
              </p>
            ) : null}
          </div>
          <div className="rv-acts">
            <button type="button" className="pt-btn pt-btn-outline h-10 px-4 text-sm" onClick={() => copy("email", `Subject: ${generated.subject}\n\n${emailBody}`)}>
              <Icon d={ICONS.copy} />
              {copied === "email" ? "Copied" : "Copy"}
            </button>
            <a className="pt-btn pt-btn-solid h-10 px-4 text-sm" href={mailtoHref(generated.subject, emailBody)}>
              <Icon d={ICONS.mail} />
              Open in email
            </a>
          </div>
          {mode === "both" ? <p className="rv-quiet mt-2.5">Download the Word file from the contract below and attach it.</p> : null}
        </>
      ) : (
        <div className="rv-script">
          <p className="rv-say">&ldquo;Thanks for sending this. I&apos;m keen to start, and there are a few things I&apos;d like to sort out first.&rdquo;</p>
          {pickedIssues
            .filter((i) => i.they_say && i.you_say)
            .map((i) => (
              <div key={i.id} className="rv-if">
                <span className="rv-k">If they say</span>
                <span>&ldquo;{i.they_say}&rdquo;</span>
                <span className="rv-k">You say</span>
                <span>
                  <G>{i.you_say}</G>
                </span>
              </div>
            ))}
          {review.questions.length ? (
            <div className="rv-if">
              <span className="rv-k">Also ask</span>
              <ul>
                {review.questions.map((q) => (
                  <li key={q}>
                    <G>{q}</G>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );

  const send = (
    <>
      <div className="mb-4">
                <h2 className="rv-step-title">{SEND_TITLE[choice]}</h2>
      </div>
      {choice === "negotiate" ? (
        <>
          <div className="rv-choices rv-sendmodes mb-4" role="radiogroup" aria-label="How to send">
            {sendModes.map(([key, icon, label, desc]) => {
              const locked = key !== "email" && !canEditContract;
              return (
                <label key={key} className="rv-choice">
                  <input
                    type="radio"
                    name="rv-send"
                    value={key}
                    checked={mode === key}
                    onChange={() => (locked ? setProFeature("Edited contract") : setMode(key))}
                  />
                  <span className="rv-choice-top">
                    <Icon d={ICONS[icon]} className="h-5 w-5" />
                    <span className="rv-radio" />
                  </span>
                  <b>{label}</b>
                  <p>
                    <G>{desc}</G>
                  </p>
                  {locked ? <span className="rv-label">Pro</span> : null}
                </label>
              );
            })}
          </div>
          <div className="grid gap-4">
            {mode !== "contract" ? emailPanel : null}
            {mode !== "email" ? (
              <section className="pt-panel rv-card">
                <div className="rv-card-h">
                  <h3>Edited contract</h3>
                </div>
                <RedlineEditor text={text} issues={issues} picked={picked} onToggle={toggle} fileBase={fileBase} />
              </section>
            ) : null}
          </div>
        </>
      ) : choice === "sign" ? (
        <section className="pt-panel rv-card">
          <div className="rv-card-h">
            <h3>Ready to sign</h3>
          </div>
          <p className="rv-quiet mb-3.5">
            <G>Save a copy of the contract as it stands. Keep any exhibits with your signed copy.</G>
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="pt-btn pt-btn-outline h-10 px-4 text-sm" onClick={() => window.print()}>
              <Icon d={ICONS.download} />
              PDF
            </button>
            <button type="button" className="pt-btn pt-btn-outline h-10 px-4 text-sm" onClick={() => copy("contract", text)}>
              <Icon d={ICONS.copy} />
              {copied === "contract" ? "Copied" : "Copy text"}
            </button>
          </div>
          <div className="rv-print" aria-hidden="true">
            {text.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      ) : (
        <section className="pt-panel rv-card">
          <div className="rv-card-h">
            <h3>A short note</h3>
          </div>
          <div className="rv-mailbox">
            <p className="rv-mhd">
              To: {other} · Subject: {decline.subject}
            </p>
            <textarea aria-label="Decline email" defaultValue={decline.body} style={{ minHeight: 220 }} />
          </div>
          <div className="rv-acts">
            <button type="button" className="pt-btn pt-btn-outline h-10 px-4 text-sm" onClick={() => copy("decline", decline.body)}>
              <Icon d={ICONS.copy} />
              {copied === "decline" ? "Copied" : "Copy"}
            </button>
            <a className="pt-btn pt-btn-solid h-10 px-4 text-sm" href={mailtoHref(decline.subject, decline.body)}>
              <Icon d={ICONS.mail} />
              Open in email
            </a>
          </div>
        </section>
      )}
      <div className="rv-nav">
        {back(3, "Plan")}
        {next(5, "Next: confirmation")}
      </div>
    </>
  );

  const confirmation = (
    <>
      <div className="mb-4">
                <h2 className="rv-step-title">Confirmation</h2>
      </div>
      {choice === "walk" ? null : checklist}
      <div className="rv-track">
        <section className="pt-panel rv-card">
          <div className="rv-card-h">
            <h3>Dates</h3>
          </div>
          {review.dates.length ? (
            review.dates.map((d) => (
              <div key={`${d.when}-${d.what}`} className="rv-trow">
                <b>{d.when}</b>
                <span>
                  <G>{d.what}</G>
                </span>
              </div>
            ))
          ) : (
            <p className="rv-quiet">The contract doesn&apos;t set any dates.</p>
          )}
          {review.dates.length ? (
            <div className="rv-card-foot">
              <button
                type="button"
                className="pt-btn pt-btn-outline h-10 px-4 text-sm"
                onClick={() => downloadText(`${fileBase} dates.ics`, datesCalendar(review, title), "text/calendar")}
              >
                <Icon d={ICONS.calendar} />
                Add to calendar
              </button>
            </div>
          ) : null}
        </section>
        <section className="pt-panel rv-card rv-wi">
          <div className="rv-card-h">
            <h3>What if…</h3>
          </div>
          {review.what_ifs.map((w) => (
            <WhatIf key={w.q} q={w.q} a={w.a} />
          ))}
        </section>
        <section className="pt-panel rv-card">
          <div className="rv-card-h">
            <h3>New draft back?</h3>
          </div>
          <div className="rv-drop">
            <Icon d={ICONS.doc} className="h-6 w-6 text-(--pt-muted)" />
            <b>Got {other}&apos;s new version?</b>
            <p>See what got better or worse.</p>
            <Link href="/tools/compare-versions" className="pt-btn pt-btn-outline h-10 px-4 text-sm">
              Compare versions
            </Link>
          </div>
        </section>
      </div>
      <div className="rv-nav">
        {back(4, "Send")}
        <span />
      </div>
    </>
  );

  // Prepare, Send and Confirmation need the review's extras, written in the background.
  const extrasPending = review.extras_status === "processing";
  const extrasFailed = review.extras_status === "failed";
  const waitingPanel = (n: number, title: string) => (
    <>
      <div className="mb-4">
        <h2 className="rv-step-title">{title}</h2>
      </div>
      <section className="pt-panel rv-pending" role="status" aria-live="polite">
        {extrasFailed ? (
          <p>We couldn&apos;t prepare this part for this document. Steps 1 to 3 have everything we found.</p>
        ) : (
          <>
            <p>
              <span className="pt-spinner shrink-0" aria-hidden="true" />
              <span>Writing your asks and edits. This usually takes under a minute.</span>
            </p>
            <div className="pt-skeleton h-24 rounded-(--pt-radius)" aria-hidden="true" />
            <div className="pt-skeleton h-24 rounded-(--pt-radius)" aria-hidden="true" />
          </>
        )}
      </section>
      <div className="rv-nav">
        {back(n - 1, n === 3 ? "Options" : n === 4 ? "Plan" : "Send")}
        {n < N - 1 ? next(n + 1, n === 3 ? "Next: send" : "Next: confirmation") : <span />}
      </div>
    </>
  );
  const needsExtras = extrasPending || extrasFailed;
  const panels = [
    deal,
    contract,
    decide,
    needsExtras ? waitingPanel(3, PREP_TITLE[choice]) : prepare,
    needsExtras ? waitingPanel(4, SEND_TITLE[choice]) : send,
    needsExtras ? waitingPanel(5, "Confirmation") : confirmation,
  ];
  const busy = [false, false, false, extrasPending, extrasPending, extrasPending];
  const labels: Array<[string, string]> = [
    ["template", "Overview"],
    ["review", "Review"],
    ["compare", "Options"],
    ["write", "Plan"],
    ["letter", "Send"],
    ["check", "Confirmation"],
  ];

  const reviewDate = new Date(data.created_at);
  const dateLabel = Number.isNaN(reviewDate.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(reviewDate);

  return (
    <div className="rv">
      <GlossTooltip />
      <ProUpgradeDialog open={proFeature !== null} feature={proFeature} signedIn={signedIn} onClose={() => setProFeature(null)} />

      <div className="rv-hero">
        <HalftoneDisc className="rv-disc" />
        <Link href={data.owned ? "/documents" : "/"} className="rv-back">
          <Icon d={ICONS.back} />
          {data.owned ? "Documents" : "Analyze another contract"}
        </Link>
        <div className="rv-head">
          <div>
            <h1>{title}</h1>
            <p className="rv-meta">
              {review.perspective.party} and {review.perspective.other_party}
              {dateLabel ? ` · Reviewed ${dateLabel}` : ""}
            </p>
          </div>
          <Link href={classicHref} className="pt-btn pt-btn-ghost h-10 px-4 text-sm">
            Classic view
          </Link>
        </div>
      </div>

      <div ref={navRef}>
        <Steps step={step} setStep={setStep} labels={labels} busy={busy} />
      </div>
      <div>{panels[step]}</div>

      <p className="rv-disc-line">Not legal advice. This report is information to help you understand your contract.</p>
      <p role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </p>
    </div>
  );
}
