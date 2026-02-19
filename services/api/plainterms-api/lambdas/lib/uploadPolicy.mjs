const SUPPORTED_UPLOADS = Object.freeze({
  pdf: {
    mimeTypes: new Set(["application/pdf"]),
    extensions: new Set([".pdf"]),
    normalizedContentType: "application/pdf",
  },
  docx: {
    mimeTypes: new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    extensions: new Set([".docx"]),
    normalizedContentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
});

const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function parseMaxUploadBytes() {
  const raw = Number(process.env.UPLOAD_MAX_BYTES ?? DEFAULT_MAX_UPLOAD_BYTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_UPLOAD_BYTES;
  return Math.floor(raw);
}

function extensionFromFilename(filename) {
  if (typeof filename !== "string") return "";
  const trimmed = filename.trim();
  if (!trimmed) return "";

  const base = trimmed.split(/[\\/]/).pop() ?? trimmed;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot).toLowerCase();
}

export function sanitizeFilename(filename) {
  const raw = typeof filename === "string" ? filename : "";
  const base = raw.trim().split(/[\\/]/).pop() ?? "document";
  const safe = base.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);
  return safe || "document";
}

export function normalizeContentType(contentType) {
  if (typeof contentType !== "string") return "";
  return contentType.split(";")[0].trim().toLowerCase();
}

function uploadTypeFromMime(contentType) {
  if (!contentType) return null;
  for (const [type, cfg] of Object.entries(SUPPORTED_UPLOADS)) {
    if (cfg.mimeTypes.has(contentType)) return type;
  }
  return null;
}

function uploadTypeFromExtension(extension) {
  if (!extension) return null;
  for (const [type, cfg] of Object.entries(SUPPORTED_UPLOADS)) {
    if (cfg.extensions.has(extension)) return type;
  }
  return null;
}

export function detectSupportedUploadType({ filename, contentType }) {
  const normalizedType = normalizeContentType(contentType);
  const ext = extensionFromFilename(filename);

  const fromMime = uploadTypeFromMime(normalizedType);
  const fromExt = uploadTypeFromExtension(ext);

  if (fromMime && fromExt && fromMime !== fromExt) {
    return {
      ok: false,
      errorCode: "content_type_extension_mismatch",
      error:
        "File extension and MIME type do not match. Please upload a valid PDF or DOCX file.",
    };
  }

  const resolvedType = fromMime ?? fromExt;
  if (!resolvedType) {
    return {
      ok: false,
      errorCode: "unsupported_file_type",
      error: "Only PDF and DOCX files are supported.",
    };
  }

  const cfg = SUPPORTED_UPLOADS[resolvedType];
  return {
    ok: true,
    type: resolvedType,
    normalizedContentType: cfg.normalizedContentType,
    extension: ext,
  };
}

export function validateObjectKey(objectKey) {
  if (typeof objectKey !== "string" || !objectKey.trim()) {
    return { ok: false, error: "objectKey is required." };
  }

  const normalized = objectKey.trim();
  if (!normalized.startsWith("uploads/")) {
    return { ok: false, error: "Invalid objectKey prefix." };
  }

  if (normalized.length > 1024) {
    return { ok: false, error: "objectKey is too long." };
  }

  return { ok: true, objectKey: normalized };
}

export function validateUploadMeta({ filename, contentType, size, requireSize = false }) {
  if (typeof filename !== "string" || !filename.trim()) {
    return { ok: false, error: "filename is required." };
  }

  const type = detectSupportedUploadType({ filename, contentType });
  if (!type.ok) {
    return { ok: false, error: type.error, errorCode: type.errorCode };
  }

  if (requireSize || size !== undefined) {
    if (
      typeof size !== "number" ||
      !Number.isFinite(size) ||
      size <= 0 ||
      !Number.isInteger(size)
    ) {
      return { ok: false, error: "size must be a positive integer." };
    }

    const maxUploadBytes = parseMaxUploadBytes();
    if (size > maxUploadBytes) {
      return {
        ok: false,
        error: `File exceeds maximum allowed size (${maxUploadBytes} bytes).`,
        errorCode: "file_too_large",
      };
    }
  }

  return {
    ok: true,
    filename: sanitizeFilename(filename),
    contentType: type.normalizedContentType,
    type: type.type,
    size,
    maxUploadBytes: parseMaxUploadBytes(),
  };
}

export function getUploadMaxBytes() {
  return parseMaxUploadBytes();
}
