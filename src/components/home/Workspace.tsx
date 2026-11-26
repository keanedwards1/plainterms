"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import {
  ACCEPTED_FILE_TYPES,
  fileFromPastedText,
  prepareUpload,
  prettyFileSize,
  resultPath,
  signInPath,
  startAnalysis,
  stashPendingAnalysis,
  takePendingAnalysis,
  validateFile,
  type PrepareStage,
  type PreparedUpload,
} from "@/lib/analyzeFlow";
import { SAMPLE_CONTRACT_NAME, SAMPLE_CONTRACT_TEXT } from "@/lib/sampleContract";

type Mode = "file" | "paste";
type PrepareState = "idle" | PrepareStage | "ready" | "error";
type DialogKind = null | "sign-in" | "limit" | "party";

const MIN_PASTE_WORDS = 40;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

const STAGE_LABEL: Record<PrepareState, string> = {
  idle: "",
  uploading: "Uploading securely…",
  checking: "Checking the file…",
  ready: "Ready to analyze",
  error: "",
};

export default function Workspace({ signedIn }: { signedIn: boolean }) {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [prepareState, setPrepareState] = useState<PrepareState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dragging, setDragging] = useState(false);
  const [awaitingParty, setAwaitingParty] = useState<PreparedUpload | null>(null);

  const preparing = useRef<Promise<PreparedUpload> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const statusId = useId();

  const beginPrepare = useCallback((next: File) => {
    setPrepareState("uploading");
    setError(null);
    const promise = prepareUpload(next, (stage) => setPrepareState(stage));
    preparing.current = promise;
    promise
      .then(() => {
        if (preparing.current === promise) setPrepareState("ready");
      })
      .catch((err: unknown) => {
        if (preparing.current !== promise) return;
        setPrepareState("error");
        setError(err instanceof Error ? err.message : "We couldn't upload this file.");
      });
    return promise;
  }, []);

  function chooseFile(next: File | undefined | null) {
    if (!next) return;
    const problem = validateFile(next);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(next);
    void beginPrepare(next);
  }

  function clearFile() {
    preparing.current = null;
    setFile(null);
    setPrepareState("idle");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const runAnalysis = useCallback(async (prepared: PreparedUpload, party?: string) => {
    setAnalyzing(true);
    setError(null);
    const outcome = await startAnalysis(prepared, party);
    if (outcome.ok) {
      window.location.assign(resultPath(outcome.started.resultId));
      return;
    }
    setAnalyzing(false);
    const { failure } = outcome;
    if (failure.kind === "sign_in_required") {
      stashPendingAnalysis(prepared);
      setDialog("sign-in");
    } else if (failure.kind === "monthly_limit") {
      setDialog("limit");
    } else if (failure.kind === "upload_expired") {
      preparing.current = null;
      setPrepareState("idle");
      setFile(null);
      setError(failure.message);
    } else {
      setError(failure.message);
    }
  }, []);

  // Before the analysis runs, ask which party the user is so the review is written for their side.
  const askSideThenRun = useCallback(
    (prepared: PreparedUpload) => {
      if (prepared.parties.length >= 2) {
        setAnalyzing(false);
        setAwaitingParty(prepared);
        setDialog("party");
        return;
      }
      void runAnalysis(prepared);
    },
    [runAnalysis]
  );

  function chooseSide(party?: string) {
    const prepared = awaitingParty;
    setDialog(null);
    setAwaitingParty(null);
    if (prepared) void runAnalysis(prepared, party);
  }

  async function onAnalyze() {
    setError(null);
    let promise = preparing.current;

    if (mode === "paste") {
      if (wordCount(pasted) < MIN_PASTE_WORDS) {
        setError(`Paste the full text, at least ${MIN_PASTE_WORDS} words.`);
        return;
      }
      const name = pasted.trim() === SAMPLE_CONTRACT_TEXT.trim() ? SAMPLE_CONTRACT_NAME : "Pasted contract.txt";
      promise = beginPrepare(fileFromPastedText(pasted, name));
    } else if (!file) {
      setError("Add a contract first.");
      return;
    }

    if (!promise) return;
    setAnalyzing(true);
    let prepared: PreparedUpload;
    try {
      prepared = await promise;
    } catch {
      setAnalyzing(false);
      return;
    }

    if (!signedIn) {
      setAnalyzing(false);
      stashPendingAnalysis(prepared);
      setDialog("sign-in");
      return;
    }
    askSideThenRun(prepared);
  }

  // Coming back from sign-in: pick up the stashed upload and analyze it.
  // Deferred to a task so state updates happen outside the effect body.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const resume = url.searchParams.get("resume") === "1";
      const signinUnavailable = url.searchParams.get("signin") === "unavailable";
      if (resume || signinUnavailable) {
        url.searchParams.delete("resume");
        url.searchParams.delete("signin");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
      if (signinUnavailable) {
        setError("Sign-in is unavailable right now. Please try again in a few minutes.");
        return;
      }
      if (!resume || !signedIn) return;
      const pending = takePendingAnalysis();
      if (pending) {
        askSideThenRun(pending);
      } else {
        setError("Your upload expired while you were signing in. Add the contract again.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [signedIn, askSideThenRun]);

  const canAnalyze = mode === "file" ? Boolean(file) && prepareState !== "error" : pasted.trim().length > 0;
  const buttonLabel = analyzing
    ? prepareState === "uploading" || prepareState === "checking"
      ? "Preparing…"
      : "Analyzing…"
    : "Read it";

  const readButton = (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={!canAnalyze || analyzing}
      aria-describedby={file ? statusId : undefined}
      className="pt-btn pt-btn-solid h-11 shrink-0 px-5 text-[0.9375rem]"
    >
      {analyzing ? <span className="pt-spinner" aria-hidden="true" /> : null}
      {buttonLabel}
      {analyzing ? null : <ArrowIcon />}
    </button>
  );

  return (
    <section id="start" aria-label="Read a document" className="w-full max-w-[47.5rem] scroll-mt-24">
      {mode === "paste" ? (
        <div className="pt-framed overflow-hidden bg-white text-left">
          <label htmlFor={pasteId} className="sr-only">
            Document text
          </label>
          <textarea
            id={pasteId}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the full text of your contract or lease here"
            className="block min-h-44 w-full resize-y border-0 bg-transparent p-4 text-[15px] leading-6 text-(--pt-ink) placeholder:text-(--pt-muted) focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--pt-line) py-2 pl-4 pr-2">
            <span className="text-sm text-(--pt-muted)">{pasted.trim() ? `${wordCount(pasted)} words` : "Copy it from an email, a PDF or a portal."}</span>
            {readButton}
          </div>
        </div>
      ) : file ? (
        <div className="pt-framed flex flex-wrap items-center gap-3 bg-white py-2 pl-4 pr-2 text-left">
          <span className="text-(--pt-accent)">
            <FileIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-(--pt-ink)" title={file.name}>
              {file.name}
            </p>
            <p id={statusId} role="status" className="flex items-center gap-2 text-sm text-(--pt-muted)">
              <span>{prettyFileSize(file.size)}</span>
              {STAGE_LABEL[prepareState] ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className={prepareState === "ready" ? "font-medium text-(--pt-good)" : ""}>
                    {prepareState === "uploading" || prepareState === "checking" ? (
                      <span className="pt-spinner mr-1.5 align-[-2px] text-(--pt-muted)" aria-hidden="true" />
                    ) : null}
                    {STAGE_LABEL[prepareState]}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <button type="button" onClick={clearFile} disabled={analyzing} className="pt-btn pt-btn-ghost px-3 py-2 text-sm">
            Change
          </button>
          {readButton}
        </div>
      ) : (
        <label
          data-dragging={dragging}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            chooseFile(e.dataTransfer.files?.[0]);
          }}
          className="pt-framed flex min-h-16 cursor-pointer items-center gap-3.5 bg-white py-2 pl-5 pr-2 text-left transition-colors data-[dragging=true]:bg-[#fff4ec]"
        >
          <span className="text-(--pt-muted)">
            <UploadIcon />
          </span>
          <span className="min-w-0 flex-1 text-[1.0625rem] leading-snug text-(--pt-muted)">
            Drop a contract or lease here, or <span className="font-medium text-(--pt-ink) underline underline-offset-4">choose a file</span>
          </span>
          <span className="pt-btn pt-btn-solid hidden h-11 shrink-0 px-5 text-[0.9375rem] sm:inline-flex">
            Read it
            <ArrowIcon />
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="sr-only"
            onChange={(e) => chooseFile(e.target.files?.[0])}
          />
        </label>
      )}

      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="pt-btn-tag"
          onClick={() => {
            setMode("paste");
            setPasted(SAMPLE_CONTRACT_TEXT);
            setError(null);
          }}
        >
          Try a sample contract
        </button>
        <button
          type="button"
          className="pt-btn-tag"
          aria-pressed={mode === "paste"}
          onClick={() => {
            setMode(mode === "paste" ? "file" : "paste");
            setError(null);
          }}
        >
          Paste text
        </button>
      </div>

      {error ? (
        <p role="alert" className="pt-alert-danger mx-auto mt-3 max-w-xl px-3.5 py-2.5 text-sm">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-(--pt-muted)">PDF, Word or text, up to 25 MB. Encrypted upload. Free documents are deleted after 30 days.</p>

      <Dialog
        open={dialog === "sign-in"}
        onClose={() => setDialog(null)}
        title="Sign in to see your results"
        description="It's free, with no card needed. Your contract is ready and will be analyzed as soon as you're in."
      >
        <div className="flex flex-col gap-2.5">
          <a href={signInPath("/?resume=1")} className="pt-btn pt-btn-solid px-5 py-3 text-base" autoFocus>
            Continue
          </a>
          <a href={signInPath("/?resume=1", "sign-up")} className="pt-btn pt-btn-outline px-5 py-3 text-base">
            Create a free account
          </a>
          <p className="mt-1 text-center text-xs text-(--pt-muted)">Google, Microsoft, Apple or email.</p>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "party"}
        onClose={() => {
          setDialog(null);
          setAwaitingParty(null);
        }}
        title="Which one are you?"
        description="We'll review the contract from your side."
      >
        <div className="flex flex-col gap-2.5">
          {awaitingParty?.parties.map((party, i) => (
            <button
              key={party.name}
              type="button"
              onClick={() => chooseSide(party.name)}
              className="pt-btn pt-btn-outline justify-between px-5 py-3 text-left text-base"
              autoFocus={i === 0}
            >
              <span className="min-w-0 truncate">{party.name}</span>
              {party.role ? <span className="shrink-0 text-sm font-normal text-(--pt-muted)">{party.role}</span> : null}
            </button>
          ))}
          <button type="button" onClick={() => chooseSide()} className="pt-btn pt-btn-ghost px-5 py-3 text-base">
            Someone else, or not sure
          </button>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "limit"}
        onClose={() => setDialog(null)}
        title="You've reached this month's free limit"
        description="Pro lifts the limit and adds our most capable AI model, a revised draft with tracked changes, and long-term document history."
      >
        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <Link href="/dashboard/billing" className="pt-btn pt-btn-solid px-5 py-3 text-base" autoFocus>
            See Pro
          </Link>
          <button type="button" onClick={() => setDialog(null)} className="pt-btn pt-btn-outline px-5 py-3 text-base">
            Not now
          </button>
        </div>
      </Dialog>
    </section>
  );
}
