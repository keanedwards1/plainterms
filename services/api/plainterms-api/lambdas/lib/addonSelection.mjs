import { ADDON_OPTIONS } from "./contractOptions.mjs";
import { normalizeLowerTrimmedString } from "./stringNormalize.mjs";

export const ALLOWED_ADDONS = [...ADDON_OPTIONS];

const addonSet = new Set(ALLOWED_ADDONS);

function normalizeSelectedAddons(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const selected = [];

  for (const raw of value) {
    const normalized = normalizeLowerTrimmedString(raw);
    if (!normalized) continue;
    if (!addonSet.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    selected.push(normalized);
  }

  return selected;
}

export function parseAddonSelection(input = {}) {
  const selectedAddonsProvided = input.selectedAddons !== undefined;
  if (selectedAddonsProvided && !Array.isArray(input.selectedAddons)) {
    return { ok: false, error: "selectedAddons must be an array when provided." };
  }

  const selectedAddons = normalizeSelectedAddons(input.selectedAddons);

  if (Array.isArray(input.selectedAddons)) {
    const invalid = input.selectedAddons.filter((item) => {
      const normalized = normalizeLowerTrimmedString(item);
      return !normalized || !addonSet.has(normalized);
    });
    if (invalid.length > 0) {
      return {
        ok: false,
        error: `selectedAddons must contain only: ${ALLOWED_ADDONS.join(", ")}`,
      };
    }
  }

  return {
    ok: true,
    selection: { selectedAddons },
  };
}

export function formatSelectedAddonsCsv(selectedAddons = []) {
  return normalizeSelectedAddons(selectedAddons).join(",");
}

export function parseSelectedAddonsCsv(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  return normalizeSelectedAddons(value.split(","));
}
