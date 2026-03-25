import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { z } from "zod";

const UploadUrlRequest = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const UploadUrlResponse = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const payloadJson = await req.json();
    const payload = UploadUrlRequest.safeParse(payloadJson);
    if (!payload.success) {
      return Response.json(
        { error: "Invalid upload-url request payload.", details: payload.error.flatten() },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${getApiBaseUrl()}/upload-url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
      cache: "no-store",
    });

    if (!upstream.ok) {
      await upstream.text().catch(() => "");
      return Response.json(
        {
          error: "Upstream /upload-url failed.",
          upstreamStatus: upstream.status,
        },
        { status: upstream.status }
      );
    }

    const upstreamJson = await upstream.json();
    const parsed = UploadUrlResponse.safeParse(upstreamJson);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Upstream /upload-url response violated contract.",
          details: parsed.error.flatten(),
        },
        { status: 502 }
      );
    }

    return Response.json(parsed.data);
  } catch {
    return Response.json({ error: "Upload URL request failed." }, { status: 502 });
  }
}
