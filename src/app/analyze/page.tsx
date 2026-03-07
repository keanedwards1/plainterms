"use client";

import React from "react";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import {
  DEFAULT_ANALYSIS_MODE,
  DEFAULT_LLM_MODEL,
  LLM_MODEL_OPTIONS,
  type AnalysisModeOption,
  type LlmModelOption,
} from "@/lib/analysisOptions";
import {
  DEFAULT_REPORT_TIER,
  REPORT_TIER_LABELS,
  REPORT_TIER_OPTIONS,
  type ReportTierOption,
} from "@/lib/pricingOptions";

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

const parsedRetentionDays = Number(process.env.NEXT_PUBLIC_RESULT_RETENTION_DAYS ?? "30");
const RESULT_RETENTION_DAYS =
  Number.isFinite(parsedRetentionDays) && parsedRetentionDays > 0
    ? Math.floor(parsedRetentionDays)
    : 30;

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
  "validating-file": "Running malware scan, validating file type, and extracting readable text.",
  "starting-checkout": "Preparing secure checkout with your validated file.",
  "redirecting-to-checkout": "Redirecting you to payment now.",
};

const LOCAL_STORAGE_ANALYSIS_MODE_KEY = "pt.analysisMode";
const LOCAL_STORAGE_LLM_MODEL_KEY = "pt.llmModel";
const LOCAL_STORAGE_REPORT_TIER_KEY = "pt.reportTier";

const REPORT_TIER_DESCRIPTIONS: Record<ReportTierOption, string> = {
  scan_39: "Quick risk scan with top findings.",
  report_69: "Full report with complete clause breakdown and questions.",
  protect_99: "Adds deeper rewrites, fallback positions, and negotiation plan.",
};

function isAnalysisModeOption(value: string): value is AnalysisModeOption {
  return value === "rules" || value === "llm";
}

function isLlmModelOption(value: string): value is LlmModelOption {
  return LLM_MODEL_OPTIONS.includes(value as LlmModelOption);
}

