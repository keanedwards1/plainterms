import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTextFromPdf } from "../../lib/extractDocumentText.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, "..", "fixtures", "multi-font-subset-contract.pdf");

// Regression: a PDF that embeds multiple subset fonts (DejaVuSerif-Bold for
// headings, DejaVuSerif for body) each carries its OWN ToUnicode CMap. Glyph
// code <0002> maps to different characters per font, so the CMaps must be
// applied per-font. Merging them globally garbled the headings into tokens like
// "udanob,JtJwJPoic" (an "Article 1 — Scope of Work" heading mis-decoded).
test("multi-font subset PDF extracts headings and body without garbled glyphs", () => {
  const buffer = fs.readFileSync(fixture);
  const text = extractTextFromPdf(buffer);

  // Heading font decodes correctly.
  assert.match(text, /Construction Agreement/);
  assert.match(text, /Article 1 — Scope of Work/);
  assert.match(text, /Article 9 — Indemnification/);

  // Body font decodes correctly.
  assert.match(text, /Pinnacle Home Contracting/);
  assert.match(text, /\$187,400/);

  // None of the known garble signatures from cross-font CMap collisions.
  assert.doesNotMatch(text, /udanob/);
  assert.doesNotMatch(text, /\bJ[a-z]J\b/);
});
