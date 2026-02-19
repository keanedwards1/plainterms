#!/usr/bin/env node

const rawBaseUrl = process.env.SMOKE_BASE_URL ?? process.env.APP_BASE_URL ?? "";
const baseUrl = rawBaseUrl.trim().replace(/\/+$/, "");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function short(value, max = 280) {
  if (typeof value !== "string") return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

async function readBody(res) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  return text;
}

function logStep(message) {
  process.stdout.write(`${message}\n`);
}

async function request(path, init = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "user-agent": "plainterms-smoke-funnel/1.0",
    ...(init.headers ?? {}),
  };
  return fetch(url, {
    ...init,
    headers,
    redirect: "manual",
  });
}

async function main() {
  assert(baseUrl, "Missing SMOKE_BASE_URL (or APP_BASE_URL).");
  assert(/^https?:\/\//.test(baseUrl), `SMOKE_BASE_URL must be absolute. Received: ${baseUrl}`);

  logStep(`Smoke target: ${baseUrl}`);

  logStep("1) GET /analyze");
  const analyzePage = await request("/analyze");
  assert(analyzePage.ok, `GET /analyze failed (${analyzePage.status})`);

  logStep("2) POST /api/upload-url");
  const timestamp = Date.now();
  const filename = `smoke-${timestamp}.pdf`;
  const uploadUrlRes = await request("/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename,
      contentType: "application/pdf",
    }),
  });
  assert(uploadUrlRes.ok, `POST /api/upload-url failed (${uploadUrlRes.status})`);
  const uploadUrlJson = await readBody(uploadUrlRes);
  assert(typeof uploadUrlJson === "object" && uploadUrlJson, "upload-url response was not JSON.");
  assert(typeof uploadUrlJson.uploadUrl === "string", "upload-url response missing uploadUrl.");
  assert(typeof uploadUrlJson.objectKey === "string", "upload-url response missing objectKey.");

  logStep("3) POST /api/upload-file");
  const pdfBytes = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<<>>\nendobj\nBT (This contract includes payment and termination terms.) Tj ET\n%%EOF\n",
    "utf8"
  );
  const form = new FormData();
  form.set("uploadUrl", uploadUrlJson.uploadUrl);
  form.set("file", new File([pdfBytes], filename, { type: "application/pdf" }));

  const uploadFileRes = await request("/api/upload-file", {
    method: "POST",
    body: form,
  });
  if (!uploadFileRes.ok) {
    const body = await readBody(uploadFileRes);
    fail(`POST /api/upload-file failed (${uploadFileRes.status}): ${short(JSON.stringify(body))}`);
  }

  logStep("4) POST /api/precheck");
  const precheckRes = await request("/api/precheck", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      objectKey: uploadUrlJson.objectKey,
      filename,
      contentType: "application/pdf",
      size: pdfBytes.length,
    }),
  });
  if (!precheckRes.ok) {
    const body = await readBody(precheckRes);
    fail(`POST /api/precheck failed (${precheckRes.status}): ${short(JSON.stringify(body))}`);
  }
  const precheckJson = await readBody(precheckRes);
  assert(typeof precheckJson === "object" && precheckJson, "precheck response was not JSON.");
  assert(typeof precheckJson.precheckToken === "string", "precheck response missing precheckToken.");

  logStep("5) POST /api/checkout");
  const checkoutRes = await request("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      objectKey: uploadUrlJson.objectKey,
      filename,
      contentType: "application/pdf",
      size: pdfBytes.length,
      precheckToken: precheckJson.precheckToken,
    }),
  });
  if (!checkoutRes.ok) {
    const body = await readBody(checkoutRes);
    fail(`POST /api/checkout failed (${checkoutRes.status}): ${short(JSON.stringify(body))}`);
  }
  const checkoutJson = await readBody(checkoutRes);
  assert(typeof checkoutJson === "object" && checkoutJson, "checkout response was not JSON.");
  assert(typeof checkoutJson.checkoutSessionId === "string", "checkout response missing checkoutSessionId.");
  assert(typeof checkoutJson.checkoutUrl === "string", "checkout response missing checkoutUrl.");

  logStep("6) POST /api/checkout/verify (expect unpaid)");
  const verifyRes = await request("/api/checkout/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: checkoutJson.checkoutSessionId }),
  });

  if (verifyRes.status === 409) {
    const verifyBody = await readBody(verifyRes);
    logStep(`checkout/verify returned expected 409 unpaid: ${short(JSON.stringify(verifyBody), 180)}`);
    logStep("Smoke funnel passed.");
    return;
  }

  if (verifyRes.status === 200) {
    const verifyJson = await readBody(verifyRes);
    assert(typeof verifyJson === "object" && verifyJson, "verify response was not JSON.");
    assert(typeof verifyJson.resultId === "string", "verify response missing resultId.");
    logStep(`checkout/verify returned 200 with resultId=${verifyJson.resultId}`);

    const resultRes = await request(`/api/result/${encodeURIComponent(verifyJson.resultId)}`);
    assert(
      resultRes.status === 200 || resultRes.status === 202,
      `GET /api/result/${verifyJson.resultId} failed (${resultRes.status})`
    );
    logStep(`Result status after verify: ${resultRes.status}`);
    logStep("Smoke funnel passed.");
    return;
  }

  const verifyBody = await readBody(verifyRes);
  fail(`POST /api/checkout/verify unexpected status (${verifyRes.status}): ${short(JSON.stringify(verifyBody))}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Smoke funnel failed: ${message}\n`);
  process.exit(1);
});
