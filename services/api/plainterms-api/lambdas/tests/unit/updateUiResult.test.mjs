import test from "node:test";
import assert from "node:assert/strict";

import { updateUiResult } from "../../lib/updateUiResult.mjs";

/** A tiny in-memory stand-in for the one DynamoDB item, with an optional clash on the first write. */
function fakeDb({ clashOnce = false } = {}) {
  const item = { result_id: { S: "r1" }, ui_result: { S: JSON.stringify({ n: 0 }) } };
  let clashed = false;
  const writes = [];
  return {
    item,
    writes,
    async send(cmd) {
      const name = cmd.constructor.name;
      if (name === "GetItemCommand") return { Item: structuredClone(item) };
      const values = cmd.input.ExpressionAttributeValues;
      if (clashOnce && !clashed) {
        clashed = true;
        // Someone else wrote first.
        item.ui_result = { S: JSON.stringify({ n: 100 }) };
        item.ui_version = { N: "1" };
        const err = new Error("conflict");
        err.name = "ConditionalCheckFailedException";
        throw err;
      }
      const current = Number(item.ui_version?.N ?? 0);
      if (current !== Number(values[":cur"].N)) {
        const err = new Error("conflict");
        err.name = "ConditionalCheckFailedException";
        throw err;
      }
      item.ui_result = values[":ui"];
      item.ui_version = values[":next"];
      writes.push(cmd.input.UpdateExpression);
      return {};
    },
  };
}

test("writes the mutated result and bumps the version", async () => {
  const db = fakeDb();
  const out = await updateUiResult("r1", (ui) => ({ n: ui.n + 1 }), { db });
  assert.equal(out.reason, "updated");
  assert.deepEqual(JSON.parse(db.item.ui_result.S), { n: 1 });
  assert.equal(db.item.ui_version.N, "1");
});

test("re-reads and applies the change on top of a concurrent write", async () => {
  const db = fakeDb({ clashOnce: true });
  await updateUiResult("r1", (ui) => ({ n: ui.n + 1 }), { db });
  assert.deepEqual(JSON.parse(db.item.ui_result.S), { n: 101 });
  assert.equal(db.item.ui_version.N, "2");
});

test("leaves the result alone when the mutation returns null, and writes extra attributes", async () => {
  const db = fakeDb();
  assert.equal((await updateUiResult("r1", () => null, { db })).reason, "unchanged");
  await updateUiResult("r1", (ui) => ui, { db, extra: () => ({ set: ["risk_score = :s"], values: { ":s": { N: "5" } } }) });
  assert.match(db.writes[0], /risk_score = :s/);
});
