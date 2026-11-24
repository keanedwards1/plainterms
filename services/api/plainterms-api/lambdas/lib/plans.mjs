// Single source of truth for what each subscription plan gets.

export const PLANS = Object.freeze(["free", "pro"]);

// Both plans use the richest report shape. Free results have the Pro-only
// pieces stripped server-side (see stripProOnlyContent) so they never reach
// the browser.
export const PLAN_REPORT_TIER = "protect_99";

const DEFAULT_FREE_MONTHLY_LIMIT = 30;
const DEFAULT_PRO_MONTHLY_LIMIT = 300;
const FREE_RETENTION_DAYS = 30;

export function normalizePlan(value) {
  return value === "pro" ? "pro" : "free";
}

function readPositiveInt(name, fallback) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.floor(raw);
}

export function monthlyDocumentLimit(plan) {
  return normalizePlan(plan) === "pro"
    ? readPositiveInt("PRO_MONTHLY_DOC_LIMIT", DEFAULT_PRO_MONTHLY_LIMIT)
    : readPositiveInt("FREE_MONTHLY_DOC_LIMIT", DEFAULT_FREE_MONTHLY_LIMIT);
}

/** Days until a result expires, or null when it is kept until the user deletes it. */
export function retentionDaysForPlan(plan) {
  return normalizePlan(plan) === "pro" ? null : FREE_RETENTION_DAYS;
}

export function freeRetentionDays() {
  return FREE_RETENTION_DAYS;
}

export function modelForPlan(plan) {
  if (normalizePlan(plan) === "pro") {
    return String(process.env.PRO_LLM_MODEL ?? "").trim() || "gpt-5.5";
  }
  return String(process.env.FREE_LLM_MODEL ?? "").trim() || "gpt-5-mini";
}

export function entitlementsForPlan(plan) {
  const isPro = normalizePlan(plan) === "pro";
  return {
    plan: isPro ? "pro" : "free",
    rewrites: isPro,
    revised_document: isPro,
    history: isPro,
  };
}

/** Removes the parts of a report that are Pro-only. Returns a new object. */
export function stripProOnlyContent(report) {
  const copy = JSON.parse(JSON.stringify(report ?? {}));
  if (copy.protect_extras && typeof copy.protect_extras === "object") {
    copy.protect_extras.deeper_rewrites = [];
    copy.protect_extras.fallback_positions = [];
  }
  return copy;
}

export function lockedRevision() {
  return {
    status: "not_available",
    locked: true,
    message: "Track changes and a clean revised draft are included with Pro.",
  };
}

export function isLockedRevision(revision) {
  return Boolean(revision && revision.status === "not_available" && revision.locked === true);
}

/** Subscription statuses that keep Pro access. */
export function planFromSubscriptionStatus(status) {
  return status === "active" || status === "trialing" || status === "past_due" ? "pro" : "free";
}
