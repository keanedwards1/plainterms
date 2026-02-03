// /src/lib/parsePlainTermsResult.ts

import { PtResult } from "./plainterms-schema";

export function parsePlainTermsResult(raw: unknown) {
  const parsed = PtResult.safeParse(raw);

  if (!parsed.success) {
    console.error("PlainTerms schema violation:", parsed.error.format());
    throw new Error("Model output did not match PlainTerms schema");
  }

  return parsed.data;
}
