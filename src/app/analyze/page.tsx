"use client";

import React from "react";
import Link from "next/link";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import {
  DEFAULT_ANALYSIS_MODE,
  DEFAULT_LLM_MODEL,
  LLM_MODEL_OPTIONS,
  type AnalysisModeOption,
  type LlmModelOption,
} from "@/lib/analysisOptions";

type UploadUrlResponse = {
  uploadUrl: string;
  objectKey: string;
};

type CheckoutResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
};

type PrecheckResponse = {
  precheckPassed: boolean;
  precheckToken: string;
};

const parsedRetentionDays = Number(process.env.NEXT_PUBLIC_RESULT_RETENTION_DAYS ?? "7");
const RESULT_RETENTION_DAYS =
  Number.isFinite(parsedRetentionDays) && parsedRetentionDays > 0
    ? Math.floor(parsedRetentionDays)
    : 7;

type SubmitStep =
  | "requesting-upload-url"
  | "uploading-file"
  | "validating-file"
  | "starting-checkout"
  | "redirecting-to-checkout";

const SUBMIT_STEP_ORDER: SubmitStep[] = [
  "requesting-upload-url",
  "uploading-file",
  "validating-file",
  "starting-checkout",
  "redirecting-to-checkout",
];

const SUBMIT_STEP_DESCRIPTIONS: Record<SubmitStep, string> = {
  "requesting-upload-url": "Setting up a secure upload session.",
  "uploading-file": "Uploading your contract to encrypted storage.",
  "validating-file": "Validating file type and extracting readable text.",
  "starting-checkout": "Preparing secure checkout with your validated file.",
  "redirecting-to-checkout": "Redirecting you to payment now.",
};

const LOCAL_STORAGE_ANALYSIS_MODE_KEY = "pt.analysisMode";
const LOCAL_STORAGE_LLM_MODEL_KEY = "pt.llmModel";

function isAnalysisModeOption(value: string): value is AnalysisModeOption {
  return value === "rules" || value === "llm";
}

function isLlmModelOption(value: string): value is LlmModelOption {
  return LLM_MODEL_OPTIONS.includes(value as LlmModelOption);
}

async function readErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
      return JSON.stringify(json).slice(0, 500);
    }

    const text = await res.text();
    if (text.trim()) return text.slice(0, 500);
  } catch {
    // Fall back below.
  }

  return res.statusText || "Unknown error";
}

function stepLabel(step: SubmitStep): string {
  switch (step) {
    case "requesting-upload-url":
      return "Requesting upload URL";
    case "uploading-file":
      return "Uploading file";
    case "validating-file":
      return "Validating file";
    case "starting-checkout":
      return "Starting checkout";
    case "redirecting-to-checkout":
      return "Redirecting to payment";
  }
}

function prettyFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AnalyzePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<SubmitStep | null>(null);
  const [checkoutCanceled, setCheckoutCanceled] = React.useState(false);
  const [analysisMode, setAnalysisMode] = React.useState<AnalysisModeOption>(DEFAULT_ANALYSIS_MODE);
  const [llmModel, setLlmModel] = React.useState<LlmModelOption>(DEFAULT_LLM_MODEL);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setCheckoutCanceled(url.searchParams.get("canceled") === "1");
  }, []);

  React.useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(LOCAL_STORAGE_ANALYSIS_MODE_KEY);
      const storedModel = window.localStorage.getItem(LOCAL_STORAGE_LLM_MODEL_KEY);

      if (storedMode && isAnalysisModeOption(storedMode)) {
        setAnalysisMode(storedMode);
      }
      if (storedModel && isLlmModelOption(storedModel)) {
        setLlmModel(storedModel);
      }
    } catch {
      // Storage is best effort only.
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_ANALYSIS_MODE_KEY, analysisMode);
      window.localStorage.setItem(LOCAL_STORAGE_LLM_MODEL_KEY, llmModel);
    } catch {
      // Storage is best effort only.
    }
  }, [analysisMode, llmModel]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose a contract file.");
      return;
    }

    const funnelId = getOrCreateFunnelId();
    void trackFunnelMetric({
      event: "upload_start",
      funnelId,
      fileSizeBytes: file.size,
      fileType: file.type || "application/octet-stream",
    });

    setIsSubmitting(true);
    let currentStep: SubmitStep = "requesting-upload-url";
    setStep(currentStep);

    try {
      const uploadUrlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!uploadUrlRes.ok) {
        const detail = await readErrorResponse(uploadUrlRes);
        throw new Error(`Upload URL failed (${uploadUrlRes.status}): ${detail}`);
      }

      const uploadJson = (await uploadUrlRes.json()) as UploadUrlResponse;
      if (!uploadJson.uploadUrl || !uploadJson.objectKey) {
        throw new Error("Upload URL response missing uploadUrl/objectKey.");
      }

      currentStep = "uploading-file";
      setStep(currentStep);
      const uploadForm = new FormData();
      uploadForm.set("uploadUrl", uploadJson.uploadUrl);
      uploadForm.set("file", file);

      const s3PutRes = await fetch("/api/upload-file", {
        method: "POST",
        body: uploadForm,
      });

      if (!s3PutRes.ok) {
        const detail = await readErrorResponse(s3PutRes);
        throw new Error(`S3 upload failed (${s3PutRes.status}): ${detail}`);
      }

      currentStep = "validating-file";
      setStep(currentStep);
      const precheckRes = await fetch("/api/precheck", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: uploadJson.objectKey,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!precheckRes.ok) {
        const detail = await readErrorResponse(precheckRes);
        throw new Error(`File validation failed (${precheckRes.status}): ${detail}`);
      }

      const precheckJson = (await precheckRes.json()) as PrecheckResponse;
      if (!precheckJson.precheckPassed || !precheckJson.precheckToken) {
        throw new Error("File validation did not pass. Please upload another file.");
      }

      currentStep = "starting-checkout";
      setStep(currentStep);
      void trackFunnelMetric({ event: "checkout_start", funnelId });
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: uploadJson.objectKey,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          precheckToken: precheckJson.precheckToken,
          analysisMode,
          ...(analysisMode === "llm" ? { llmModel } : {}),
        }),
      });

      if (!checkoutRes.ok) {
        const detail = await readErrorResponse(checkoutRes);
        throw new Error(`Checkout failed (${checkoutRes.status}): ${detail}`);
      }

      const data = (await checkoutRes.json()) as CheckoutResponse;
      if (!data.checkoutUrl) {
        throw new Error("Checkout succeeded but no checkout URL was returned.");
      }

      currentStep = "redirecting-to-checkout";
      setStep(currentStep);
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      setError(`${stepLabel(currentStep)}: ${detail}`);
    } finally {
      setIsSubmitting(false);
      setStep(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12">
      <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
        ← Back to home
      </Link>

      <section className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-1 text-sm font-semibold text-[var(--pt-muted)]">
            Step 1 of 3
          </p>
          <h1 className="text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl">
            Upload your agreement for plain-English analysis.
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--pt-muted)]">
            v1 supports independent contractor and services agreements. Upload a PDF or DOCX, then
            we validate readability before secure checkout.
          </p>
        </div>

        <aside className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5 text-sm text-[var(--pt-muted)]">
          <h2 className="text-lg text-[var(--pt-ink)]">What to expect</h2>
          <ul className="mt-3 grid gap-2">
            <li>• Calm, neutral summary language.</li>
            <li>• Missing details are called out explicitly.</li>
            <li>• Informational only, not legal advice.</li>
          </ul>
        </aside>
      </section>

      <section className="mt-8 rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-sm">
        <form onSubmit={onSubmit}>
          <label className="mb-3 block text-sm font-semibold text-[var(--pt-ink)]">
            Contract file (PDF or DOCX)
          </label>

          <div className="rounded-2xl border-2 border-dashed border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-5">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--pt-ink)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--pt-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--pt-accent-ink)] hover:file:brightness-95"
            />
            {file && (
              <p className="mt-3 text-sm text-[var(--pt-muted)]">
                Selected: <span className="font-semibold text-[var(--pt-ink)]">{file.name}</span>{" "}
                ({prettyFileSize(file.size)})
              </p>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
              Testing controls
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-[var(--pt-muted)]">
                Analysis engine
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as AnalysisModeOption)}
                  className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2 text-sm text-[var(--pt-ink)]"
                >
                  <option value="rules">Rules (no LLM)</option>
                  <option value="llm">LLM</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-[var(--pt-muted)]">
                LLM model
                <select
                  value={llmModel}
                  disabled={analysisMode !== "llm"}
                  onChange={(e) => setLlmModel(e.target.value as LlmModelOption)}
                  className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2 text-sm text-[var(--pt-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {LLM_MODEL_OPTIONS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-[var(--pt-muted)]">
              Current run:{" "}
              <span className="font-semibold text-[var(--pt-ink)]">
                {analysisMode === "rules" ? "Rules engine" : `LLM (${llmModel})`}
              </span>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[var(--pt-accent)] px-6 py-3 text-sm font-semibold text-[var(--pt-accent-ink)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : "Continue"}
            </button>
            {isSubmitting && step && <p className="text-sm text-[var(--pt-muted)]">{stepLabel(step)}...</p>}
          </div>

          {isSubmitting && step && (
            <div className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pt-accent)] opacity-35" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--pt-accent)]" />
                </span>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">{stepLabel(step)}</p>
              </div>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">{SUBMIT_STEP_DESCRIPTIONS[step]}</p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--pt-border)]">
                <div
                  className="h-full rounded-full bg-[var(--pt-accent)] transition-all duration-500"
                  style={{
                    width: `${((SUBMIT_STEP_ORDER.indexOf(step) + 1) / SUBMIT_STEP_ORDER.length) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-3 grid gap-2">
                {SUBMIT_STEP_ORDER.map((item, idx) => {
                  const currentIndex = SUBMIT_STEP_ORDER.indexOf(step);
                  const completed = idx < currentIndex;
                  const active = idx === currentIndex;
                  return (
                    <div key={item} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          completed
                            ? "bg-emerald-500"
                            : active
                              ? "animate-pulse bg-[var(--pt-accent)]"
                              : "bg-[var(--pt-border)]"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          completed || active ? "text-[var(--pt-ink)]" : "text-[var(--pt-muted)]"
                        }`}
                      >
                        {stepLabel(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {checkoutCanceled && !error && (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Checkout was canceled. You can continue to payment again when ready.
            </div>
          )}

          <p className="mt-5 text-xs text-[var(--pt-muted)]">
            Results are typically available for about {RESULT_RETENTION_DAYS} days and may expire
            automatically after that window.
          </p>
        </form>
      </section>
    </main>
  );
}
