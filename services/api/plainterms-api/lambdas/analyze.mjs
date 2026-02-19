/* /services/api/plainterms-api/hello-world/analyze.mjs */

import { runAnalysis } from "./lib/runAnalysis.mjs";
import { parseAnalysisSelection } from "./lib/analysisSelection.mjs";

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

  try {
    const selectionCheck = parseAnalysisSelection(payload);
    if (!selectionCheck.ok) {
      return json(400, { error: selectionCheck.error });
    }

    const { resultId } = await runAnalysis(payload, selectionCheck.selection);
    return json(200, { resultId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(400, { error: `Analyze failed: ${message}` });
  }
};
