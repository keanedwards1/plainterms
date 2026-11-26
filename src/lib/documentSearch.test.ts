import { describe, expect, it } from "vitest";
import { buildIndex, highlight, parseQuery, processTerm, searchDocuments, type SearchRecord } from "@/lib/documentSearch";

function record(id: string, overrides: Partial<SearchRecord>): SearchRecord {
  return {
    id,
    createdAt: "2026-11-01T00:00:00Z",
    fileName: `${id}.docx`,
    status: "complete",
    riskScore: 40,
    riskLabel: "medium",
    recommendationAction: "negotiate",
    recommendationLabel: "Negotiate",
    flagCount: 2,
    expiresAt: null,
    parties: [],
    verdict: "Negotiate before you sign",
    issues: [],
    deal: [],
    gaps: [],
    text: "",
    ...overrides,
  };
}

const RECORDS = [
  record("harbor", {
    fileName: "attachment Heavy 3.docx",
    parties: ["Harbor Media Inc.", "Luna Park Studio"],
    issues: [{ title: "Harbor can cancel without paying", why: "No pay for finished work if Harbor terminates for convenience." }],
    text: "PRODUCTION SERVICES AGREEMENT Date: March 4, 2026 This Agreement is between Harbor Media Inc. and Luna Park Studio. Client pays 30% deposit and remainder within Net 60 days after invoice. Any dispute first goes to mediation, then binding arbitration in Seattle.",
  }),
  record("lease", {
    createdAt: "2026-06-01T00:00:00Z",
    fileName: "Maple lease.pdf",
    parties: ["Maple Street Holdings LLC", "Priya Shah"],
    text: "RESIDENTIAL LEASE Maple Street Holdings LLC (the Landlord) and Priya Shah (the Tenant) agree. The security deposit is $2,000. Pets are not allowed. The tenant pays utilities.",
  }),
  record("nda", {
    fileName: "Acme NDA.pdf",
    parties: ["Acme Robotics, Inc.", "Jordan Lee"],
    text: "MUTUAL NONDISCLOSURE AGREEMENT between Acme Robotics, Inc. and Jordan Lee. Confidential information stays private for three years. Payment terms do not apply.",
  }),
];
const index = buildIndex(RECORDS);
const ids = (q: string) => searchDocuments(index, q, { now: Date.parse("2026-11-26") }).hits.map((h) => h.record.id);

describe("document search", () => {
  it("matches each word as you type it, and every word must match", () => {
    expect(ids("harb")).toEqual(["harbor"]);
    expect(ids("arbitr seattle")).toEqual(["harbor"]);
    expect(ids("deposit")).toEqual(expect.arrayContaining(["harbor", "lease"]));
    expect(ids("deposit pets")).toEqual(["lease"]);
  });

  it("forgives a typo in longer words and folds plurals", () => {
    expect(ids("arbitation")).toEqual(["harbor"]);
    expect(ids("parties")).toEqual([]); // nothing mentions a party
    expect(ids("pet")).toEqual(["lease"]);
  });

  it("ranks a title or party match above a passing mention in the text", () => {
    const hits = ids("agreement");
    expect(hits[0]).not.toBe("lease");
    expect(ids("acme")[0]).toBe("nda");
  });

  it("requires quoted phrases to appear as written", () => {
    expect(ids('"security deposit"')).toEqual(["lease"]);
    expect(ids('"deposit security"')).toEqual([]);
  });

  it("falls back to partial matches and suggests a spelling when nothing matches every word", () => {
    const outcome = searchDocuments(index, "mediation tenant");
    expect(outcome.partial).toBe(true);
    expect(outcome.hits.map((h) => h.record.id)).toEqual(expect.arrayContaining(["harbor", "lease"]));
    expect(searchDocuments(index, "arbitrashun").suggestion).toBeTruthy();
  });

  it("shows where it matched, with the words highlighted", () => {
    const [hit] = searchDocuments(index, "net 60").hits;
    expect(hit.where).toBe("contract");
    const marked = hit.snippet.filter((s) => s.hit).map((s) => s.text.toLowerCase());
    expect(marked).toEqual(expect.arrayContaining(["net", "60"]));
    expect(highlight("Harbor Media", ["harbor"])).toEqual([
      { text: "Harbor", hit: true },
      { text: " Media", hit: false },
    ]);
  });

  it("ignores single letters and filler words, and never builds a junk suggestion", () => {
    const outcome = searchDocuments(index, "a s e");
    expect(outcome.hits).toEqual([]);
    expect(outcome.suggestion).toBeNull();
    expect(ids("the arbitration")).toEqual(["harbor"]);
    expect(searchDocuments(index, "arbitrashun").suggestion).toBe("arbitration");
  });

  it("normalizes words and queries", () => {
    expect(processTerm("Harbor's")).toBe("harbor");
    expect(processTerm("Parties,")).toBe("party");
    expect(processTerm("Café")).toBe("cafe");
    expect(parseQuery('net "binding arbitration"')).toEqual({ words: "net  binding arbitration", phrases: ["binding arbitration"] });
  });
});