function isReportTierOption(value: string): value is ReportTierOption {
  return REPORT_TIER_OPTIONS.includes(value as ReportTierOption);
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
  const [reportTier, setReportTier] = React.useState<ReportTierOption>(DEFAULT_REPORT_TIER);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setCheckoutCanceled(url.searchParams.get("canceled") === "1");
  }, []);

  React.useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(LOCAL_STORAGE_ANALYSIS_MODE_KEY);
      const storedModel = window.localStorage.getItem(LOCAL_STORAGE_LLM_MODEL_KEY);
      const storedReportTier = window.localStorage.getItem(LOCAL_STORAGE_REPORT_TIER_KEY);

      if (storedMode && isAnalysisModeOption(storedMode)) {
        setAnalysisMode(storedMode);
      }
      if (storedModel && isLlmModelOption(storedModel)) {
        setLlmModel(storedModel);
      }
      if (storedReportTier && isReportTierOption(storedReportTier)) {
        setReportTier(storedReportTier);
      }
    } catch {
      // Storage is best effort only.
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_ANALYSIS_MODE_KEY, analysisMode);
      window.localStorage.setItem(LOCAL_STORAGE_LLM_MODEL_KEY, llmModel);
      window.localStorage.setItem(LOCAL_STORAGE_REPORT_TIER_KEY, reportTier);
    } catch {
      // Storage is best effort only.
    }
  }, [analysisMode, llmModel, reportTier]);

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
          reportTier,
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
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 pb-16 pt-12 sm:px-8 lg:px-12">
      <div className="pt-grid-pattern pointer-events-none absolute inset-0 opacity-20" />

      <section className="relative text-center">
        <p className="pt-kicker inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--pt-accent)]" />
          Step 1 of 3
        </p>
        <h1 className="mx-auto mt-4 max-w-4xl text-5xl leading-[0.98] text-[var(--pt-ink)] sm:text-6xl">
          Upload Your Contract
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[var(--pt-muted)]">
          Upload your agreement and we&apos;ll validate it before sending you to secure checkout.
        </p>
      </section>

      <section className="relative mt-9 grid gap-4 lg:grid-cols-3">
        <article className="pt-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Coverage</p>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">Brand, management, licensing, and services contracts.</p>
        </article>
        <article className="pt-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Security</p>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">Encrypted upload and controlled retention window.</p>
        </article>
        <article className="pt-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--pt-muted)]">Output</p>
          <p className="mt-2 text-sm text-[var(--pt-muted)]">Risk score, red flags, questions, and clause guidance.</p>
        </article>
      </section>

      <section className="relative mt-6 rounded-[24px] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-6 shadow-[0_28px_46px_-32px_var(--pt-shadow)] sm:p-8">
        <form onSubmit={onSubmit}>
          <label className="block text-sm font-semibold text-[var(--pt-ink)]">
            Contract file (PDF or DOCX)
          </label>

          <div className="mt-3 rounded-2xl border-2 border-dashed border-[#b7cfef] bg-[#f4f8ff] p-8 text-center transition-colors hover:border-[#95b6e4]">
            <div className="mb-5 flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--pt-border)] bg-white">
                <svg
                  className="h-6 w-6 text-[#4f73a8]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              {file ? (
                <div>
                  <p className="text-base font-semibold text-[var(--pt-ink)]">{file.name}</p>
                  <p className="mt-1 text-sm text-[var(--pt-muted)]">{prettyFileSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-base font-semibold text-[var(--pt-ink)]">Drop your contract here</p>
                  <p className="mt-1 text-sm text-[var(--pt-muted)]">or click to browse files</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--pt-ink)] file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#4e9378] file:px-5 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-95"
            />
          </div>

          {file && (
            <div className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[#f4f8ff] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                Choose report depth
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {REPORT_TIER_OPTIONS.map((tier) => {
                  const selected = reportTier === tier;
                  return (
                    <label
                      key={tier}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        selected
                          ? "border-[var(--pt-accent)] bg-white shadow-sm ring-1 ring-[var(--pt-accent)]/20"
                          : "border-[var(--pt-border)] bg-white hover:border-[#9ab8e3]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-tier"
                        value={tier}
                        checked={selected}
                        onChange={() => setReportTier(tier)}
                        className="sr-only"
                      />
                      <p className="text-sm font-semibold text-[var(--pt-ink)]">{REPORT_TIER_LABELS[tier]}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--pt-muted)]">
                        {REPORT_TIER_DESCRIPTIONS[tier]}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <details className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[#f4f8ff]">
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
              Internal testing controls
            </summary>
            <div className="grid gap-4 px-4 pb-4 pt-1 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-[var(--pt-muted)]">
                Analysis profile
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as AnalysisModeOption)}
                  className="rounded-xl border border-[var(--pt-border)] bg-white px-3 py-2 text-sm text-[var(--pt-ink)]"
                >
                  <option value="rules">Standard review</option>
                  <option value="llm">Deep review (internal)</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-[var(--pt-muted)]">
                Model profile (internal)
                <select
                  value={llmModel}
                  disabled={analysisMode !== "llm"}
                  onChange={(e) => setLlmModel(e.target.value as LlmModelOption)}
                  className="rounded-xl border border-[var(--pt-border)] bg-white px-3 py-2 text-sm text-[var(--pt-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {LLM_MODEL_OPTIONS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="px-4 pb-3 text-xs text-[var(--pt-muted)]">
              Current run:{" "}
              <span className="font-semibold text-[var(--pt-ink)]">
                {analysisMode === "rules" ? "Standard review profile" : `Deep review profile (${llmModel})`}
              </span>
            </p>
          </details>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="pt-btn-success rounded-xl px-7 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : "Continue to payment"}
            </button>
            {isSubmitting && step && <p className="text-sm text-[var(--pt-muted)]">{stepLabel(step)}...</p>}
          </div>

          {isSubmitting && step && (
            <div className="mt-5 rounded-2xl border border-[var(--pt-border)] bg-[#f4f8ff] p-4">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pt-accent)] opacity-35" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--pt-accent)]" />
                </span>
                <p className="text-sm font-semibold text-[var(--pt-ink)]">{stepLabel(step)}</p>
              </div>
              <p className="mt-1 text-sm text-[var(--pt-muted)]">{SUBMIT_STEP_DESCRIPTIONS[step]}</p>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--pt-border)]">
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
                        className={`inline-flex h-2 w-2 rounded-full ${
                          completed
                            ? "bg-[var(--pt-success)]"
                            : active
                              ? "animate-pulse bg-[var(--pt-accent)]"
                              : "bg-[var(--pt-border)]"
                        }`}
                      />
                      <span className={`text-xs ${completed || active ? "text-[var(--pt-ink)]" : "text-[var(--pt-muted)]"}`}>
                        {stepLabel(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-[var(--pt-danger)]/30 bg-[var(--pt-danger-soft)] p-3 text-sm text-[var(--pt-danger)]">
              {error}
            </div>
          )}

          {checkoutCanceled && !error && (
            <div className="mt-5 rounded-xl border border-[var(--pt-warning)]/30 bg-[var(--pt-warning-soft)] p-3 text-sm text-[var(--pt-warning)]">
              Checkout was canceled. You can continue to payment again when ready.
            </div>
          )}

          <p className="mt-5 text-xs text-[var(--pt-muted)]">
            Results are typically available for about {RESULT_RETENTION_DAYS} days and may expire automatically after that window.
          </p>
        </form>
      </section>
    </main>
  );
}
