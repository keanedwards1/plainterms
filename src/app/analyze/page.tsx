/* /src/app/analyze/page.tsx */
"use client";

import React from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type UploadUrlResponse = {
  uploadUrl: string;
  objectKey: string;
};

export default function AnalyzePage() {
  const router = useRouter();

  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!API_BASE_URL) {
      setError("Missing NEXT_PUBLIC_API_BASE_URL in .env.local");
      return;
    }

    if (!file) {
      setError("Please choose a contract file.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Ask backend for a presigned upload URL
      const uploadUrlRes = await fetch(`${API_BASE_URL}/upload-url`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!uploadUrlRes.ok) {
        const text = await uploadUrlRes.text().catch(() => "");
        throw new Error(`Upload URL failed (${uploadUrlRes.status}). ${text}`);
      }

      const uploadJson = (await uploadUrlRes.json()) as UploadUrlResponse;

      if (!uploadJson.uploadUrl || !uploadJson.objectKey) {
        throw new Error("Upload URL response missing uploadUrl/objectKey.");
      }

      // 2) Upload file directly to S3 via presigned URL
      const s3PutRes = await fetch(uploadJson.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!s3PutRes.ok) {
        const text = await s3PutRes.text().catch(() => "");
        throw new Error(`S3 upload failed (${s3PutRes.status}). ${text}`);
      }

      // 3) Call /analyze with only the objectKey (no big payload)
      const analyzeRes = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: uploadJson.objectKey,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!analyzeRes.ok) {
        const text = await analyzeRes.text().catch(() => "");
        throw new Error(`Analyze failed (${analyzeRes.status}). ${text}`);
      }

      const data = (await analyzeRes.json()) as { resultId?: string };

      if (!data.resultId) {
        throw new Error("Analyze succeeded but no resultId was returned.");
      }

      router.push(`/result/${data.resultId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Analyze a contract</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Upload a contract. For now, this is a stub that returns a result ID.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 24 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Contract file (PDF or DOCX)
        </label>

        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Continue"}
          </button>
        </div>

        {error && <p style={{ marginTop: 16, color: "crimson" }}>{error}</p>}
      </form>
    </main>
  );
}
