"use client";

// Catches errors thrown in the root layout itself. It replaces the entire
// document, so it must render its own <html>/<body> and can't depend on the
// app's global styles — keep it minimal and self-contained.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffef9",
          color: "#1f2b3d",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.9rem", margin: "0 0 0.75rem", lineHeight: 1.2 }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#536378", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            Sorry about that. Please try again, or email{" "}
            <a href="mailto:keanedwards1@gmail.com" style={{ color: "#1f2b3d" }}>
              keanedwards1@gmail.com
            </a>{" "}
            if it keeps happening.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "1px solid #d9654f",
              borderRadius: "999px",
              background: "#f1765d",
              color: "#fff8f2",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
