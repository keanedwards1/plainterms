import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { detectParties, detectPartiesByRules, normalizeDetectedParties } from "../../lib/detectParties.mjs";

const HARBOR = readFileSync(new URL("../fixtures/harbor-contract.txt", import.meta.url), "utf8");

test("finds both parties and their roles in the opening line", () => {
  assert.deepEqual(detectPartiesByRules(HARBOR), [
    { name: "Harbor Media Inc.", role: "client" },
    { name: "Luna Park Studio", role: "vendor" },
  ]);
});

test("handles 'by and between', descriptions after the name, and straight quotes", () => {
  const nda =
    'MUTUAL NONDISCLOSURE AGREEMENT. This Agreement is entered into by and between Acme Robotics, Inc., a Delaware corporation ("Company"), and Jordan Lee ("Recipient"), effective June 1, 2026.';
  assert.deepEqual(detectPartiesByRules(nda), [
    { name: "Acme Robotics, Inc.", role: "company" },
    { name: "Jordan Lee", role: "recipient" },
  ]);
});

test("handles a lease without the word 'between'", () => {
  const lease = 'RESIDENTIAL LEASE. Maple Street Holdings LLC (the "Landlord") and Priya Shah (the "Tenant") agree as follows.';
  assert.deepEqual(detectPartiesByRules(lease), [
    { name: "Maple Street Holdings LLC", role: "landlord" },
    { name: "Priya Shah", role: "tenant" },
  ]);
});

test("returns nothing from rules when the parties aren't named in the usual way", () => {
  assert.deepEqual(detectPartiesByRules("Services agreement. The client hires the contractor to paint the house."), []);
});

test("falls back to the model only when the rules fail, and keeps names found in the text", async () => {
  let calls = 0;
  const viaModel = async () => {
    calls += 1;
    return [
      { name: "Bright Paint Co", role: "contractor" },
      { name: "Sam Ortiz", role: "client" },
    ];
  };
  assert.equal((await detectParties(HARBOR, { detectWithModel: viaModel })).length, 2);
  assert.equal(calls, 0);
  const found = await detectParties("Agreement for painting. Bright Paint Co will paint for Sam Ortiz.", { detectWithModel: viaModel });
  assert.equal(calls, 1);
  assert.deepEqual(found.map((p) => p.name), ["Bright Paint Co", "Sam Ortiz"]);
});

test("model output is filtered to names that appear in the contract", () => {
  const out = normalizeDetectedParties(
    { parties: [{ name: "Sam Ortiz", role: "Client" }, { name: "Invented LLC", role: "vendor" }] },
    "Agreement with Sam Ortiz."
  );
  assert.deepEqual(out, [{ name: "Sam Ortiz", role: "client" }]);
});
