import { corsHeaders } from "./cors.mjs";

export function jsonResponse(event, statusCode, bodyObj, methods = "GET,POST,OPTIONS") {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event, methods),
      "content-type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}

export function optionsResponse(event, methods = "GET,POST,OPTIONS") {
  return { statusCode: 200, headers: corsHeaders(event, methods), body: "" };
}

export function methodGuard(event, method, methods = `${method},OPTIONS`) {
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse(event, methods);
  }

  if (event.httpMethod !== method) {
    return jsonResponse(event, 405, { error: "Method not allowed" }, methods);
  }

  return null;
}

export function parseJsonBody(event, methods = "POST,OPTIONS") {
  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    return { ok: true, payload };
  } catch {
    return {
      ok: false,
      response: jsonResponse(event, 400, { error: "Invalid JSON body" }, methods),
    };
  }
}
