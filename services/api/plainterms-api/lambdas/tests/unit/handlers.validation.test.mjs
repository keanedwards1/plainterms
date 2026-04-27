import test from "node:test";
import assert from "node:assert/strict";

import { handler as uploadUrlHandler } from "../../uploadUrl.mjs";
import { handler as precheckUploadHandler } from "../../precheckUpload.mjs";
import { handler as createCheckoutHandler } from "../../createCheckout.mjs";
import { handler as verifyCheckoutHandler } from "../../verifyCheckout.mjs";
import { handler as getResultHandler } from "../../getResult.mjs";

function parseBody(response) {
  return JSON.parse(response.body || "{}");
}

test("uploadUrl returns 405 for non-POST", async () => {
  const res = await uploadUrlHandler({
    httpMethod: "GET",
    headers: { origin: "https://www.plainterms.us" },
  });

  assert.equal(res.statusCode, 405);
  assert.equal(parseBody(res).error, "Method not allowed");
});

test("precheckUpload returns 405 for non-POST", async () => {
  const res = await precheckUploadHandler({
    httpMethod: "GET",
    headers: { origin: "https://www.plainterms.us" },
  });

  assert.equal(res.statusCode, 405);
  assert.equal(parseBody(res).error, "Method not allowed");
});

test("createCheckout returns 400 when required upload fields are missing", async () => {
  const res = await createCheckoutHandler({
    httpMethod: "POST",
    headers: { origin: "https://www.plainterms.us" },
    body: JSON.stringify({}),
  });

  assert.equal(res.statusCode, 400);
  assert.match(parseBody(res).error, /objectKey, filename, contentType/);
});

test("verifyCheckout returns 400 when sessionId is missing", async () => {
  const res = await verifyCheckoutHandler({
    httpMethod: "POST",
    headers: { origin: "https://www.plainterms.us" },
    body: JSON.stringify({}),
  });

  assert.equal(res.statusCode, 400);
  assert.equal(parseBody(res).error, "sessionId is required");
});

test("getResult returns 401 when access key is missing", async () => {
  const res = await getResultHandler({
    httpMethod: "GET",
    headers: { origin: "https://www.plainterms.us" },
    pathParameters: { id: "pt_123" },
    queryStringParameters: {},
  });

  assert.equal(res.statusCode, 401);
  assert.equal(parseBody(res).error, "Missing result access key.");
});
