# Product Discovery Decisions

Last updated: 2026-02-19

This file logs answers from the current backend/pricing discovery thread.
It should be appended as new one-question-at-a-time answers are given.

## Offer Context

- Active build focus: `Report ($69)`
- Draft tier ladder:
  - `Scan ($39)`
  - `Report ($69)`
  - `Protect ($99)`

## Locked Answers So Far

1. Target customer: influencers/models (creator economy focus).
2. Contract intake: flexible contract support; do not hard-gate by type.
3. Report outcome should guide the user to a decision (`Sign`, `Negotiate`, `Do not sign yet`).
4. Speed target: under 5 minutes overall; aspirational near-instant feel.
5. Risk UX: weighted `0-100` score + `Low/Medium/High` label.
6. Findings should include source evidence (clause snippet + location/page/section).
7. Clause breakdown UX: detected clauses first, full checklist behind expand/click.
8. `$69` rewrite style default: lightweight edits (not full replacement by default).
9. Share/re-open access: link + emailed one-time passcode.
10. Report version history: not in v1.
11. Jurisdiction for launch: U.S.-only first, global later.
12. Disclaimer policy: not legal advice; attorney review recommended when risk is high.
13. `$99 Protect` includes deeper rewrites + advanced clause coverage + fallback positions + negotiation plan.
14. Primary early success metric: user-rated usefulness (`% rated 4/5+`).
15. Secondary success metric: reported negotiation improvement.
16. Current pain point: analysis does not feel accurate/robust enough yet.

## Product/Backend Decisions Locked

- Generation flow: show a fast draft first (~10-20s), then deepen in background.
- Fast-draft UX timeout: after 8 seconds, switch to a clear `still working` state while processing continues.
- Intake contract type: optional dropdown + auto-detect.
- Strong attorney-review alert: only for high-risk outputs.
- `$99` upsell triggers:
  - Risk score >= 70, or critical clause detected.
  - User requests stronger rewrites.
  - Advanced-risk clause set detected (indemnity, warranty, assignment, subcontracting, non-solicit/non-compete, nuanced liability, governing law complexity).
  - Auto-trigger when high-severity flags >= 4.
- Tier preview/paywall:
  - Progressive gating across tiers (`$39 -> $69 -> $99`).
  - Pre-generate teaser for higher tiers.
  - Generate full higher-tier content after upgrade.
- File types for v1: PDF + DOCX.
- Security baseline for v1:
  - Encrypt at rest, TLS in transit, expiring signed URLs.
  - Malware scan on upload before processing.
  - Strict tenant isolation.
  - PII-safe logs (no raw contract text in logs).
  - Rate limiting + bot protection.
  - Secrets in managed vault with key rotation.
  - Access/share audit trail.
- Upload/checkout gating:
  - Start malware scan immediately on upload.
  - Keep file quarantined until scan passes.
  - Require both `scan_passed` and `text_extraction_precheck_passed` before checkout.
- Payments (Stripe): capture immediately at checkout (after prechecks).
- Auth model for launch:
  - No account required initially.
  - Flow: guest checkout -> view report -> create account to save/claim report.
  - OTP on reopen: once per device/session, trust for 30 days.
- Creator/model specialized checks: run only when contract appears creator/brand-related.
- Low-confidence handling:
  - Explicit `Unclear wording` tags.
  - Suggest rewrite language.
  - Keep attorney-review prompt for high-risk cases.
- Re-run policy:
  - `$39`: no included re-run (allow upgrade credit to `$69` within 48h).
  - `$69`: 1 re-run within 7 days.
  - `$99`: 3 re-runs within 14 days.
- Data retention:
  - Base retention: auto-delete report/source artifacts after 30 days.
  - Full extracted contract text: keep encrypted for 24h, then hard-delete.
  - Keep findings + minimal snippets under 30-day policy.
  - Re-extract on demand from source file when needed (within retention window).
- Follow-up Q&A:
  - Included for `$69` and `$99` only.
  - Limits: `$69` = 3 questions, `$99` = 10 questions.
- Failure handling:
  - If analysis fails post-payment, auto-refund + apology + retry path.
  - Post-payment processing timeout: 5 minutes, then trigger failure path.
- Age policy at launch: 18+ only.
- Data residency at launch: U.S.-only storage/processing region.
- Self-serve immediate deletion UI: deferred for now (auto-delete policy remains primary in v1).
- Human escalation:
  - Show `Attorney partner review (beta)` waitlist/intake CTA.
- Feedback loop:
  - Per-flag thumbs up/down + "what we missed" free-text capture.

## Ongoing Log Format

Append future answers in this thread as:

- Date:
- Question:
- Answer:
- Decision impact:

## Ongoing Log

- Date: 2026-02-19
- Question: For the fast-draft experience, what hard timeout should we enforce before showing a `still working` state?
- Answer: 8 seconds.
- Decision impact: Improves perceived speed and reduces long spinner frustration; supports async deep-analysis UX.

- Date: 2026-02-19
- Question: What timeout should trigger the post-payment failure path (auto-refund + retry)?
- Answer: 5 minutes.
- Decision impact: Balances customer wait tolerance and operational reliability before guaranteed auto-refund.

- Date: 2026-02-19
- Question: Should we allow minors to use the product at launch?
- Answer: 18+ only at launch.
- Decision impact: Reduces compliance complexity and lowers legal/payment-provider risk in v1.

- Date: 2026-02-19
- Question: Should uploaded files be stored in the same region only (U.S. region lock) for launch?
- Answer: Yes, U.S.-only data residency.
- Decision impact: Keeps infrastructure and compliance scope narrower for the initial launch.

- Date: 2026-02-19
- Question: Should users be able to delete their report/files immediately from the UI before auto-delete?
- Answer: Not a priority right now.
- Decision impact: Keep v1 simple with retention-based deletion; revisit self-serve deletion later.

- Date: 2026-02-19
- Question: Do we have enough answers to begin backend implementation improvements now?
- Answer: Yes, begin building now.
- Decision impact: Shift from discovery mode to implementation mode for reliability/security upgrades.
