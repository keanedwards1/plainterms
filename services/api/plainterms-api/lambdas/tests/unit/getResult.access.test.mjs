import test from "node:test";
import assert from "node:assert/strict";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { handler } from "../../getResult.mjs";
import { createResultAccessKey, hashResultAccessKey } from "../../lib/resultAccessKey.mjs";

process.env.RESULTS_TABLE = "ResultsTest";

const SHARE_KEY = createResultAccessKey();
const uiResult = {
  schema_version: "pt.ui.v1",
  result_id: "pt_1",
  created_at: "2026-11-23T00:00:00.000Z",
  headline: "Summary",
  overview: "Overview",
  sections: [],
  document: { file_name: "contract.pdf", revision: { status: "not_available", locked: true } },
  report: { risk: { score: 40, label: "medium" } },
  addons: {},
  notices: { not_legal_advice: "Not legal advice." },
};

function storedItem(overrides = {}) {
  return {
    result_id: { S: "pt_1" },
    owner_user_id: { S: "user_owner" },
    plan: { S: "free" },
    status: { S: "complete" },
    access_key_hash: { S: hashResultAccessKey(SHARE_KEY) },
    ui_result: { S: JSON.stringify(uiResult) },
    expires_at: { N: String(Math.floor(Date.now() / 1000) + 86400) },
    ...overrides,
  };
}

let item = storedItem();
const originalSend = DynamoDBClient.prototype.send;
DynamoDBClient.prototype.send = async function send(command) {
  if (command.constructor.name === "GetItemCommand") return { Item: item };
  throw new Error(`Unexpected ${command.constructor.name}`);
};
test.after(() => {
  DynamoDBClient.prototype.send = originalSend;
});

function request({ key, viewer } = {}) {
  const event = {
    httpMethod: "GET",
    headers: {},
    pathParameters: { id: "pt_1" },
    queryStringParameters: key ? { k: key } : {},
  };
  const deps = {
    optionalUser: async () => viewer ?? null,
    getUser: async (userId) => ({ userId, plan: "free" }),
  };
  return handler(event, {}, deps);
}

test("the owner can open their document without a share key", async () => {
  item = storedItem();
  const res = await request({ viewer: { userId: "user_owner" } });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.owned, true);
  assert.equal(body.entitlements.plan, "free");
  assert.equal(body.entitlements.revised_document, false);
});

test("anyone with the share key can open it, but it is not marked as theirs", async () => {
  item = storedItem();
  const res = await request({ key: SHARE_KEY });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).owned, false);
});

test("a signed-in stranger without the key gets 404, not the document", async () => {
  item = storedItem();
  const res = await request({ viewer: { userId: "user_stranger" } });
  assert.equal(res.statusCode, 404);
});

test("a wrong share key is rejected", async () => {
  item = storedItem();
  const res = await request({ key: createResultAccessKey() });
  assert.equal(res.statusCode, 403);
});

test("no key and no session is 401", async () => {
  item = storedItem();
  const res = await request();
  assert.equal(res.statusCode, 401);
});

test("an instant result still refining is returned with its stage", async () => {
  item = storedItem({ status: { S: "refining" } });
  const res = await request({ viewer: { userId: "user_owner" } });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).analysis_stage, "refining");
});

test("an expired document is gone even for its owner", async () => {
  item = storedItem({ expires_at: { N: String(Math.floor(Date.now() / 1000) - 10) } });
  const res = await request({ viewer: { userId: "user_owner" } });
  assert.equal(res.statusCode, 410);
});
