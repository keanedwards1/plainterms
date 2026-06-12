"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import {
  REPORT_TIER_DESCRIPTIONS,
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";

type UploadUrlResponse = {
  uploadUrl: string;
  objectKey: string;
};

type PrecheckResponse = {
  precheckPassed: boolean;
  precheckToken: string;
};

type PreviewResponse = {
  resultId: string;
  previewAccessKey: string;
};

type CheckoutResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
};

type ReviewChoice = "free" | ReportTierOption;

const TIER_ORDER: ReportTierOption[] = ["scan_39", "report_69", "protect_99"];
const LOCAL_STORAGE_REPORT_TIER_KEY = "pt.reportTier";

type SubmitStep =
  | "requesting-upload-url"
  | "uploading-file"
  | "validating-file"
  | "running-analysis"
  | "opening-preview"
  | "starting-checkout"
  | "redirecting-to-checkout";

const FREE_STEP_ORDER: SubmitStep[] = [
  "requesting-upload-url",
  "uploading-file",
  "validating-file",
  "running-analysis",
  "opening-preview",
];

const PAID_STEP_ORDER: SubmitStep[] = [
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
  "running-analysis": "Reading the file and preparing your risk preview.",
  "opening-preview": "Opening your free risk preview.",
  "starting-checkout": "Preparing secure checkout with your validated file.",
  "redirecting-to-checkout": "Redirecting you to encrypted Stripe payment.",
};

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
    case "running-analysis":
      return "Preparing risk preview";
    case "opening-preview":
      return "Opening preview";
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
  const [reviewChoice, setReviewChoice] = React.useState<ReviewChoice>("free");

  const stepOrder = reviewChoice === "free" ? FREE_STEP_ORDER : PAID_STEP_ORDER;

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setCheckoutCanceled(url.searchParams.get("canceled") === "1");
  }, []);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_REPORT_TIER_KEY);
      if (stored && TIER_ORDER.includes(stored as ReportTierOption)) {
        setReviewChoice(stored as ReportTierOption);
      }
      // One-time handoff from the sample/preview pages; free stays the default afterward.
      window.localStorage.removeItem(LOCAL_STORAGE_REPORT_TIER_KEY);
    } catch {
      // Ignore storage failures; default stays on the free preview.
    }
  }, []);

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

      if (reviewChoice !== "free") {
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
            reportTier: reviewChoice,
          }),
        });

        if (!checkoutRes.ok) {
          const detail = await readErrorResponse(checkoutRes);
          throw new Error(`Checkout failed (${checkoutRes.status}): ${detail}`);
        }

        const checkoutData = (await checkoutRes.json()) as CheckoutResponse;
        if (!checkoutData.checkoutUrl) {
          throw new Error("Checkout succeeded but no checkout URL was returned.");
        }

        currentStep = "redirecting-to-checkout";
        setStep(currentStep);
        window.location.assign(checkoutData.checkoutUrl);
        return;
      }

      currentStep = "running-analysis";
      setStep(currentStep);
      const previewRes = await fetch("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: uploadJson.objectKey,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          precheckToken: precheckJson.precheckToken,
        }),
      });

      if (!previewRes.ok) {
        const detail = await readErrorResponse(previewRes);
        throw new Error(`Preview failed (${previewRes.status}): ${detail}`);
      }

      const data = (await previewRes.json()) as PreviewResponse;
      if (!data.resultId || !data.previewAccessKey) {
        throw new Error("Preview succeeded but no secure preview link was returned.");
      }

      void trackFunnelMetric({ event: "preview_ready", funnelId, resultId: data.resultId });
      currentStep = "opening-preview";
      setStep(currentStep);
      window.location.assign(
        `/preview/${encodeURIComponent(data.resultId)}?p=${encodeURIComponent(data.previewAccessKey)}`
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      setError(`${stepLabel(currentStep)}: ${detail}`);
    } finally {
      setIsSubmitting(false);
      setStep(null);
    }
  }

  return (
    <main className="pt-page-pad pb-12 pt-8 3xl:pb-16 3xl:pt-12">
      <div className="pt-container-wide">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)] 3xl:text-base">
          ← Back to home
        </Link>

      <section className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] 3xl:mt-8 3xl:gap-8">
        <div>
          <p className="pt-kicker mb-3">
            Free risk preview
          </p>
          <h1 className="text-4xl leading-tight text-[var(--pt-ink)] sm:text-5xl 3xl:text-6xl">
            See the risk score before you pay.
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--pt-muted)] 3xl:text-lg 3xl:mt-6 3xl:max-w-2xl">
            Upload a PDF or DOCX and get a free risk score and red-flag count in minutes.
            Decide what level of review you need after you see the result.
          </p>
        </div>

        <aside className="rounded-[var(--pt-radius)] border border-[#c8d8e6] bg-[#eaf3fa] p-5 text-sm text-[var(--pt-muted)] shadow-[0_14px_26px_-24px_var(--pt-shadow)] 3xl:p-8">
          <h2 className="text-lg text-[var(--pt-ink)] 3xl:text-xl">Secure review flow</h2>
          <ul className="mt-3 space-y-2 3xl:text-base 3xl:space-y-3 3xl:mt-5">
            <li>• Private upload and validation</li>
            <li>• Free risk score before checkout</li>
            <li>• Details unlock only after payment</li>
            <li>• Informational only, not legal advice</li>
          </ul>
          <Image
            src="/graphics/icon-shield.svg"
            alt=""
            width={88}
            height={88}
            className="mt-4 h-20 w-20 rounded-xl border border-[#c8d8e6] bg-white p-2 3xl:h-24 3xl:w-24 3xl:mt-6"
          />
        </aside>
      </section>

      <section className="mt-8 3xl:mt-10 3xl:grid 3xl:grid-cols-[1fr_0.52fr] 3xl:items-stretch 3xl:gap-8">
      <div className="pt-card p-6 3xl:p-8">
        <form onSubmit={onSubmit}>
          <label className="mb-3 block text-sm font-semibold text-[var(--pt-ink)] 3xl:text-base">
            Contract file (PDF or DOCX)
          </label>

          <div className="rounded-2xl border-2 border-dashed border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-5 3xl:p-8">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--pt-ink)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--pt-accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--pt-accent-ink)] hover:file:brightness-95 3xl:text-base 3xl:file:text-base 3xl:file:px-6 3xl:file:py-3"
            />
            {file && (
              <p className="mt-3 text-sm text-[var(--pt-muted)] 3xl:text-base">
                Selected: <span className="font-semibold text-[var(--pt-ink)]">{file.name}</span>{" "}
                ({prettyFileSize(file.size)})
              </p>
            )}
          </div>

          <fieldset className="mt-6">
            <legend className="mb-3 block text-sm font-semibold text-[var(--pt-ink)] 3xl:text-base">
              Choose your review
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReviewChoice("free")}
                aria-pressed={reviewChoice === "free"}
                className={`relative rounded-xl border p-4 text-left transition-colors ${
                  reviewChoice === "free"
                    ? "border-[#de8f79] bg-[#fff6f1] shadow-[0_14px_28px_-26px_rgba(222,143,121,0.9)]"
                    : "border-[var(--pt-border)] bg-white hover:border-[#de8f79]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--pt-ink)]">Free risk preview</p>
                  <p className="text-base font-semibold text-[#2ba59f]">$0</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--pt-muted)]">
                  Risk score and red-flag counts. Decide what to unlock after you see it.
                </p>
                <span className="mt-2 inline-flex rounded-full border border-[#b2ddd4] bg-[#e1f4ef] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1d655f]">
                  Default
                </span>
              </button>

              {TIER_ORDER.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setReviewChoice(tier)}
                  aria-pressed={reviewChoice === tier}
                  className={`relative rounded-xl border p-4 text-left transition-colors ${
                    reviewChoice === tier
                      ? "border-[#de8f79] bg-[#fff6f1] shadow-[0_14px_28px_-26px_rgba(222,143,121,0.9)]"
                      : "border-[var(--pt-border)] bg-white hover:border-[#de8f79]"
                  }`}
                >
                  {tier === "report_69" ? (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-[#de8f79] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Most popular
                    </span>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--pt-ink)]">{REPORT_TIER_NAMES[tier]}</p>
                    <p className="text-base font-semibold text-[var(--pt-ink)]">{REPORT_TIER_PRICES[tier]}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--pt-muted)]">{REPORT_TIER_DESCRIPTIONS[tier]}</p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--pt-muted)]">
              Paid reviews go straight to secure checkout after your file is validated.
            </p>
          </fieldset>

          <div className="mt-5 flex flex-wrap items-center gap-3 3xl:mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="pt-btn-primary px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 3xl:px-8 3xl:py-4 3xl:text-base"
            >
              {isSubmitting
                ? "Working..."
                : reviewChoice === "free"
                  ? "Check my contract risk"
                  : `Continue with ${REPORT_TIER_NAMES[reviewChoice]} ${REPORT_TIER_PRICES[reviewChoice]}`}
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
                    width: `${((stepOrder.indexOf(step) + 1) / stepOrder.length) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-3 grid gap-2">
                {stepOrder.map((item, idx) => {
                  const currentIndex = stepOrder.indexOf(step);
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
              Checkout was canceled. Your free preview can be unlocked again when ready.
            </div>
          )}

          <p className="mt-5 text-xs text-[var(--pt-muted)] 3xl:text-sm 3xl:mt-7">
            The free preview shows only the risk score and flag counts. Specific clauses, source text,
            rewrites, and email drafts stay locked until payment.
          </p>
        </form>
      </div>

      <aside className="hidden 3xl:block">
        <div className="pt-card h-full p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--pt-muted)">Clauses we cover</p>
          <p className="mt-1 text-sm text-(--pt-muted)">Every contract is analyzed across these areas.</p>
          <ul className="mt-5 space-y-2">
            {[
              "Who's Involved",
              "What Work Is Included",
              "Timeline & Ending the Agreement",
              "Pay & Invoicing",
              "Ownership of Work",
              "Confidentiality",
              "Restrictions",
              "Liability & Responsibility",
              "Disputes & Governing Law",
              "Practical Details",
              "Questions & Missing Info",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-(--pt-accent)" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-dashed border-(--pt-border) p-4">
            <p className="text-xs font-semibold text-(--pt-muted) uppercase tracking-[0.14em]">Your report also includes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Risk score", "Recommendation", "Red flags", "Negotiation points", "Questions to ask"].map((tag) => (
                <span key={tag} className="rounded-full border border-(--pt-border) bg-(--pt-surface-soft) px-2.5 py-1 text-xs font-semibold text-(--pt-muted)">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      </section>
      </div>
    </main>
  );
}
