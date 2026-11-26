/**
 * Switching which side of the contract the review is written for.
 *
 * The page offers "Switch side". Switching back to a side already reviewed is
 * instant (the previous review and revised draft are kept as *_alt); a new side
 * needs a fresh review, which the GenerateReview worker writes.
 */

function sameParty(a, b) {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

/** Parties the user may pick: the ones the review found in the contract. */
export function reviewParties(review) {
  const p = review?.perspective ?? {};
  const names = [
    ...(Array.isArray(p.parties) ? p.parties.map((x) => x?.name) : []),
    p.party,
    p.other_party,
  ].filter((n) => typeof n === "string" && n.trim());
  return [...new Map(names.map((n) => [n.trim().toLowerCase(), n.trim()])).values()];
}

/**
 * Decides what a switch request does.
 * Returns { kind: "invalid" | "noop" | "swapped" | "generate", uiResult }.
 */
export function planSideSwitch(uiResult, party) {
  const review = uiResult?.review;
  if (!review || typeof party !== "string" || !party.trim()) return { kind: "invalid", uiResult };
  const target = reviewParties(review).find((n) => sameParty(n, party));
  if (!target) return { kind: "invalid", uiResult };
  if (sameParty(review.perspective?.party, target)) return { kind: "noop", uiResult };

  const alt = uiResult.review_alt;
  if (alt && sameParty(alt.perspective?.party, target)) {
    const document = uiResult.document ?? {};
    const swappedDocument = { ...document };
    if (document.revision_alt) {
      swappedDocument.revision = document.revision_alt;
      swappedDocument.revision_alt = document.revision;
    }
    return {
      kind: "swapped",
      uiResult: {
        ...uiResult,
        review: alt,
        review_alt: review,
        review_status: { state: "ready", party: target },
        document: swappedDocument,
      },
    };
  }

  return {
    kind: "generate",
    party: target,
    uiResult: { ...uiResult, review_status: { state: "processing", party: target } },
  };
}

/** Stores a freshly generated review for a new side, keeping the old one to switch back to. */
export function applyNewSideReview(uiResult, newReview, { revision } = {}) {
  const document = uiResult?.document ?? {};
  return {
    ...uiResult,
    review: newReview,
    review_alt: uiResult?.review,
    review_status: { state: "ready", party: newReview.perspective.party },
    document: {
      ...document,
      ...(document.revision ? { revision_alt: document.revision } : {}),
      ...(revision ? { revision } : {}),
    },
  };
}
