import { describe, expect, it } from "vitest";
import { acceptAll, diffWords } from "@/lib/wordDiff";
import { splitTerms } from "@/lib/glossary";
import { findLoose, formatContractText, paragraphs } from "@/lib/contractText";
import { blockParts, locateRedlines, redlineBlocks } from "@/lib/redline";
import { negotiationEmail } from "@/lib/reviewSend";
import type { PtReview, PtReviewIssue } from "@/lib/plainterms-schema";

const CONTRACT =
  "PRODUCTION SERVICES AGREEMENT This Agreement is between Harbor Media Inc. (“Client”) and Luna Park Studio (“Vendor”). " +
  "1. Scope of Services Vendor will perform services. If any exhibit is unavailable at signing, Vendor will still perform services requested by Client. " +
  "2. Fees and Payment Client pays 30% deposit and remainder within Net 60 days after invoice.";

function issue(id: string, overrides: Partial<PtReviewIssue> = {}): PtReviewIssue {
  return {
    id,
    severity: "high",
    priority: "must",
    section_ref: "1",
    title: "Title",
    quote: "x",
    why: "",
    why_short: "",
    usual: "",
    ask_short: "",
    ask_email_line: `Ask ${id}.`,
    fallback: "",
    walk_away_if: "",
    they_say: "",
    you_say: "",
    redline: null,
    ...overrides,
  };
}

describe("diffWords", () => {
  it("keeps unchanged words and marks removed and added ones", () => {
    const parts = diffWords("remainder within Net 60 days after invoice", "remainder within Net 30 days after invoice receipt");
    expect(parts.filter((p) => p.type === "del").map((p) => p.text.trim())).toEqual(["60"]);
    expect(parts.filter((p) => p.type === "ins").map((p) => p.text.trim())).toEqual(["30", "receipt"]);
    expect(acceptAll(parts)).toBe("remainder within Net 30 days after invoice receipt");
  });

  it("returns the text unchanged when nothing differs", () => {
    expect(diffWords("same text", "same text")).toEqual([{ type: "eq", text: "same text" }]);
  });
});

describe("splitTerms", () => {
  it("finds every legal term, longest match first", () => {
    const terms = splitTerms("Any dispute goes to mediation, then binding arbitration. Mediation again.").filter((s) => typeof s !== "string");
    expect(terms.map((t) => (typeof t === "string" ? t : t.term))).toEqual(["mediation", "binding arbitration", "Mediation"]);
  });
});

describe("contract text", () => {
  it("puts numbered sections on their own paragraphs", () => {
    const text = formatContractText(CONTRACT);
    expect(paragraphs(text).map((p) => p.text.slice(0, 12))).toEqual(["PRODUCTION S", "1. Scope of ", "2. Fees and "]);
  });

  it("finds quotes despite straight quotes and spacing", () => {
    const range = findLoose(CONTRACT, 'Harbor Media Inc. ("Client")  and Luna Park');
    expect(range && CONTRACT.slice(range.start, range.end)).toBe("Harbor Media Inc. (“Client”) and Luna Park");
  });
});

describe("redline", () => {
  const text = formatContractText(CONTRACT);
  const scope = issue("i1", {
    redline: {
      before: "If any exhibit is unavailable at signing, Vendor will still perform services requested by Client.",
      after: "Vendor only performs services described in a signed SOW.",
    },
  });
  const blocks = redlineBlocks(text, locateRedlines(text, [scope]));

  it("places each change in its paragraph", () => {
    expect(blocks.map((b) => b.items.length)).toEqual([0, 1, 0]);
  });

  it("applies only the changes that are ticked, with the user's own wording when edited", () => {
    const on = acceptAll(blockParts(blocks[1], new Set(["i1"]), {}));
    expect(on).toContain("Vendor only performs services described in a signed SOW.");
    expect(on).not.toContain("unavailable at signing");

    const off = acceptAll(blockParts(blocks[1], new Set(), {}));
    expect(off).toBe(blocks[1].paragraph.text);

    const edited = acceptAll(blockParts(blocks[1], new Set(["i1"]), { i1: "My own wording." }));
    expect(edited).toContain("My own wording.");
  });
});

describe("negotiation email", () => {
  const review = { perspective: { other_short: "Harbor", other_party: "Harbor Media Inc." } } as PtReview;

  it("lists the picked asks and mentions the attachment only when sending both", () => {
    const both = negotiationEmail(review, [issue("i1"), issue("i2")], "both");
    expect(both.body).toContain("I'd like to agree 2 changes");
    expect(both.body).toContain("1. Ask i1.\n\n2. Ask i2.");
    expect(both.body).toContain("attached the agreement");
    expect(negotiationEmail(review, [issue("i1")], "email").body).not.toContain("attached");
    expect(negotiationEmail(review, [issue("i1")], "email").body).toContain("one change");
  });
});
