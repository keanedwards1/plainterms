import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const defaultDb = new DynamoDBClient({});

/**
 * Read-modify-write of a result's ui_result, safe when several workers write
 * the same result (the review extras, the classic AI text and the revised
 * draft). Each write bumps `ui_version` and only succeeds if nobody else wrote
 * in between; on a clash it re-reads and tries again.
 *
 * `mutate(uiResult, item)` returns the new ui_result, or null to leave it alone.
 * `extra(nextUi)` may return { set: ["attr = :v"], values: { ":v": {...} } } for
 * other attributes written in the same update.
 */
export async function updateUiResult(resultId, mutate, { db = defaultDb, extra, attempts = 3 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const res = await db.send(
      new GetItemCommand({ TableName: process.env.RESULTS_TABLE, Key: { result_id: { S: resultId } }, ConsistentRead: true })
    );
    const item = res?.Item;
    if (!item) return { ok: false, reason: "not_found" };
    let current;
    try {
      current = JSON.parse(item.ui_result?.S ?? "");
    } catch {
      return { ok: false, reason: "invalid_ui_result" };
    }
    const next = await mutate(current, item);
    if (!next) return { ok: true, reason: "unchanged", uiResult: current };

    const version = Number(item.ui_version?.N ?? 0);
    const more = extra ? extra(next) : null;
    try {
      await db.send(
        new UpdateItemCommand({
          TableName: process.env.RESULTS_TABLE,
          Key: { result_id: { S: resultId } },
          UpdateExpression: ["SET ui_result = :ui", "ui_version = :next", ...(more?.set ?? [])].join(", "),
          ConditionExpression: version === 0 ? "attribute_not_exists(ui_version) OR ui_version = :cur" : "ui_version = :cur",
          ExpressionAttributeValues: {
            ":ui": { S: JSON.stringify(next) },
            ":next": { N: String(version + 1) },
            ":cur": { N: String(version) },
            ...(more?.values ?? {}),
          },
        })
      );
      return { ok: true, reason: "updated", uiResult: next };
    } catch (err) {
      if (err?.name !== "ConditionalCheckFailedException" || attempt === attempts) throw err;
    }
  }
  return { ok: false, reason: "conflict" };
}
