import test from "node:test";
import assert from "node:assert/strict";

import { computeUpgradeAmount, isTierUpgrade } from "../../lib/upgradePricing.mjs";

test("isTierUpgrade allows moves to a strictly higher tier", () => {
  assert.equal(isTierUpgrade("scan_39", "report_69"), true);
  assert.equal(isTierUpgrade("scan_39", "protect_99"), true);
  assert.equal(isTierUpgrade("report_69", "protect_99"), true);
});

test("isTierUpgrade rejects same tier, downgrades, and unknown tiers", () => {
  assert.equal(isTierUpgrade("report_69", "report_69"), false); // same
  assert.equal(isTierUpgrade("protect_99", "report_69"), false); // downgrade
  assert.equal(isTierUpgrade("report_69", "scan_39"), false); // downgrade
  assert.equal(isTierUpgrade("bogus", "protect_99"), false); // unknown current
  assert.equal(isTierUpgrade("scan_39", "bogus"), false); // unknown selected
});

test("computeUpgradeAmount returns the positive difference", () => {
  assert.equal(computeUpgradeAmount(2900, 7900), 5000); // Core -> Report
  assert.equal(computeUpgradeAmount(2900, 14900), 12000); // Core -> Protect
  assert.equal(computeUpgradeAmount(7900, 14900), 7000); // Report -> Protect
});

test("computeUpgradeAmount returns null for non-positive or invalid amounts", () => {
  assert.equal(computeUpgradeAmount(7900, 7900), null); // no difference
  assert.equal(computeUpgradeAmount(14900, 7900), null); // negative
  assert.equal(computeUpgradeAmount(undefined, 7900), 7900); // missing current treated as 0
  assert.equal(computeUpgradeAmount(2900, undefined), null); // missing selected -> non-positive
  assert.equal(computeUpgradeAmount("abc", 7900), null); // non-numeric -> NaN -> null
});
