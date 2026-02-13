type LogLevel = "info" | "warn" | "error";

type BaseFields = {
  route: string;
  requestId: string;
  method: string;
};

type ErrorLogFields = BaseFields & {
  stage: string;
  status?: number;
  upstreamStatus?: number;
  message: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function getRequestId(req: Request): string {
  return (
    req.headers.get("x-request-id") ||
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-vercel-id") ||
    crypto.randomUUID()
  );
}

function writeLog(level: LogLevel, event: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: nowIso(),
    level,
    event,
    ...fields,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function getLogContext(req: Request, route: string): BaseFields {
  return {
    route,
    requestId: getRequestId(req),
    method: req.method,
  };
}

async function sendAlert(payload: Record<string, unknown>) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      writeLog("warn", "alert.delivery_failed", {
        status: res.status,
        statusText: res.statusText,
      });
    }
  } catch (err) {
    writeLog("warn", "alert.delivery_error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function logApiError(fields: ErrorLogFields) {
  writeLog("error", "api.error", fields);

  const shouldAlert =
    fields.status === undefined ||
    fields.status >= 500 ||
    (fields.upstreamStatus !== undefined && fields.upstreamStatus >= 500);

  if (!shouldAlert) return;

  await sendAlert({
    source: "plainterms-next-api",
    type: "api_error",
    ...fields,
    ts: nowIso(),
  });
}

