# PlainTerms — Claude Instructions

## Preview and sample-report pages must mirror the result page

`/result/[id]` is the source of truth for every tab's layout and content format.

The `/preview/[id]` and `/sample-report` pages tease the same tabs with locked/blurred placeholder content — but the **shape, structure, and UI patterns** of what's shown (before the lock overlay) must be identical to what the real results page renders for that tab.

- Questions tab → real tab uses numbered `<details>` accordions with question text + "Why ask this" body + email draft card. Preview must match that shape.
- Document tab → real tab uses a file toolbar with Original / Track Changes / Revised segmented control, then document prose. Preview must match that shape.
- Flags, Terms, Insights, Full Report tabs → same rule: match the real result tab's layout exactly, just blur/lock the content.

**Never invent a different layout for a tab on preview or sample-report.** If you're unsure what a tab looks like on the result page, read `src/components/ResultWorkspace.tsx` first.

## No developer-facing copy on the live UI

Never add copy intended for the developer (e.g. explaining how features work, noting what's internal). All text that appears in the UI is user-facing only.

## Cursor pointer

All `<button>` elements have `cursor: pointer` via the global CSS reset in `globals.css`. Do not add `cursor-pointer` per-element — it's already covered.

## Commits

No `Co-Authored-By: Claude` trailer. Push directly to `main` after each change.

## Backend deploys

Always use `npm run stripe:sandbox:build` or `npm run stripe:live:build`. Never bare `sam deploy`.
