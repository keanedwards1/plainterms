import test from "node:test";
import assert from "node:assert/strict";

import { logLlmUsage } from "../../lib/llmUsage.mjs";
import { promoteUiResultToPro } from "../../lib/runAnalysis.mjs";

test("logs one usage line per call, with reasoning tokens apart", () => {
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(line);
  try {
    logLlmUsage("review.core", "gpt-5-mini", {
      model: "gpt-5-mini-2025",
      usage: { prompt_tokens: 1200, completion_tokens: 900, prompt_tokens_details: { cached_tokens: 200 }, completion_tokens_details: { reasoning_tokens: 600 } },
    });
    logLlmUsage("review.core", "gpt-5-mini", {}); // no usage, no line
  } finally {
    console.log = original;
  }
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), {
    event: "llm.usage",
    call: "review.core",
    model: "gpt-5-mini-2025",
    input_tokens: 1200,
    cached_input_tokens: 200,
    output_tokens: 900,
    reasoning_tokens: 600,
  });
});

test("upgrading to Pro never starts a revised draft for a document with a review", () => {
  const base = { report: {}, document: { revision: { status: "locked" } } };
  const withReview = promoteUiResultToPro({ ...base, review: { schema_version: "review.v1" } }, null);
  assert.equal(withReview.document.revision.status, "locked");
});
