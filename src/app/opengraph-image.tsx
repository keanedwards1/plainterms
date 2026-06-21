import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PlainTerms — plain-English contract analysis for creators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#1f2b3d",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "Fraunces",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background blobs */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "#f1765d",
            opacity: 0.12,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: 60,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "#24b4ae",
            opacity: 0.1,
          }}
        />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#f1765d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 2,
                border: "3px solid #fff8f2",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                padding: 3,
              }}
            >
              <div style={{ height: 2, background: "#fff8f2", borderRadius: 1 }} />
              <div style={{ height: 2, background: "#fff8f2", borderRadius: 1, width: "70%" }} />
              <div style={{ height: 2, background: "#fff8f2", borderRadius: 1 }} />
            </div>
          </div>
          <span style={{ fontSize: 32, color: "#ffffff", fontWeight: 600, letterSpacing: -0.5 }}>
            PlainTerms
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: -1.5,
              fontFamily: "Georgia, serif",
            }}
          >
            Know what you're signing.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#8fa3b8",
              lineHeight: 1.4,
              fontFamily: "sans-serif",
              fontWeight: 400,
            }}
          >
            Plain-English renovation contract review for homeowners — liens,
            deposits, change orders, and what to negotiate.
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {["Core $29", "Report $79", "Protect $149"].map((t) => (
              <div
                key={t}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 100,
                  padding: "8px 18px",
                  fontSize: 18,
                  color: "#c8d6e2",
                  fontFamily: "sans-serif",
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 20, color: "#536378", fontFamily: "sans-serif" }}>
            plainterms.us
          </div>
        </div>
      </div>
    ),
    size
  );
}
