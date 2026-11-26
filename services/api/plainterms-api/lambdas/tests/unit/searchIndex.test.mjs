import test from "node:test";
import assert from "node:assert/strict";

import { listOwnerSearchRecords, searchRecordFromItem } from "../../lib/documents.mjs";

process.env.RESULTS_TABLE = "results";

const UI = {
  document: { extracted_text: "PRODUCTION SERVICES AGREEMENT between Harbor Media Inc. and Luna Park Studio.   Net 60 days." },
  review: {
    perspective: { parties: [{ name: "Harbor Media Inc." }, { name: "Luna Park Studio" }] },
    verdict: { headline: "Negotiate before you sign" },
    issues: [{ title: "Harbor can cancel without paying", why: "No pay for finished work." }],
    deal: [{ value: "$18,000, fixed" }],
    gaps: ["Exhibit A is missing"],
  },
};

function item(id, owner, extra = {}) {
  return {
    result_id: { S: id },
    owner_user_id: { S: owner },
    created_at: { S: "2026-11-24T00:00:00Z" },
    file_name: { S: `${id}.docx` },
    risk_score: { N: "53" },
    ui_result: { S: JSON.stringify(UI) },
    ...extra,
  };
}

test("a search record carries names, the review and clean contract text", () => {
  const rec = searchRecordFromItem(item("a", "u1"));
  assert.equal(rec.fileName, "a.docx");
  assert.deepEqual(rec.parties, ["Harbor Media Inc.", "Luna Park Studio"]);
  assert.equal(rec.verdict, "Negotiate before you sign");
  assert.equal(rec.issues[0].title, "Harbor can cancel without paying");
  assert.equal(rec.text, "PRODUCTION SERVICES AGREEMENT between Harbor Media Inc. and Luna Park Studio. Net 60 days.");
});

test("lists the owner's documents newest first, skipping expired ones and other users' items, and retries unprocessed keys", async () => {
  const sent = [];
  let batchCalls = 0;
  const db = {
    async send(cmd) {
      sent.push(cmd.constructor.name);
      if (cmd.constructor.name === "QueryCommand") {
        assert.equal(cmd.input.ExpressionAttributeValues[":u"].S, "u1");
        return {
          Items: [
            { result_id: { S: "new" }, created_at: { S: "2" } },
            { result_id: { S: "old" }, created_at: { S: "1" } },
            { result_id: { S: "gone" }, created_at: { S: "0" }, expires_at: { N: "10" } },
          ],
        };
      }
      batchCalls += 1;
      const keys = cmd.input.RequestItems.results.Keys.map((k) => k.result_id.S);
      assert.ok(!keys.includes("gone"));
      if (batchCalls === 1) {
        // First pass: one item comes back, the other is left unprocessed.
        return { Responses: { results: [item("old", "u1")] }, UnprocessedKeys: { results: { Keys: [{ result_id: { S: "new" } }] } } };
      }
      return { Responses: { results: [item("new", "u1"), item("intruder", "u2")] } };
    },
  };
  const page = await listOwnerSearchRecords("u1", { db, nowEpoch: 100 });
  assert.deepEqual(page.documents.map((d) => d.id), ["new", "old"]);
  assert.equal(batchCalls, 2);
  assert.equal(page.nextCursor, null);
});

test("the documents list carries a short preview of each contract", async () => {
  const { listOwnerDocuments } = await import("../../lib/documents.mjs");
  const db = {
    async send(cmd) {
      if (cmd.constructor.name === "QueryCommand") return { Items: [{ result_id: { S: "a" }, created_at: { S: "1" } }] };
      return { Responses: { results: [item("a", "u1")] } };
    },
  };
  const page = await listOwnerDocuments("u1", { db, nowEpoch: 100 });
  assert.equal(page.documents[0].preview, "PRODUCTION SERVICES AGREEMENT between Harbor Media Inc. and Luna Park Studio. Net 60 days.");
});
