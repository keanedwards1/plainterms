# PlainTerms — Claude Instructions

## Design system: Meadow Mosaic

The UI follows the approved "Meadow Mosaic" direction. Tokens live in `src/app/globals.css` (`--pt-*`); component classes (`.pt-btn`, `.pt-panel`, `.pt-framed`, ...) sit in `@layer components` so Tailwind utilities can override them. The app frame is `src/components/shell/` (left rail on tablet and up, bottom tab bar on phones, top bar, footer with the dithered glow). Decorative art is `src/components/art/` and never carries words.

There is no sample report or how-it-works page any more; the home page is the app. `/result/[id]` is the source of truth for the result layout.

**`/preview/[id]` is deliberately exempt.** It is a single-page free readout (real risk score, health snapshot, red-flag titles, next steps, one rewrite example) ending in one checkout CTA — no tabs, no locked/blurred placeholders, no mid-content unlock prompts. See `src/components/PreviewUnlockPanel.tsx`. Do not restore the old tabbed/locked preview.

## Legal templates

Before writing, editing or adding a template, or changing the template pages, download or draft storage, load the `legal-templates` skill (`.claude/skills/legal-templates/SKILL.md`). It holds the licensing research, the held-back list, the fixed-text-with-blanks rule and the security rules.

## No developer-facing copy on the live UI

Never add copy intended for the developer (e.g. explaining how features work, noting what's internal). All text that appears in the UI is user-facing only.

## Cursor pointer

All `<button>` elements have `cursor: pointer` via the global CSS reset in `globals.css`. Do not add `cursor-pointer` per-element — it's already covered.

## Commits

No `Co-Authored-By: Claude` trailer. Push directly to `main` after each change.

## Backend deploys

Always use `npm run stripe:sandbox:build` or `npm run stripe:live:build`. Never bare `sam deploy`.
