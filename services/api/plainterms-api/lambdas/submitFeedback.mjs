import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { jsonResponse, methodGuard, parseJsonBody } from "./lib/http.mjs";
import { randomUUID } from "crypto";

const db = new DynamoDBClient({});
const METHODS = "POST,OPTIONS";

const FEEDBACK_TABLE     = process.env.FEEDBACK_TABLE;
const TESTIMONIALS_TABLE = process.env.TESTIMONIALS_TABLE;

export async function handler(event) {
  const guard = methodGuard(event, "POST", METHODS);
  if (guard) return guard;

  const { ok, payload, response } = parseJsonBody(event, METHODS);
  if (!ok) return response;

  const { result_id, rating, testimonial } = payload;

  // rating must be 0 (negative) or 1 (positive)
  if (typeof result_id !== "string" || !result_id.trim()) {
    return jsonResponse(event, 400, { error: "result_id required" }, METHODS);
  }
  if (rating !== 0 && rating !== 1) {
    return jsonResponse(event, 400, { error: "rating must be 0 or 1" }, METHODS);
  }

  const ts = Math.floor(Date.now() / 1000);

  await db.send(new PutItemCommand({
    TableName: FEEDBACK_TABLE,
    Item: {
      result_id: { S: result_id },
      ts:        { N: String(ts) },
      rating:    { N: String(rating) },
    },
  }));

  if (typeof testimonial === "string" && testimonial.trim().length > 0) {
    const text = testimonial.trim().slice(0, 1000);
    await db.send(new PutItemCommand({
      TableName: TESTIMONIALS_TABLE,
      Item: {
        testimonial_id: { S: randomUUID() },
        result_id:      { S: result_id },
        rating:         { N: String(rating) },
        text:           { S: text },
        ts:             { N: String(ts) },
      },
    }));
  }

  return jsonResponse(event, 200, { ok: true }, METHODS);
}
