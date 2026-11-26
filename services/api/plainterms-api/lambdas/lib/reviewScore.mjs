/**
 * Risk score for a review.v1, derived only from its issues so the scale on the
 * page can never disagree with the issues listed under it.
 *
 * Points: 14 per high, 6 per medium, 2 per low, plus 5. Any high issue puts the
 * score at least into the medium band, and "do not sign yet" into the high band.
 */
const POINTS = { high: 14, medium: 6, low: 2 };

export function reviewRiskLabel(score) {
  if (score < 30) return "low";
  if (score < 60) return "medium";
  return "high";
}

export function reviewRiskScore(issues = [], action = "negotiate") {
  const list = Array.isArray(issues) ? issues : [];
  let score = 5;
  let highs = 0;
  for (const issue of list) {
    const sev = issue?.severity;
    if (sev === "high") highs += 1;
    score += POINTS[sev] ?? 0;
  }
  if (highs > 0) score = Math.max(score, 35);
  if (action === "do_not_sign_yet") score = Math.max(score, 60);
  score = Math.min(95, Math.max(5, Math.round(score)));
  return { score, label: reviewRiskLabel(score) };
}
