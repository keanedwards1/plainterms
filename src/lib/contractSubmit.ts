import { trackFunnelMetric } from "@/lib/funnelMetrics";
import { type ReportTierOption } from "@/lib/pricingOptions";

// Shared contract upload → validate → preview/checkout pipeline.
// Used by both the dedicated /analyze page and the inline upload flow in the
// upgrade modal on the sample-report page.

export type ReviewChoice = "free" | ReportTierOption;

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

export type SubmitStep =
  | "requesting-upload-url"
  | "uploading-file"
  | "validating-file"
  | "running-analysis"
  | "opening-preview"
  | "starting-checkout"
  | "redirecting-to-checkout";

export const FREE_STEP_ORDER: SubmitStep[] = [
  "requesting-upload-url",
  "uploading-file",
  "validating-file",
  "running-analysis",
  "opening-preview",
];

export const PAID_STEP_ORDER: SubmitStep[] = [
  "requesting-upload-url",
  "uploading-file",
  "validating-file",
  "starting-checkout",
  "redirecting-to-checkout",
];

export const SUBMIT_STEP_DESCRIPTIONS: Record<SubmitStep, string> = {
  "requesting-upload-url": "Setting up a secure upload session.",
  "uploading-file": "Uploading your contract to encrypted storage.",
  "validating-file": "Running malware scan, validating file type, and extracting readable text.",
  "running-analysis": "Reading the file and preparing your risk preview.",
  "opening-preview": "Opening your free risk preview.",
  "starting-checkout": "Preparing secure checkout with your validated file.",
  "redirecting-to-checkout": "Redirecting you to encrypted Stripe payment.",
};

export function stepLabel(step: SubmitStep): string {
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

export function prettyFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export class ContractSubmitError extends Error {
  step: SubmitStep;
  constructor(step: SubmitStep, message: string) {
    super(message);
    this.name = "ContractSubmitError";
    this.step = step;
  }
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

export type SubmitOutcome =
  | { type: "preview"; url: string; resultId: string }
  | { type: "checkout"; url: string };

/**
 * Runs the full secure submission pipeline for a contract file and returns the
 * URL the caller should navigate to (a free preview, or Stripe checkout).
 *
 * Reports progress through `onStep`. Throws {@link ContractSubmitError} (which
 * carries the failing step) on any failure.
 */
export async function submitContract(opts: {
  file: File;
  reviewChoice: ReviewChoice;
  funnelId: string;
  onStep: (step: SubmitStep) => void;
}): Promise<SubmitOutcome> {
  const { file, reviewChoice, funnelId, onStep } = opts;
  const contentType = file.type || "application/octet-stream";

  void trackFunnelMetric({
    event: "upload_start",
    funnelId,
    fileSizeBytes: file.size,
    fileType: contentType,
  });

  let currentStep: SubmitStep = "requesting-upload-url";
  onStep(currentStep);

  try {
    const uploadUrlRes = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType }),
    });

    if (!uploadUrlRes.ok) {
      throw new Error(
        `Upload URL failed (${uploadUrlRes.status}): ${await readErrorResponse(uploadUrlRes)}`,
      );
    }

    const uploadJson = (await uploadUrlRes.json()) as UploadUrlResponse;
    if (!uploadJson.uploadUrl || !uploadJson.objectKey) {
      throw new Error("Upload URL response missing uploadUrl/objectKey.");
    }

    currentStep = "uploading-file";
    onStep(currentStep);
    const s3PutRes = await fetch(uploadJson.uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: file,
    });

    if (!s3PutRes.ok) {
      throw new Error(`S3 upload failed (${s3PutRes.status}): ${await readErrorResponse(s3PutRes)}`);
    }

    currentStep = "validating-file";
    onStep(currentStep);
    const precheckRes = await fetch("/api/precheck", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        objectKey: uploadJson.objectKey,
        filename: file.name,
        contentType,
        size: file.size,
      }),
    });

    if (!precheckRes.ok) {
      throw new Error(
        `File validation failed (${precheckRes.status}): ${await readErrorResponse(precheckRes)}`,
      );
    }

    const precheckJson = (await precheckRes.json()) as PrecheckResponse;
    if (!precheckJson.precheckPassed || !precheckJson.precheckToken) {
      throw new Error("File validation did not pass. Please upload another file.");
    }

    if (reviewChoice !== "free") {
      currentStep = "starting-checkout";
      onStep(currentStep);
      void trackFunnelMetric({ event: "checkout_start", funnelId });

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: uploadJson.objectKey,
          filename: file.name,
          contentType,
          size: file.size,
          precheckToken: precheckJson.precheckToken,
          reportTier: reviewChoice,
        }),
      });

      if (!checkoutRes.ok) {
        throw new Error(
          `Checkout failed (${checkoutRes.status}): ${await readErrorResponse(checkoutRes)}`,
        );
      }

      const checkoutData = (await checkoutRes.json()) as CheckoutResponse;
      if (!checkoutData.checkoutUrl) {
        throw new Error("Checkout succeeded but no checkout URL was returned.");
      }

      currentStep = "redirecting-to-checkout";
      onStep(currentStep);
      return { type: "checkout", url: checkoutData.checkoutUrl };
    }

    currentStep = "running-analysis";
    onStep(currentStep);
    const previewRes = await fetch("/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        objectKey: uploadJson.objectKey,
        filename: file.name,
        contentType,
        size: file.size,
        precheckToken: precheckJson.precheckToken,
      }),
    });

    if (!previewRes.ok) {
      throw new Error(`Preview failed (${previewRes.status}): ${await readErrorResponse(previewRes)}`);
    }

    const data = (await previewRes.json()) as PreviewResponse;
    if (!data.resultId || !data.previewAccessKey) {
      throw new Error("Preview succeeded but no secure preview link was returned.");
    }

    void trackFunnelMetric({ event: "preview_ready", funnelId, resultId: data.resultId });
    currentStep = "opening-preview";
    onStep(currentStep);
    return {
      type: "preview",
      resultId: data.resultId,
      url: `/preview/${encodeURIComponent(data.resultId)}?p=${encodeURIComponent(data.previewAccessKey)}`,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    throw new ContractSubmitError(currentStep, detail);
  }
}
