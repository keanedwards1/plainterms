/* /services/api/plainterms-api/hello-world/analyze.mjs */

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST,OPTIONS",
  };
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}

function makeResultId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `demo_${Date.now()}_${rand}`;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // Accept JSON from the frontend (objectKey, filename, contentType).
  // We’re intentionally not doing anything with it yet in the stub.
  let payload = {};
  try {
    const ct =
      event.headers?.["content-type"] ||
      event.headers?.["Content-Type"] ||
      "";
    if (ct.includes("application/json") && event.body) {
      payload = JSON.parse(event.body);
    }
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  // Stub: return a resultId regardless for now.
  // Later: use payload.objectKey to read from S3 + run analysis.
  const resultId = makeResultId();
  return json(200, { resultId });
};
