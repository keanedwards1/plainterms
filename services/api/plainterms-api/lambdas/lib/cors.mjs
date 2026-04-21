const DEFAULT_ALLOWED_ORIGIN = "https://www.plainterms.us";
const BASE_ALLOWED_ORIGIN_PATTERNS = [
  DEFAULT_ALLOWED_ORIGIN,
  "https://plainterms.us",
  "https://plainterms.vercel.app",
  "http://localhost:3000",
  "https://plainterms-*.vercel.app",
];

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

function wildcardToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function getAllowedOriginPatterns() {
  const raw = process.env.ALLOWED_ORIGINS;
  const configured =
    raw && typeof raw === "string"
      ? raw
          .split(",")
          .map((value) => normalizeOrigin(value))
          .filter(Boolean)
      : [];

  return [...new Set([...(configured.length > 0 ? configured : [getAllowedOrigin()]), ...BASE_ALLOWED_ORIGIN_PATTERNS])];
}

function isOriginAllowed(origin, allowedPatterns) {
  if (!origin) return false;

  for (const pattern of allowedPatterns) {
    if (!pattern.includes("*")) {
      if (origin === pattern) return true;
      continue;
    }

    if (wildcardToRegex(pattern).test(origin)) return true;
  }

  return false;
}

export function corsHeaders(event, methods = "GET,POST,OPTIONS") {
  const allowedOrigin = getAllowedOrigin();
  const allowedPatterns = getAllowedOriginPatterns();
  const requestOrigin = getRequestOrigin(event);
  const responseOrigin = isOriginAllowed(requestOrigin, allowedPatterns)
    ? requestOrigin
    : allowedOrigin;

  return {
    "access-control-allow-origin": responseOrigin,
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": methods,
    vary: "origin",
  };
}
