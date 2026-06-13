import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { randomUUID } from "crypto";

const db = new DynamoDBClient({});
const METHODS = "POST,OPTIONS";

const FEEDBACK_TABLE     = process.env.FEEDBACK_TABLE;
const TESTIMONIALS_TABLE = process.env.TESTIMONIALS_TABLE;
const RESULTS_TABLE      = process.env.RESULTS_TABLE;

// Retain feedback/testimonials for 2 years, then auto-expire via DynamoDB TTL.
const FEEDBACK_TTL_SECONDS = 60 * 60 * 24 * 365 * 2;

// Match C0/C1 control characters except tab (0x09), newline (0x0A) and
// carriage return (0x0D). Built from a string of unicode escapes so no
// literal control characters appear in the source file.
const CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]",
  "g",
);

// Strip control characters to keep stored text clean and free of
// terminal/parser escape sequences, then trim and cap length.
function sanitizeText(value, max) {
  return value.replace(CONTROL_CHARS, "").trim().slice(0, max);
}

async function resultExists(resultId) {
  if (!RESULTS_TABLE) return true; // fail open if misconfigured; don't block feedback
  try {
    const res = await db.send(new GetItemCommand({
      TableName: RESULTS_TABLE,
      Key: { result_id: { S: resultId } },
      ProjectionExpression: "result_id",
    }));
    return Boolean(res.Item);
  } catch {
    return true; // on lookup error, fail open rather than drop genuine feedback
  }
}

export async function handler(event) {
  const guard = methodGuard(event, "POST", METHODS);
  if (guard) return guard;

  const { ok, payload, response } = parseJsonBody(event, METHODS);
  if (!ok) return response;

  const { result_id, rating, testimonial, first_name, last_name } = payload;

  // rating must be 0 (negative) or 1 (positive)
  if (typeof result_id !== "string" || !result_id.trim()) {
    return jsonResponse(event, 400, { error: "result_id required" }, METHODS);
  }
  if (rating !== 0 && rating !== 1) {
    return jsonResponse(event, 400, { error: "rating must be 0 or 1" }, METHODS);
  }

  const resultIdValue = result_id.trim();

  // Reject feedback for result_ids that don't correspond to a real analysis,
  // which blocks fabricated/spam submissions against made-up ids.
  if (!(await resultExists(resultIdValue))) {
    return jsonResponse(event, 404, { error: "result not found" }, METHODS);
  }

  const ts = Math.floor(Date.now() / 1000);
  const expiresAt = ts + FEEDBACK_TTL_SECONDS;

  await db.send(new PutItemCommand({
    TableName: FEEDBACK_TABLE,
    Item: {
      result_id:  { S: resultIdValue },
      ts:         { N: String(ts) },
      rating:     { N: String(rating) },
      expires_at: { N: String(expiresAt) },
    },
  }));

  if (typeof testimonial === "string" && testimonial.trim().length > 0) {
    const text = sanitizeText(testimonial, 1000);
    if (text.length > 0) {
      const item = {
        testimonial_id: { S: randomUUID() },
        result_id:      { S: resultIdValue },
        rating:         { N: String(rating) },
        text:           { S: text },
        ts:             { N: String(ts) },
        expires_at:     { N: String(expiresAt) },
      };

      if (typeof first_name === "string" && first_name.trim().length > 0) {
        const v = sanitizeText(first_name, 60);
        if (v.length > 0) item.first_name = { S: v };
      }
      if (typeof last_name === "string" && last_name.trim().length > 0) {
        const v = sanitizeText(last_name, 60);
        if (v.length > 0) item.last_name = { S: v };
      }

      await db.send(new PutItemCommand({
        TableName: TESTIMONIALS_TABLE,
        Item: item,
      }));
    }
  }

  return jsonResponse(event, 200, { ok: true }, METHODS);
}
