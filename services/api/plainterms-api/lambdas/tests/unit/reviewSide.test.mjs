import test from "node:test";
import assert from "node:assert/strict";

import { applyNewSideReview, planSideSwitch, reviewParties } from "../../lib/reviewSide.mjs";

const review = (party, other) => ({
  version: "review.v1",
  perspective: {
    party,
    role: "x",
    other_party: other,
    other_role: "y",
    other_short: other,
    parties: [
      { name: "Harbor Media Inc.", role: "client" },
      { name: "Luna Park Studio", role: "vendor" },
    ],
  },
});

const studio = review("Luna Park Studio", "Harbor Media Inc.");
const harbor = review("Harbor Media Inc.", "Luna Park Studio");
const base = { result_id: "r1", review: studio, document: { revision: { status: "ready", revised_text: "studio draft" } } };

test("reviewParties lists each party once", () => {
  assert.deepEqual(reviewParties(studio), ["Harbor Media Inc.", "Luna Park Studio"]);
});

test("switching to a party not in the contract is rejected", () => {
  assert.equal(planSideSwitch(base, "Someone Else LLC").kind, "invalid");
  assert.equal(planSideSwitch(base, "").kind, "invalid");
  assert.equal(planSideSwitch({ result_id: "r1" }, "Harbor Media Inc.").kind, "invalid");
});

test("switching to the current side does nothing", () => {
  assert.equal(planSideSwitch(base, "luna park studio").kind, "noop");
});

test("a new side needs a fresh review and is marked processing", () => {
  const plan = planSideSwitch(base, "harbor media inc.");
  assert.equal(plan.kind, "generate");
  assert.equal(plan.party, "Harbor Media Inc.");
  assert.deepEqual(plan.uiResult.review_status, { state: "processing", party: "Harbor Media Inc." });
  assert.equal(plan.uiResult.review, studio);
});

test("a new review keeps the old one and its draft to switch back to", () => {
  const next = applyNewSideReview(base, harbor, { revision: { status: "processing" } });
  assert.equal(next.review, harbor);
  assert.equal(next.review_alt, studio);
  assert.deepEqual(next.document.revision, { status: "processing" });
  assert.equal(next.document.revision_alt.revised_text, "studio draft");
  assert.deepEqual(next.review_status, { state: "ready", party: "Harbor Media Inc." });

  // Switching back is instant and swaps the drafts too.
  const back = planSideSwitch({ ...next, document: { ...next.document, revision: { status: "ready", revised_text: "harbor draft" } } }, "Luna Park Studio");
  assert.equal(back.kind, "swapped");
  assert.equal(back.uiResult.review, studio);
  assert.equal(back.uiResult.review_alt, harbor);
  assert.equal(back.uiResult.document.revision.revised_text, "studio draft");
  assert.equal(back.uiResult.document.revision_alt.revised_text, "harbor draft");
});
