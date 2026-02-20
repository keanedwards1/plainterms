import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { z } from "zod";

const PrecheckRequest = z.object({
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

const PrecheckResponse = z.object({
  precheckPassed: z.boolean(),
  precheckToken: z.string().min(1),
  expiresInSec: z.number().int().positive().optional(),
  checks: z
    .object({
      fileType: z.enum(["passed", "failed", "not_run"]).optional(),
      fileSize: z.enum(["passed", "failed", "not_run"]).optional(),
      malwareScan: z.enum(["passed", "failed", "not_run"]).optional(),
      textExtractionPrecheck: z.enum(["passed", "failed", "not_run"]).optional(),
    })
    .optional(),
  extraction: z
    .object({
      detectedType: z.string().min(1),
      wordCount: z.number().int().nonnegative(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const payloadJson = await req.json();
    const payload = PrecheckRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        { error: "Invalid precheck payload.", details: payload.error.flatten() },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}/precheck`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        {
          error: "Upstream /precheck failed.",
          upstreamStatus: upstream.status,
          detail: detail || upstream.statusText,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = PrecheckResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Upstream /precheck response violated contract.",
          details: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    if (!parsed.data.precheckPassed) {
      return Response.json({ error: "Precheck did not pass." }, { status: 409 });
    }

    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Precheck request failed: ${message}` }, { status: 502 });
  }
}
