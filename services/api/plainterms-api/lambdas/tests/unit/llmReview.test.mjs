import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { findVerbatim, normalizeReview, buildReviewPrompt } from "../../lib/llmReview.mjs";
import { reviewRiskScore, reviewRiskLabel } from "../../lib/reviewScore.mjs";

const CONTRACT = readFileSync(new URL("../fixtures/harbor-contract.txt", import.meta.url), "utf8");

function rawReview(overrides = {}) {
  return {
    perspective: {
      party: "Luna Park Studio",
      role: "Vendor",
      other_party: "Harbor Media Inc.",
      other_role: "client",
      other_short: "Harbor",
      parties: [
        { name: "Harbor Media Inc.", role: "client" },
        { name: "Luna Park Studio", role: "vendor" },
      ],
      confidence: "high",
    },
    verdict: { action: "negotiate", headline: "Negotiate before you sign", line: "The work isn't defined — and Harbor can cancel." },
    deal: [
      { label: "Fee", value: "$18,000, fixed", flag: "" },
      { label: "Between", value: "Luna Park Studio and Harbor Media Inc.", flag: "" },
      { label: "Mood", value: "not a real label", flag: "" },
    ],
    gaps: ["Exhibit A and Appendix 1", "An Effective Date"],
    issues: [
      {
        severity: "medium",
        priority: "worth",
        section_ref: "§2",
        title: "You wait 60 days for $12,600",
        quote: "remainder within Net 60 days after invoice",
        why: "No late fee.",
        why_short: "No late fee.",
        usual: "Net 30 with a late fee",
        ask_short: "Net 30.",
        ask_email_line: "Payment within 30 days of invoice.",
        fallback: "Keep Net 60 with a late fee.",
        walk_away_if: "",
        they_say: "“Net 60 is our standard.”",
        you_say: "I can work with 60 days if there's a late fee.",
        redline: { before: "this sentence is not in the contract", after: "Net 30." },
      },
      {
        severity: "high",
        priority: "must",
        section_ref: "1",
        title: "You'd owe work nobody has written down",
        // Straight quotes and different spacing still match the curly source.
        quote: "If any exhibit is unavailable at signing,   Vendor will still perform services requested by Client.",
        why: "The scope isn't attached.",
        why_short: "The scope isn't attached.",
        usual: "Scope attached at signing",
        ask_short: "Attach Exhibit A and Appendix 1.",
        ask_email_line: "Please attach Exhibit A and Appendix 1 before we sign.",
        fallback: "Agree the exhibits within 30 days.",
        walk_away_if: "They won't put the scope in writing.",
        they_say: "We'll send the SOW after you sign.",
        you_say: "Happy to start once it's attached.",
        redline: {
          before: "If any exhibit is unavailable at signing, Vendor will still perform services requested by Client.",
          after: "Vendor has no obligation to perform services not described in a signed SOW.",
        },
      },
      {
        severity: "high",
        title: "Made-up issue",
        quote: "Client will pay a bonus of one million dollars.",
        why: "Invented.",
      },
      {
        severity: "low",
        section_ref: "4",
        title: "Harbor can take back your portfolio rights",
        quote: "unless prohibited by Client in writing",
        why: "Harbor can stop you showing the work.",
        redline: null,
      },
    ],
    good: [{ section_ref: "§6", text: "Your liability is capped at what you've been paid." }],
    checklist: [{ title: "Read Exhibit A", detail: "It defines the job." }],
    sign_as_is: [{ severity: "high", text: "Harbor can cancel without paying for finished work." }],
    dates: [{ when: "On signing", what: "Invoice the $5,400 deposit" }],
    what_ifs: [{ q: "Harbor cancels partway", a: "They give 7 days' notice (§3)." }],
    questions: ["When will Exhibit A be ready?"],
    ...overrides,
  };
}

test("findVerbatim maps straight quotes, dashes and spacing back to the exact source text", () => {
  const found = findVerbatim(CONTRACT, 'between Harbor Media Inc. ("Client") and Luna Park Studio');
  assert.equal(found, "between Harbor Media Inc. (“Client”) and Luna Park Studio");
  assert.equal(findVerbatim(CONTRACT, "a sentence that is not there"), "");
  assert.equal(findVerbatim(CONTRACT, "ab"), "");
});

