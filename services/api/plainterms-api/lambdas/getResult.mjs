/* service/api/plainterms-api/hello-world/getResult.mjs */

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({});

function getRetentionDays() {
  const raw = Number(process.env.RESULT_TTL_DAYS ?? "7");
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return Math.floor(raw);
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,OPTIONS",
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

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const id = event?.pathParameters?.id;
  if (!id) {
    return json(400, { error: "Missing result id" });
  }

  const cmd = new GetItemCommand({
    TableName: process.env.RESULTS_TABLE,
    Key: {
      result_id: { S: id },
    },
  });

  const res = await db.send(cmd);

  if (!res.Item) {
    return json(404, { error: "Result not found", status: "not_found" });
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  const expiresAt = Number(res.Item.expires_at?.N ?? "0");
  if (Number.isFinite(expiresAt) && expiresAt > 0 && nowEpoch >= expiresAt) {
    return json(410, {
      status: "expired",
      resultId: id,
      message: "This result is no longer available.",
      retention_days: getRetentionDays(),
    });
  }

  const resultStatus = res.Item.status?.S ?? "complete";

  if (resultStatus === "processing") {
    return json(202, {
      status: "processing",
      resultId: id,
      message: "Analysis is still in progress.",
    });
  }

  if (resultStatus === "expired") {
    return json(410, {
      status: "expired",
      resultId: id,
      message: "This result is no longer available.",
    });
  }

  if (!res.Item.ui_result?.S) {
    return json(202, {
      status: "processing",
      resultId: id,
      message: "Analysis is still in progress.",
    });
  }

  const uiResult = JSON.parse(res.Item.ui_result.S);
  return json(200, uiResult);
};
