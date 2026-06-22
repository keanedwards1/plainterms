#!/usr/bin/env node
/**
 * Local-only feedback & testimonial dashboard.
 *
 * Runs on your machine using your AWS CLI credentials and serves a private
 * dashboard at http://localhost:4545. Nothing is exposed publicly.
 *
 *   node scripts/feedback-dashboard.mjs            (defaults below)
 *   PORT=5000 REGION=us-west-2 node scripts/feedback-dashboard.mjs
 */

import http from "node:http";
import { execFileSync } from "node:child_process";

const PORT = Number(process.env.PORT ?? 4545);
const REGION = process.env.REGION ?? "us-west-2";
const TABLE = process.env.FEEDBACK_TABLE ?? "PlainTermsFeedback";

function scanFeedback() {
  const out = execFileSync(
    "aws",
    ["dynamodb", "scan", "--region", REGION, "--table-name", TABLE, "--output", "json"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );
  const parsed = JSON.parse(out);
  return (parsed.Items ?? []).map((i) => ({
    resultId: i.result_id?.S ?? "",
    ts: Number(i.ts?.N ?? 0),
    rating: i.rating?.N === "1" ? 1 : i.rating?.N === "0" ? 0 : null,
    testimonial: (i.testimonial?.S ?? "").trim(),
    firstName: (i.first_name?.S ?? "").trim(),
    lastName: (i.last_name?.S ?? "").trim(),
  }));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function render(rows) {
  const sorted = [...rows].sort((a, b) => b.ts - a.ts);
  const total = rows.length;
  const good = rows.filter((r) => r.rating === 1).length;
  const bad = rows.filter((r) => r.rating === 0).length;
  const uniqueUsers = new Set(rows.map((r) => r.resultId)).size;
  const testimonials = sorted.filter((r) => r.testimonial);
  const positivePct = total ? Math.round((good / total) * 100) : 0;

  const card = (label, value, sub = "") =>
    `<div class="card"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ""}</div>`;

  const testimonialCards = testimonials.length
    ? testimonials.map((t) => {
        const name = `${t.firstName} ${t.lastName}`.trim();
        return `<div class="quote">
          <p class="qtext">${esc(t.testimonial)}</p>
          <p class="qmeta">${name ? esc(name) + " · " : ""}${fmtDate(t.ts)} · ${t.rating === 1 ? "👍" : t.rating === 0 ? "👎" : ""}</p>
        </div>`;
      }).join("")
    : `<p class="empty">No written testimonials yet — people are rating but not leaving a quote.</p>`;

  const feedRows = sorted.map((r) => `<tr>
      <td>${fmtDate(r.ts)}</td>
      <td>${r.rating === 1 ? "👍 Good" : r.rating === 0 ? "👎 Bad" : "—"}</td>
      <td class="muted mono">${esc(r.resultId)}</td>
      <td>${r.testimonial ? "✍️" : ""}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>PlainTerms — Feedback</title>
  <meta http-equiv="refresh" content="60">
  <style>
    :root { --ink:#1f2b3d; --muted:#64748b; --border:#e6e2da; --accent:#f1765d; --bg:#faf8f4; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:var(--bg); color:var(--ink); }
    .wrap { max-width:1000px; margin:0 auto; padding:32px 20px 64px; }
    h1 { font-size:24px; margin:0 0 4px; }
    .stamp { color:var(--muted); font-size:13px; margin-bottom:24px; }
    .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:32px; }
    .card { background:#fff; border:1px solid var(--border); border-radius:12px; padding:16px; }
    .card .label { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
    .card .value { font-size:30px; font-weight:700; margin-top:6px; }
    .card .sub { font-size:12px; color:var(--muted); margin-top:2px; }
    h2 { font-size:16px; margin:28px 0 12px; }
    .quote { background:#fff; border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:10px; padding:14px 16px; margin-bottom:10px; }
    .qtext { margin:0; font-size:16px; line-height:1.5; }
    .qmeta { margin:8px 0 0; font-size:12px; color:var(--muted); }
    .empty { color:var(--muted); font-size:14px; background:#fff; border:1px dashed var(--border); border-radius:10px; padding:16px; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--border); border-radius:12px; overflow:hidden; font-size:13px; }
    th,td { text-align:left; padding:9px 12px; border-bottom:1px solid var(--border); }
    th { background:#f4f1ec; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
    tr:last-child td { border-bottom:none; }
    .muted { color:var(--muted); }
    .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; }
  </style></head>
  <body><div class="wrap">
    <h1>PlainTerms — Feedback</h1>
    <div class="stamp">${TABLE} · ${REGION} · refreshed ${new Date().toLocaleString("en-US")} · auto-refreshes every 60s</div>
    <div class="cards">
      ${card("Total ratings", total)}
      ${card("Positive", `${positivePct}%`, `${good} 👍 · ${bad} 👎`)}
      ${card("Unique users", uniqueUsers, "by result")}
      ${card("Testimonials", testimonials.length)}
    </div>
    <h2>Testimonials</h2>
    ${testimonialCards}
    <h2>All feedback (${total})</h2>
    <table>
      <thead><tr><th>When</th><th>Rating</th><th>Result ID</th><th>Quote</th></tr></thead>
      <tbody>${feedRows}</tbody>
    </table>
  </div></body></html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204).end(); return; }
  try {
    const rows = scanFeedback();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(render(rows));
  } catch (err) {
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(`<pre>Failed to load feedback.\n\n${esc(err.message)}\n\nCheck your AWS CLI credentials and that the table "${esc(TABLE)}" exists in ${esc(REGION)}.</pre>`);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Feedback dashboard → http://localhost:${PORT}\n  (local only · Ctrl+C to stop)\n`);
});
