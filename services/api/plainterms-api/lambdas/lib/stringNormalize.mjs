export function normalizeLowerTrimmedString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