test("normalizeReview keeps only issues quoted from the contract and sorts by severity", () => {
  const review = normalizeReview(rawReview(), CONTRACT, { model: "test" });
  assert.ok(review);
  assert.equal(review.version, "review.v1");
  assert.deepEqual(
    review.issues.map((i) => [i.id, i.severity, i.title]),
    [
      ["i1", "high", "You'd owe work nobody has written down"],
      ["i2", "medium", "You wait 60 days for $12,600"],
      ["i3", "low", "Harbor can take back your portfolio rights"],
    ]
  );
  // The quote is the exact contract text, with the source's own spacing.
  assert.equal(review.issues[0].quote, "If any exhibit is unavailable at signing, Vendor will still perform services requested by Client.");
});

test("normalizeReview drops redlines whose 'before' is not in the contract", () => {
  const review = normalizeReview(rawReview(), CONTRACT);
  const scope = review.issues.find((i) => i.section_ref === "1");
  const payment = review.issues.find((i) => i.section_ref === "2");
  assert.ok(scope.redline);
  assert.equal(scope.redline.before, "If any exhibit is unavailable at signing, Vendor will still perform services requested by Client.");
  assert.equal(payment.redline, null);
});

test("normalizeReview cleans text: no dashes, no wrapping quotes, known deal labels in order, § stripped", () => {
  const review = normalizeReview(rawReview(), CONTRACT);
  assert.equal(review.verdict.line, "The work isn't defined, and Harbor can cancel.");
  assert.deepEqual(review.deal.map((d) => d.label), ["Between", "Fee"]);
  assert.equal(review.issues[1].they_say, "Net 60 is our standard.");
  assert.equal(review.issues[1].section_ref, "2");
  assert.equal(review.good[0].section_ref, "6");
  assert.equal(review.perspective.role, "vendor");
  // Priority falls back from severity when the model leaves it out.
  assert.equal(review.issues[2].priority, "nice");
});

test("normalizeReview rejects output without both parties or a verdict", () => {
  assert.equal(normalizeReview(rawReview({ perspective: { party: "Luna Park Studio" } }), CONTRACT), null);
  assert.equal(normalizeReview(rawReview({ verdict: {} }), CONTRACT), null);
  // The headline is set from the action, whatever the model wrote.
  assert.equal(normalizeReview(rawReview({ verdict: { action: "do_not_sign_yet", headline: "Fix scope", line: "x" } }), CONTRACT).verdict.headline, "Don't sign this yet");
  assert.equal(normalizeReview(null, CONTRACT), null);
});

test("the review's risk score comes from its issues", () => {
  const review = normalizeReview(rawReview(), CONTRACT);
  // 1 high, 1 medium, 1 low: 5 + 14 + 6 + 2 = 27, lifted to 35 by the high issue.
  assert.deepEqual(review.risk, { score: 35, label: "medium" });
});

test("reviewRiskScore bands and floors", () => {
  const issues = (h, m, l) => [
    ...Array(h).fill({ severity: "high" }),
    ...Array(m).fill({ severity: "medium" }),
    ...Array(l).fill({ severity: "low" }),
  ];
  assert.deepEqual(reviewRiskScore([]), { score: 5, label: "low" });
  assert.deepEqual(reviewRiskScore(issues(2, 3, 1)), { score: 53, label: "medium" });
  assert.deepEqual(reviewRiskScore(issues(4, 0, 0)), { score: 61, label: "high" });
  assert.equal(reviewRiskScore(issues(0, 1, 0), "do_not_sign_yet").label, "high");
  assert.equal(reviewRiskScore(issues(10, 10, 10)).score, 95);
  assert.equal(reviewRiskLabel(29), "low");
  assert.equal(reviewRiskLabel(30), "medium");
});

test("the prompt pins the side when a party is given", () => {
  assert.match(buildReviewPrompt({ extractedText: "x", party: "Harbor Media Inc." }), /You act for: Harbor Media Inc\./);
  assert.match(buildReviewPrompt({ extractedText: "x" }), /most likely to have been sent this contract/);
});
