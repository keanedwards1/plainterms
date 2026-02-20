const DEFAULT_ALLOWED_ORIGIN = "https://plainterms.vercel.app";

function normalizeOrigin(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
}

function getRequestOrigin(event) {
  const headers = event?.headers;
  if (!headers || typeof headers !== "object") return "";
  return normalizeOrigin(headers.origin ?? headers.Origin);
}

export function getAllowedOrigin() {
  const configured = normalizeOrigin(process.env.ALLOWED_ORIGIN);
  return configured || DEFAULT_ALLOWED_ORIGIN;
}

export function corsHeaders(event, methods = "GET,POST,OPTIONS") {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = getRequestOrigin(event);
  const responseOrigin =
    requestOrigin && requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;

  return {
    "access-control-allow-origin": responseOrigin,
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": methods,
    vary: "origin",
  };
}
