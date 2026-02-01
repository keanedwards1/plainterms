/* /src/app/result/[id]/page.tsx */

import { PtResult, SECTION_TITLES } from "@/lib/plainterms-schema";

type Props = {
  params: { id: string };
};

export default async function ResultPage({ params }: Props) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }

  const res = await fetch(`${baseUrl}/result/${params.id}`, {
    // You can adjust caching later; keep it simple and predictable for now.
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Result not available</h1>
        <p>We couldn’t load this analysis right now.</p>
      </main>
    );
  }

  const json = await res.json();
  const parsed = PtResult.safeParse(json);

  if (!parsed.success) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Result format error</h1>
        <p>The server returned an unexpected format.</p>
      </main>
    );
  }

  const data = parsed.data;

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: "0 auto" }}>
      <h1>{data.headline}</h1>
      <p>{data.overview}</p>

      {data.gentle_notice && (
        <p style={{ marginTop: 12, opacity: 0.85 }}>{data.gentle_notice}</p>
      )}

      <div style={{ marginTop: 28, display: "grid", gap: 22 }}>
        {data.sections.map((section) => (
          <section key={section.key}>
            <h2 style={{ marginBottom: 8 }}>{SECTION_TITLES[section.key]}</h2>
            <p>{section.body}</p>

            {section.soft_note && (
              <p style={{ marginTop: 10, opacity: 0.85 }}>
                {section.soft_note}
              </p>
            )}

            {section.quotes?.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {section.quotes.map((q, idx) => (
                  <blockquote
                    key={`${section.key}-q-${idx}`}
                    style={{
                      margin: 0,
                      padding: "10px 12px",
                      borderLeft: "3px solid rgba(0,0,0,0.2)",
                      opacity: 0.95,
                    }}
                  >
                    {q}
                  </blockquote>
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <hr style={{ margin: "32px 0" }} />

      <p style={{ opacity: 0.8 }}>{data.notices.not_legal_advice}</p>
    </main>
  );
}
