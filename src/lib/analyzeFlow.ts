"use client";

import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";

// Client pipeline for the app-first home page:
//   1. prepareUpload: secure upload + safety check, started as soon as a file
//      is chosen so it's usually done before the user presses Analyze.
//   2. startAnalysis: POST /api/analyze (needs sign-in). If the user is signed
//      out, the prepared upload is stashed and resumed after sign-in.

export type PreparedUpload = {
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  precheckToken: string;
  preparedAt: number;
};

export type AnalysisStarted = {
  resultId: string;
  accessKey: string;
  status: "refining" | "complete";
  plan: "free" | "pro";
};

export type AnalyzeFailure =
  | { kind: "sign_in_required" }
  | { kind: "monthly_limit"; plan: "free" | "pro" }
  | { kind: "upload_expired"; message: string }
  | { kind: "error"; message: string };

export const ACCEPTED_FILE_PATTERN = /\.(pdf|docx|txt)$/i;
export const ACCEPTED_FILE_TYPES =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const PENDING_KEY = "pt.pendingAnalysis";
// Precheck tokens last 15 minutes; leave a margin for the sign-in round trip.
const PENDING_MAX_AGE_MS = 13 * 60 * 1000;

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

async function readError(res: Response, fallback: string): Promise<{ message: string; code?: string }> {
  try {
    const json = (await res.json()) as { error?: unknown; code?: unknown };
    const message = typeof json.error === "string" && json.error.trim() ? json.error : fallback;
    return { message, code: typeof json.code === "string" ? json.code : undefined };
  } catch {
    return { message: fallback };
  }
}

function contentTypeFor(file: File): string {
  if (file.type) return file.type;
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  if (/\.docx$/i.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (/\.txt$/i.test(file.name)) return "text/plain";
  return "application/octet-stream";
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_FILE_PATTERN.test(file.name)) return "Choose a PDF, Word (.docx) or text file.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return "That file is over 25 MB. Try a smaller copy.";
  return null;
}

/** Turns pasted contract text into a .txt file for the same upload pipeline. */
export function fileFromPastedText(text: string, name = "Pasted contract.txt"): File {
  return new File([text], name, { type: "text/plain" });
}

export type PrepareStage = "uploading" | "checking";

export async function prepareUpload(
  file: File,
  onStage?: (stage: PrepareStage) => void
): Promise<PreparedUpload> {
  const contentType = contentTypeFor(file);
  const funnelId = getOrCreateFunnelId();
  void trackFunnelMetric({ event: "upload_start", funnelId, fileSizeBytes: file.size, fileType: contentType });

  onStage?.("uploading");
  const urlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType }),
  });
  if (!urlRes.ok) {
    throw new UploadError((await readError(urlRes, "We couldn't start the upload. Please try again.")).message);
  }
  const { uploadUrl, objectKey } = (await urlRes.json()) as { uploadUrl?: string; objectKey?: string };
  if (!uploadUrl || !objectKey) throw new UploadError("We couldn't start the upload. Please try again.");

  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": contentType }, body: file });
  if (!putRes.ok) throw new UploadError("The upload didn't finish. Check your connection and try again.");

  onStage?.("checking");
  const precheckRes = await fetch("/api/precheck", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objectKey, filename: file.name, contentType, size: file.size }),
  });
  if (!precheckRes.ok) {
    throw new UploadError(
      (await readError(precheckRes, "We couldn't read this file. Try a different copy of the contract.")).message
    );
  }
  const precheck = (await precheckRes.json()) as { precheckPassed?: boolean; precheckToken?: string };
  if (!precheck.precheckPassed || !precheck.precheckToken) {
    throw new UploadError("We couldn't read this file. Try a different copy of the contract.");
  }

  return {
    objectKey,
    filename: file.name,
    contentType,
    size: file.size,
    precheckToken: precheck.precheckToken,
    preparedAt: Date.now(),
  };
}

export async function startAnalysis(
  prepared: PreparedUpload
): Promise<{ ok: true; started: AnalysisStarted } | { ok: false; failure: AnalyzeFailure }> {
  const { preparedAt: _preparedAt, ...body } = prepared;
  void _preparedAt;
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const started = (await res.json()) as AnalysisStarted;
    void trackFunnelMetric({ event: "preview_ready", funnelId: getOrCreateFunnelId(), resultId: started.resultId });
    return { ok: true, started };
  }

  const { message, code } = await readError(res, "We couldn't analyze this document. Please try again.");
  if (res.status === 401) return { ok: false, failure: { kind: "sign_in_required" } };
  if (res.status === 429 || code === "monthly_limit_reached") {
    return { ok: false, failure: { kind: "monthly_limit", plan: "free" } };
  }
  if (res.status === 409) return { ok: false, failure: { kind: "upload_expired", message } };
  return { ok: false, failure: { kind: "error", message } };
}

export function stashPendingAnalysis(prepared: PreparedUpload) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(prepared));
  } catch {
    // Without storage the user just adds the file again after signing in.
  }
}

/** Returns and clears a stashed upload, if it is still fresh enough to analyze. */
export function takePendingAnalysis(): PreparedUpload | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreparedUpload;
    if (!parsed?.objectKey || !parsed.precheckToken) return null;
    if (Date.now() - Number(parsed.preparedAt ?? 0) > PENDING_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resultPath(resultId: string): string {
  return `/result/${encodeURIComponent(resultId)}`;
}

export function signInPath(returnTo: string, mode?: "sign-up"): string {
  const params = new URLSearchParams({ returnTo });
  if (mode) params.set("mode", mode);
  return `/sign-in?${params.toString()}`;
}

export function prettyFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
