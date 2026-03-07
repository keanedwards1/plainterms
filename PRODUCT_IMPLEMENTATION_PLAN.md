# Product Implementation Plan

Last updated: 2026-03-06

## Goal

Implement the next product iteration with:

1. Better "healthy contract" result UX (no empty-feeling summary/red-flag tabs).
2. Two paid add-on upgrades in the result dashboard:
   - Rewrite Contract
   - Create Update Email
3. Reliability and quality improvements already identified in prior roadmap notes.

## New Add-Ons (Requested)

### Add-On A: Rewrite Contract

- User intent: Generate stronger fallback language and cleaner clause wording.
- Placement: Result dashboard, visible CTA button.
- Commerce behavior:
  - If not purchased: show upgrade flow.
  - If purchased: generate and display rewrite output.
- Draft output requirements:
  - Keep original intent intact.
  - Mark changed clauses clearly.
  - Include rationale for each change.

### Add-On B: Create Update Email

- User intent: Instantly produce a paste-ready email proposing requested edits.
- Placement: Result dashboard, visible CTA button.
- Commerce behavior:
  - If not purchased: show upgrade flow.
  - If purchased: generate email draft.
- Draft output requirements:
  - Professional and concise tone.
  - Pull top negotiation points directly from current result.
  - Include subject line and body.

## UX Adjustment: "Good Contract" States

Issue: When risk is low and flags are minimal/none, Summary and Red Flags feel empty.

Implementation requirements:

- Replace blank/weak empty states with positive, reassuring messaging.
- Add visual treatment (icon card/graphic) indicating strong contract health.
- Preserve transparency: still explain this is an automated informational review.

## Engineering Plan

### Phase 1 (Immediate)

- Add result-dashboard UI buttons for:
  - Rewrite Contract (Upgrade)
  - Create Update Email (Upgrade)
- Improve Summary and Red Flags empty states with positive language and graphics.
- Keep behavior safe by showing "coming soon" notice until upgrade backend is wired.

### Phase 2 (Checkout + Entitlements)

- Add add-on selection into checkout metadata.
- Define add-on SKUs/price IDs in backend config.
- Persist purchased add-ons on result record.
- Gate features by entitlement on result page load.

### Phase 3 (Generation APIs)

- Add backend generation paths:
  - `rewrite_contract`
  - `draft_update_email`
- Reuse existing extracted text + report flags as context.
- Return structured payloads with source mapping and confidence notes.

### Phase 4 (Polish + Metrics)

- Funnel events:
  - `addon_cta_click`
  - `addon_checkout_start`
  - `addon_checkout_success`
  - `addon_output_viewed`
- Track quality feedback per add-on output.
- Add smoke coverage for add-on entitlement + generation happy path.

## Data/Contract Changes (Planned)

- Result payload extension (example shape):
  - `addons: { rewrite_contract: "not_purchased|processing|ready", create_update_email: "not_purchased|processing|ready" }`
- Optional output blocks:
  - `rewrite_output`
  - `update_email_output`

## Notes

- Keep legal disclaimer visible in all new output surfaces.
- Keep positive empty states truthful: "no major issues detected" rather than "perfect contract".
