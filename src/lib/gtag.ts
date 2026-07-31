// GA4 custom events.
//
// Google Ads conversion actions sourced from GA4 listen for an event named
// `manual_event_<NAME>` (created by the "manual code" goal), so each conversion
// is fired twice: once under its plain GA4 name and once under the
// `manual_event_` twin. Mirrors `reportPurchase` in app/analyze/complete/page.tsx.

export function reportFreePreviewCompleted(resultId?: string) {
  if (typeof window === "undefined") return;

  const params = resultId ? { result_id: resultId } : {};

  window.gtag?.("event", "free_preview_completed", params);
  window.gtag?.("event", "manual_event_FREE_PREVIEW_COMPLETED", params);
}
