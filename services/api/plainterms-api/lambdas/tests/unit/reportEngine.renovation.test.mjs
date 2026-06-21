import test from "node:test";
import assert from "node:assert/strict";

import { buildReportInsights } from "../../lib/reportEngine.mjs";

const RENOVATION_TEXT = `HOME RENOVATION AGREEMENT between Owner and ABC General Contractor.
Scope of work: kitchen and bathroom remodel including demolition, framing, plumbing, electrical, and drywall.
Owner shall pay a deposit of 50% upon signing. Remaining progress payments per draw schedule.
Contractor may issue change orders for additional work. Allowances are provided for fixtures and flooring.
Owner shall obtain all building permits. Disputes resolved by binding arbitration.`;

const CREATOR_TEXT = `INFLUENCER AGREEMENT. Creator will produce sponsored content for Brand campaign on Instagram and TikTok.
Brand receives a perpetual, irrevocable, worldwide license to all media. Creator grants likeness and paid media rights.`;

const flagTitles = (r) => r.red_flags.map((f) => f.title);
const clauseKeys = (r) => r.clause_breakdown.map((c) => c.key);

test("renovation contract is detected and creator detection stays off", () => {
  const r = buildReportInsights({ extractedText: RENOVATION_TEXT, llmFields: null });
  assert.equal(r.renovation_contract, true);
  assert.equal(r.creator_contract, false);
});

test("renovation contract surfaces homeowner-relevant risk flags", () => {
  const r = buildReportInsights({ extractedText: RENOVATION_TEXT, llmFields: null });
  const titles = flagTitles(r).join(" | ");
  assert.match(titles, /Mechanics Liens/i);
  assert.match(titles, /No clear completion date/i);
  assert.match(titles, /Upfront deposit appears large/i);
  assert.match(titles, /Allowance overruns/i);
  assert.match(titles, /Change orders may not require/i);
  assert.match(titles, /Mandatory arbitration/i);
});

test("renovation contract exposes renovation clause categories", () => {
  const r = buildReportInsights({ extractedText: RENOVATION_TEXT, llmFields: null });
  const keys = clauseKeys(r);
  for (const key of ["deposit_draw_schedule", "liens", "change_orders", "permits", "timeline"]) {
    assert.ok(keys.includes(key), `expected clause ${key} in breakdown`);
  }
});

test("renovation contract suppresses creator/services-only clauses (IP, confidentiality)", () => {
  const r = buildReportInsights({ extractedText: RENOVATION_TEXT, llmFields: null });
  const keys = clauseKeys(r);
  assert.ok(!keys.includes("ip"), "IP clause should be suppressed for renovation");
  assert.ok(!keys.includes("confidentiality"), "confidentiality clause should be suppressed for renovation");
});

test("creator contract is unaffected: no renovation clauses, IP still surfaced", () => {
  const r = buildReportInsights({ extractedText: CREATOR_TEXT, llmFields: null });
  assert.equal(r.creator_contract, true);
  assert.equal(r.renovation_contract, false);
  const keys = clauseKeys(r);
  assert.ok(keys.includes("ip"), "IP clause should still appear for creator contracts");
  for (const key of ["liens", "permits", "change_orders", "timeline", "deposit_draw_schedule"]) {
    assert.ok(!keys.includes(key), `renovation clause ${key} should not appear for creator contracts`);
  }
});

test("plain services agreement that merely says 'contractor' is not misclassified as renovation", () => {
  const services = `INDEPENDENT CONTRACTOR AGREEMENT. The Contractor will provide marketing consulting services to the Client.
  Payment net 30. Either party may terminate with 30 days notice. Confidentiality applies.`;
  const r = buildReportInsights({ extractedText: services, llmFields: null });
  assert.equal(r.renovation_contract, false);
});
