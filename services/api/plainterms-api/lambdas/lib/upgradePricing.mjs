// Pure helpers for result-page tier upgrades. Upgrades charge only the price
// difference between the already-purchased tier and the selected tier, so no
// separate "upgrade" Stripe products are needed.

export const TIER_RANK = Object.freeze({ scan_39: 1, report_69: 2, protect_99: 3 });
export const TIER_LABELS = Object.freeze({ scan_39: "Core", report_69: "Report", protect_99: "Protect" });

/** True only when selectedTier is a known tier strictly above currentTier. */
export function isTierUpgrade(currentTier, selectedTier) {
  const current = TIER_RANK[currentTier];
  const selected = TIER_RANK[selectedTier];
  return Boolean(current && selected && selected > current);
}

/**
 * Price difference (in the smallest currency unit) to charge for an upgrade.
 * Returns null when the inputs aren't a positive, finite upgrade amount.
 */
export function computeUpgradeAmount(currentUnitAmount, selectedUnitAmount) {
  const diff = Number(selectedUnitAmount ?? 0) - Number(currentUnitAmount ?? 0);
  return Number.isFinite(diff) && diff > 0 ? diff : null;
}
