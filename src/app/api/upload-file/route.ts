export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const uploadUrl = formData.get("uploadUrl");
    const file = formData.get("file");

    if (typeof uploadUrl !== "string" || !uploadUrl) {
      return Response.json({ error: "Missing uploadUrl." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file." }, { status: 400 });
    }

    const upstream = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    });

    const text = await upstream.text().catch(() => "");
    if (!upstream.ok) {
      return Response.json(
        {
          error: `S3 upload failed (${upstream.status})${text ? `: ${text}` : ""}`,
        },
        { status: upstream.status }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Upload failed: ${message}` }, { status: 502 });
  }
}
