# PlainTerms — Claude Instructions

## /sample-report must mirror the result page

`/result/[id]` is the source of truth for every tab's layout and content format.

The `/sample-report` page teases the same tabs with locked/blurred placeholder content — but the **shape, structure, and UI patterns** of what's shown (before the lock overlay) must be identical to what the real results page renders for that tab.

- Questions tab → real tab uses numbered `<details>` accordions with question text + "Why ask this" body + email draft card. Sample must match that shape.
- Document tab → real tab uses a file toolbar with Original / Track Changes / Revised segmented control, then document prose. Sample must match that shape.
- Flags, Terms, Insights, Full Report tabs → same rule: match the real result tab's layout exactly, just blur/lock the content.

**Never invent a different layout for a tab on sample-report.** If you're unsure what a tab looks like on the result page, read `src/components/ResultWorkspace.tsx` first.

**`/preview/[id]` is deliberately exempt.** It is NOT a tabbed mirror of the result page. It is a single-page free readout (real risk score, health snapshot, red-flag titles, next steps, one rewrite example) ending in one checkout CTA — no tabs, no locked/blurred placeholders, no mid-content unlock prompts. See `src/components/PreviewUnlockPanel.tsx`. Do not restore the old tabbed/locked preview.

## No developer-facing copy on the live UI

Never add copy intended for the developer (e.g. explaining how features work, noting what's internal). All text that appears in the UI is user-facing only.

## Cursor pointer

All `<button>` elements have `cursor: pointer` via the global CSS reset in `globals.css`. Do not add `cursor-pointer` per-element — it's already covered.

## Commits

No `Co-Authored-By: Claude` trailer. Push directly to `main` after each change.

## Backend deploys

Always use `npm run stripe:sandbox:build` or `npm run stripe:live:build`. Never bare `sam deploy`.
