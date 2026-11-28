---
name: legal-templates
description: Rules, licensing research and risk decisions for PlainTerms' fill-in legal templates (/templates, src/lib/templateLibrary, src/lib/templateKit, templates/sources). Use when writing, editing, adding or reviewing a template, choosing a source to base one on, changing the template page, download or draft storage, or answering questions about template licensing or legal risk.
---

# Legal templates

PlainTerms offers fixed-text legal templates with blanks. People fill the blanks in the browser and download a Word file or print/save a PDF. This file records what was decided and why, so later changes keep to it.

## Where things live

| What | Where |
|---|---|
| Template list, groups, search keywords, `WRITTEN_TEMPLATES` | `src/lib/templates.ts` |
| Template text (server-only; one file per category) | `src/lib/templateLibrary/*.ts`, registry in `index.ts` |
| Shared clauses (`GENERAL_TERMS`, `GOVERNING_STATE`, `LETTER_FIELDS`) | `src/lib/templateLibrary/shared.ts` |
| Types, filling, validation, Word export | `src/lib/templateKit/` |
| Fill-in page | `src/app/templates/[slug]/page.tsx`, `src/components/templates/TemplateFiller.tsx`, `TemplateDocument.tsx`, `templates.css` |
| List page, filters, search | `src/app/templates/page.tsx`, `src/components/templates/TemplateBrowser.tsx`, `src/components/search/TemplateSearch.tsx`, `src/lib/templateSearch.ts` |
| Downloaded public-domain and statutory sources, with licences | `templates/sources/` and `templates/sources/SOURCES.md` |
| Tests (wiring of every template, Word build, escaping, drafts) | `src/lib/templateLibrary/library.test.ts`, `src/lib/templateSearch.test.ts` |

## Rules for template text

1. **Fixed text with blanks only.** No branching on answers, no optional clauses, no AI tailoring per user. A blank left empty prints as a line to fill by hand. This keeps the product a form publisher, not legal advice (see Risk below).
2. Every `{{blank}}` must be a field, every field must be used, and every field sits in exactly one group. The library test enforces this.
3. Every template has `notes`: plain warnings about when it may not fit (state rules, notarization, who must sign). The page also shows the standard disclaimer, and the Word file and print have the "not a law firm, not legal advice" footer (`DOC_FOOTER`).
4. Don't state state-specific rules as facts (deadlines, caps). Say they vary and tell people to check.
5. Bump `version` when wording changes. Drafts carry the version they were made from.
6. Plain English, user-facing only (no developer notes in UI copy). Use `GENERAL_TERMS` for closing clauses.
7. Creator templates keep the FTC Endorsement Guides disclosure clause. The NDA keeps the 18 U.S.C. § 1833(b) whistleblower notice.

To add a template: write it in the right category file, add the slug to `WRITTEN_TEMPLATES`, run `npx vitest run src/lib/templateLibrary`.

## Held back (do not write without a lawyer's review or state-specific versions)

Power of attorney, lien waivers, residential and commercial leases, sublease, home improvement contract, LLC operating agreement, founder agreement, partnership agreement, IP assignment, privacy policy, terms of service, job offer letter, independent contractor agreement, promissory note, settlement agreement, vehicle bill of sale, talent management, nanny agreement.

Why: state law sets the form or formalities (statutory lien waiver and POA forms, notarization), a wrong version can be void (lien waivers in CA, TX and about 10 more states must follow statute wording), or the risk is legal status rather than wording (worker misclassification such as California's AB5, usury caps, securities and equity, talent agency licensing, domestic worker law, CCPA and other privacy laws).

## Sources and licensing

Only base templates on text we may reuse commercially **and** change:

- **OK:** US federal works (public domain, 17 U.S.C. 105: CFPB, FTC, EPA, HUD), statute text (laws aren't copyrightable), CC0, CC BY 4.0 with credit (e.g. Common Paper, Bonterms for business contracts).
- **Not OK:** CC BY-ND (no changes), CC BY-NC (Pro is paid), "free download" sites (LegalZoom, Rocket Lawyer, LawDepot, eForms, Template.net, Nolo, law firm blogs), AIA and ConsensusDocs forms, state legal aid sites (MassLegalHelp, LawHelp) and California Courts self-help letters (copyrighted or non-commercial).
- State agency and court sites aren't automatically public domain; use them only for statute text or after checking their copyright notice.
- An MIT-licensed repo may contain forms copied from elsewhere (SuffolkLITLab's security deposit letter looked copied from MassLegalHelp), so it was not used.
- Claude-written text isn't copyrightable on its own (US Copyright Office guidance; *Thaler v. Perlmutter*, D.C. Cir. 2025). We can use it freely; competitors can copy it. Human editing adds protection.
- Record every new source in `templates/sources/SOURCES.md`.

Current sources in use: CFPB debt collection letters (debt dispute and stop-contact templates), EPA Form 9600-041 (lead paint disclosure), FTC sample complaint letter structure (contractor complaint). The California (Civ. Code 8132–8138) and Texas (Prop. Code 53.284) lien waiver forms are downloaded but not used yet. The California wording still needs checking against leginfo.legislature.ca.gov before use.

## Risk (unauthorized practice of law and liability)

- Selling blank forms is generally allowed. Texas exempted form software after the 1999 *Parsons Technology* (Quicken Family Lawyer) case.
- Questionnaire-filled forms are the grey zone. *Janson v. LegalZoom* (W.D. Mo. 2011) treated document preparation from answers as possible UPL. North Carolina allows interactive forms under N.C. Gen. Stat. § 84-2.2: templates reviewed by an NC-licensed lawyer, the consumer can see the blank template, clear disclaimers, no attorney-client relationship.
- Anthropic's Usage Policy treats consumer-facing legal guidance as high risk: qualified professional review and disclosure of AI use. The FTC fined DoNotPay over "robot lawyer" claims, so never market templates as lawyer-drafted or lawyer-quality unless a lawyer actually reviewed them.
- Assessed risk: unreviewed, all states: high (orange). With fixed text, disclaimers, held-back list and a lawyer's flat-fee review: medium (yellow).
- Before charging for templates or adding held-back ones: lawyer review (an NC-licensed lawyer covers § 84-2.2), ToS with limitation of liability, annual re-check of templates against law changes.

This is research, not legal advice.

## Security and privacy rules

- Answers never leave the browser. No server route receives template answers today.
- Answers are rendered only as React text nodes and docx `TextRun`s. Never use `dangerouslySetInnerHTML`, HTML strings or templating that produces markup.
- Any draft from outside the component (session storage now, the account later) goes through `readDraft`: matching slug, known field ids only, strings only, `cleanValue` length caps and control-character stripping.
- The sign-in handoff stores the draft in `sessionStorage` (`pt.templateDraft`, per tab) and deletes it as soon as it's restored.
- The form and preview carry `data-clarity-mask="true"`. Don't send answers to analytics. Meta pixel "automatic advanced matching" must stay off in Events Manager, because it can read form fields.
- The library is `server-only`; each page sends only its own template.
- Download file names go through `fileName()` (letters, digits and dashes only).
- The sign-in gate is a sign-up prompt, not a security boundary: the template text is public on the page.

### When adding account saving later

Store `TemplateDraft` (`slug`, `version`, `values`) per user via an authed API route (`authedProxy`), validate with `readDraft` on both the server and the client, enforce per-user ownership checks on every read and delete, cap the size and the number of drafts per user, encrypt at rest (DynamoDB default plus no answers in logs), never log `values`, and let users delete drafts. Backend deploys go through `npm run stripe:sandbox:build` / `npm run stripe:live:build`, run by the user.
