"use client";

export type FunnelMetricEvent =
  | "upload_start"
  | "preview_ready"
  | "checkout_start"
  | "checkout_success"
  | "result_viewed"
  | "survey_rating";

type FunnelMetricPayload = {
  event: FunnelMetricEvent;
  funnelId?: string;
  resultId?: string;
  sessionId?: string;
  fileSizeBytes?: number;
  fileType?: string;
  rating?: "positive" | "negative";
  abVariant?: string;
};

const FUNNEL_ID_KEY = "pt_funnel_id";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateFunnelId(): string {
  if (typeof window === "undefined") return randomId();

  const existing = window.sessionStorage.getItem(FUNNEL_ID_KEY);
  if (existing) return existing;

  const next = randomId();
  window.sessionStorage.setItem(FUNNEL_ID_KEY, next);
  return next;
}

export function clearFunnelId() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FUNNEL_ID_KEY);
}

export async function trackFunnelMetric(payload: FunnelMetricPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    event: payload.event,
    funnelId: payload.funnelId ?? getOrCreateFunnelId(),
    resultId: payload.resultId,
    sessionId: payload.sessionId,
    fileSizeBytes: payload.fileSizeBytes,
    fileType: payload.fileType,
    rating: payload.rating,
    abVariant: payload.abVariant,
    pathname: window.location.pathname,
    clientTs: new Date().toISOString(),
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/metrics", blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  try {
    await fetch("/api/metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort telemetry.
  }
}
