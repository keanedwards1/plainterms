"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
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
  REPORT_TIER_DESCRIPTIONS,
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
      const s3PutRes = await fetch(uploadJson.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
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
    <main className="pt-page-pad pb-12 pt-8">
      <div className="pt-container-wide">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

      <section className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="pt-kicker mb-3">
            Step 1 of 3
          </p>
          <h1 className="text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl">
            Upload your contract for a clear review.
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--pt-muted)]">
            Upload a PDF or DOCX and receive a structured summary, key risks, and next-step
            guidance before signing.
          </p>
        </div>

        <aside className="rounded-[var(--pt-radius)] border border-[#c8d8e6] bg-[#eaf3fa] p-5 text-sm text-[var(--pt-muted)] shadow-[0_14px_26px_-24px_var(--pt-shadow)]">
          <h2 className="text-lg text-[var(--pt-ink)]">Secure review flow</h2>
          <ul className="mt-3 space-y-2">
            <li>• Private upload and validation</li>
            <li>• Plain-English clause explanations</li>
            <li>• Action plan before signature</li>
            <li>• Informational only, not legal advice</li>
          </ul>
          <Image
            src="/graphics/icon-shield.svg"
            alt=""
            width={88}
            height={88}
            className="mt-4 h-20 w-20 rounded-xl border border-[#c8d8e6] bg-white p-2"
          />
        </aside>
      </section>

      <section className="mt-8 pt-card p-6">
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

          <div className="mt-5 pt-card-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
              Internal settings
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-[var(--pt-muted)]">
                Review profile
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as AnalysisModeOption)}
                  className="rounded-xl border border-[var(--pt-border)] bg-[var(--pt-surface)] px-3 py-2 text-sm text-[var(--pt-ink)]"
                >
                  <option value="rules">Standard review</option>
                  <option value="llm">Deep review (internal)</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-[var(--pt-muted)]">
                Model option (internal)
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
                {analysisMode === "rules" ? "Standard review profile" : `Deep review (${llmModel})`}
              </span>
            </p>
          </div>

          {file && (
            <div className="mt-5 pt-card-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">
                Choose your depth of analysis and report detail
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {REPORT_TIER_OPTIONS.map((tier) => {
                  const selected = reportTier === tier;
                  return (
                    <label
                      key={tier}
                      className={`cursor-pointer rounded-xl border p-3 ${
                        selected
                          ? "border-[var(--pt-accent)] bg-[var(--pt-surface)]"
                          : "border-[var(--pt-border)] bg-[var(--pt-surface)]"
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
                      <p className="text-sm font-semibold text-[var(--pt-ink)]">
                        {REPORT_TIER_LABELS[tier]}
                      </p>
                      <p className="mt-1 text-xs text-[var(--pt-muted)]">
                        {REPORT_TIER_DESCRIPTIONS[tier]}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="pt-btn-primary px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : "Continue to payment"}
            </button>
            {isSubmitting && step && <p className="text-sm text-[var(--pt-muted)]">{stepLabel(step)}...</p>}
          </div>

          {isSubmitting && step && (
            <div className="mt-5 pt-card-soft p-4">
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
            <div className="pt-alert-danger mt-5 p-3 text-sm">
              {error}
            </div>
          )}

          {checkoutCanceled && !error && (
            <div className="pt-alert-warn mt-5 p-3 text-sm">
              Checkout was canceled. You can continue to payment again when ready.
            </div>
          )}

          <p className="mt-5 text-xs text-[var(--pt-muted)]">
            Your secure result link remains available for up to {RESULT_RETENTION_DAYS} days after checkout.
            Save or bookmark the result page to revisit your results during that period.
            Account-based result history is coming soon.
          </p>
        </form>
      </section>
      </div>
    </main>
  );
}
