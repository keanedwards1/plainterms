import { jsonResponse, optionsResponse } from "./lib/http.mjs";
import { requireUser } from "./lib/auth.mjs";
import { deleteResultAndUpload, getResultItem, listOwnerDocuments, listOwnerSearchRecords } from "./lib/documents.mjs";

const METHODS = "GET,DELETE,OPTIONS";

/**
 * GET /documents?cursor=&limit=  — the signed-in user's documents, newest first.
 * GET /documents/search-index?cursor= — the same documents with their text, for search.
 * DELETE /documents/{id}         — delete one of them (and its uploaded file).
 */
export const handler = async (event) => {
  if (event?.httpMethod === "OPTIONS") return optionsResponse(event, METHODS);
  if (event?.httpMethod !== "GET" && event?.httpMethod !== "DELETE") {
    return jsonResponse(event, 405, { error: "Method not allowed" }, METHODS);
  }

  const auth = await requireUser(event);
  if (!auth.ok) return jsonResponse(event, auth.status, { error: auth.error }, METHODS);
  const { userId } = auth.user;

  try {
    if (event.httpMethod === "GET" && String(event.resource ?? event.path ?? "").endsWith("/search-index")) {
      const query = event.queryStringParameters ?? {};
      const page = await listOwnerSearchRecords(userId, { cursor: query.cursor });
      return jsonResponse(event, 200, page, METHODS);
    }
    if (event.httpMethod === "GET") {
      const query = event.queryStringParameters ?? {};
      const page = await listOwnerDocuments(userId, { cursor: query.cursor, limit: query.limit });
      return jsonResponse(event, 200, page, METHODS);
    }

    const id = event.pathParameters?.id;
    if (!id) return jsonResponse(event, 400, { error: "Missing document id" }, METHODS);
    const item = await getResultItem(id);
    // Same response for "missing" and "not yours", so ids can't be probed.
    if (!item || item.owner_user_id?.S !== userId) {
      return jsonResponse(event, 404, { error: "Document not found" }, METHODS);
    }
    await deleteResultAndUpload(item);
    return jsonResponse(event, 200, { deleted: true }, METHODS);
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "documents.request_failed",
        method: event.httpMethod,
        message: err instanceof Error ? err.message : String(err),
      })
    );
    return jsonResponse(event, 502, { error: "Your documents couldn't be loaded. Please try again." }, METHODS);
  }
};
