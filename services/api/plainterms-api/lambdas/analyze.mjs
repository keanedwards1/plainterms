/* /services/api/plainterms-api/hello-world/analyze.mjs */

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({});

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST,OPTIONS",
  };
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}

function makeResultId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `demo_${Date.now()}_${rand}`;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const resultId = makeResultId();
  const createdAt = new Date().toISOString();

  // Stub UI result (pt.ui.v1)
  const uiResult = {
    schema_version: "pt.ui.v1",
    result_id: resultId,
    created_at: createdAt,
    headline: "Summary",
    overview:
      "This agreement describes a contractor providing services to a company in exchange for payment, with standard terms around confidentiality, ownership of work, and how the relationship ends.",
    sections: [],
    notices: {
      not_legal_advice:
        "This summary is for informational purposes only and is not legal advice.",
    },
  };

  const cmd = new PutItemCommand({
    TableName: process.env.RESULTS_TABLE,
    Item: {
      result_id: { S: resultId },
      created_at: { S: createdAt },
      object_key: { S: payload.objectKey ?? "" },
      status: { S: "complete" },
      ui_result: { S: JSON.stringify(uiResult) },
    },
  });

  await db.send(cmd);

  return json(200, { resultId });
};
