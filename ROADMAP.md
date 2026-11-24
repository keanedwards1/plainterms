# PlainTerms roadmap: free-first accounts, app-first UI, dashboard

> The working plan for PlainTerms. Tick boxes off in the same commit that finishes each step. It replaces `PRODUCT_IMPLEMENTATION_PLAN.md` (March 2026, pay-per-report model).

## Context

PlainTerms today is an anonymous, pay-per-report product. A marketing landing page leads to `/analyze`. A free preview runs the rules engine only, and full reports are one-off Stripe payments (`scan_39` / `report_69` / `protect_99`). Results are opened with access-key links and deleted after 30 days.

The goal is a Canva-style product that is free and generous for the most part, built for a very large user base (and as practice in distributed systems):
- **The first page is the app**, and it delivers real value in the first seconds.
- **Sign-in (WorkOS AuthKit, Google and others) appears when the user presses Analyze.**
- **Free tier:** the full report on a mid-tier model, with a generous **hidden** monthly document limit that's only mentioned when someone hits it.
- **Pro (Stripe subscription):** the best model, rewrites (Track Changes and Revised document), and long-term document history.
- **An enterprise-style account dashboard.**
- **Stay on AWS, with DynamoDB** for users, usage and history.
- **The UI must be top quality**, built so the most valuable things are the first things people see.

## Standing product decisions

These were carried over from the February 2026 discovery notes ([archive/PRODUCT_DECISIONS.md](archive/PRODUCT_DECISIONS.md)) and still apply:
- **Every report leads to a decision:** Sign, Negotiate, or Do not sign yet.
- **Risk is shown as a weighted 0–100 score** with a Low, Medium or High label.
- **Findings cite their source:** the clause snippet plus its page or section. Unclear wording gets an explicit "Unclear wording" tag and suggested rewrite language.
- **A strong "talk to an attorney" prompt appears only for high-risk results.** Every output carries the "not legal advice" disclaimer.
- **Healthy contracts get positive, truthful empty states:** "no major issues detected", never "perfect contract".
- **Launch scope:** U.S. only, 18+ only, U.S.-only data storage and processing. File types are PDF and DOCX.
- **Security baseline:**
  - Encryption at rest and TLS in transit.
  - Expiring signed URLs.
  - Malware scan before processing.
  - Strict per-user isolation.
  - No raw contract text in logs.
  - Rate limiting and bot protection.
  - Secrets in SSM.
- **Feedback loop:** thumbs up or down on each flag, plus "what we missed" free text. The main quality metric is the share of reports users rate 4/5 or higher.

## Working rules for Phase 1

- **All Phase 1 work happens on the branch `app-first-accounts`.** Commits and pushes go to that branch, never to `main`. The user merges it after reviewing. This overrides CLAUDE.md's "push to main" for this work only.
- No `Co-Authored-By` trailer on commits (CLAUDE.md).
- Backend deploys use `npm run stripe:sandbox:build` only, never bare `sam deploy`. Live deploys happen only after the merge.
- Tick each box in `ROADMAP.md` in the same commit that finishes it.

---

## Step 0: install project-only skills (before Phase 1, on `main`)

Each one is installed with **project scope**: it's turned on in this repo's `.claude/settings.json` and doesn't load in other projects. Claude Code still keeps a downloaded copy of plugin files under `~/.claude/plugins/cache`, which is normal and doesn't turn them on anywhere else.

| # | What | Command | Notes |
|---|---|---|---|
| 1 | **Matt Pocock skills** (engineering workflow: spec, TDD, grilling, code review…) | `claude plugin marketplace add anthropics/claude-plugins-official --scope project`, then `claude plugin install mattpocock-skills@claude-plugins-official --scope project` | Without `--scope project`, the install defaults to **user** (global), so this flag matters. Its skills are namespaced (`mattpocock-skills:code-review`), so they don't clash with the built-in `/code-review`. |
| 2 | **Modern Web Guidance** (Google Chrome, Edge, Firefox and MDN teams) | `claude plugin marketplace add GoogleChrome/modern-web-guidance --scope project`, then `claude plugin install modern-web-guidance@googlechrome --scope project` | Installed as a plugin rather than with the `npx … install` wizard, because the wizard doesn't say where it writes and the plugin route lets us control scope. **No conflict** with Matt Pocock's skills: its skills are `modern-web-guidance` and `chrome-extensions`, which don't overlap. |
| 3 | **Taste skill** (`design-taste-frontend`, for frontend visual quality) | `npx skills@1.9.0 add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend -a claude-code` | `skills` installs into the project by default (`-g` would make it global). It copied the skill into `.claude/skills/design-taste-frontend` and added `skills-lock.json`. It needs Node 22+ (you have 24.13) and Chrome (installed). It has a **Stop hook** that runs its own browser "finish gate" script while the skill is in use. **Caveat:** it's written for marketing websites (one section per screen, hero animations, photography). I'll use it fully for `/how-it-works` and as a polish and review pass on app screens, but the workspace and dashboard stay app-shaped rather than landing-page-shaped. |
| 4 | **Caveman** (shorter replies, fewer tokens) | `claude plugin marketplace add JuliusBrussee/caveman --scope project`, then `claude plugin install caveman@caveman --scope project` | **Recommend this instead of `npx @caveman-ai/cli`.** The CLI is not a skill: it installs globally, downloads binaries to `~/.caveman`, reroutes Claude Code's API traffic through a local proxy, writes its skills to your **user** skills folder, and has a cloud service. The plugin gives the same `/caveman` voice through hooks. Those hooks are local Node scripts (no network calls found) that only write small state files in `~/.claude` (`.caveman-active`, `.caveman-history.jsonl`). **Effect:** once it's on, my replies in this project become terse "caveman" style. Type "normal mode" to switch it off. |

After installing:
- [x] Restart the Claude Code panel so the new skills and hooks load, then confirm with `claude plugin list` and `/caveman status`.
- [x] Commit the new `.claude/settings.json`, `.claude/skills/` and `skills-lock.json` to `main` and push, per CLAUDE.md, with no Co-Authored-By trailer. Then create the `app-first-accounts` branch for Phase 1.

---

## Phase 1: accounts, free-first plan, app-first UI, dashboard

### 1.0 Setup
- [x] Create the branch `app-first-accounts` from `main`.
- [x] Add `ROADMAP.md` (this plan) and the pointer note in `PRODUCT_IMPLEMENTATION_PLAN.md`.

### 1.1 Design first: get approval before building
The UI is the priority, so the main screens are designed and approved before the plumbing is built.
- [x] ~~Mock up 3 directions~~ Built one direction in the existing brand instead, so work could continue uninterrupted. It's waiting for your review (see NEED.md §4).
- [x] Result page top (verdict, top fixes, first read then full analysis) and dashboard built in the same direction.
- [x] Pull shared building blocks out of the existing `--pt-*` tokens in [globals.css](src/app/globals.css): Button, Card, Badge, Tabs, Dialog, Toast, Skeleton, EmptyState and Avatar menu. Every new screen uses these.

**How the design puts value up front:**
- **Home, above the fold:** one clear line about what it does, a large drop zone, and two zero-effort options:
  - **"Try a sample contract"** opens a real, finished result instantly, with no upload or sign-in.
  - **"Paste text"** analyzes pasted contract text.
- **A first answer in seconds.** The rules engine (today's free preview) runs instantly and shows a provisional **verdict (Sign / Negotiate / Don't sign yet), risk score and top 3 issues** while the AI analysis runs. The LLM result then fills in and refines it. This reuses the existing "processing" status in [getResult.mjs](services/api/plainterms-api/lambdas/getResult.mjs).
- **The result page opens on "Your top 3 fixes".** Each fix has one-click actions: copy suggested wording, and draft an email to the contractor. Deeper detail sits behind the tabs.
- **No dead ends.** Every empty state, error and limit message suggests a next step.

**Quality bar, checked on every screen:**
- Designed for mobile first, down to 360px wide.
- Keyboard and screen-reader usable, with WCAG AA contrast.
- Lighthouse performance and accessibility of 95 or above.
- Skeletons instead of spinners, no layout shift, and respect for reduced-motion settings.
- Screenshots at phone and desktop width are reviewed with the user at each UI step.

### 1.2 Authentication: WorkOS AuthKit
- [x] Add `@workos-inc/authkit-nextjs`. Compose its middleware into [src/proxy.ts](src/proxy.ts), keeping the construction gate.
- [x] Add `src/app/callback/route.ts` (`handleAuth()`) and the sign-in and sign-out actions.
- [ ] **You:** set the env vars `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` and `NEXT_PUBLIC_WORKOS_REDIRECT_URI`. Enable Google, Microsoft, Apple and magic link in WorkOS.
- [x] In [next.config.ts](next.config.ts), add the WorkOS domains to the CSP `connect-src` and `form-action`.
- [x] Give [postJsonProxy.ts](src/lib/postJsonProxy.ts) an `auth` option that forwards `Authorization: Bearer <accessToken>` from `withAuth()`. Add `getJsonProxy` and `deleteProxy` siblings.
- [x] Add `lambdas/lib/auth.mjs` with `requireUser` and `optionalUser`. They verify the WorkOS JWT using `jose` and the WorkOS JWKS, cached at module scope. Add the `jose` dependency and a `WorkosClientId` template parameter.

### 1.3 Data model (DynamoDB, in [template.yaml](services/api/plainterms-api/template.yaml))
- [x] **UsersTable** (PK `user_id`). Fields: `email`, `plan`, `stripe_customer_id`, `subscription_id`, `subscription_status`, `current_period_end`, `created_at`. Created by a conditional put on first sight.
- [x] **UsageTable** (PK `user_id`, SK `period` such as `2026-11`). An atomic `ADD docs_count` with the condition `< :limit` keeps the count correct under concurrency. TTL is about 400 days.
- [x] **StripeEventsTable** (PK `event_id`, TTL 30 days) for webhook idempotency.
- [x] **ResultsTable:** add `owner_user_id` and `created_at`, plus the GSI `owner-created-index`. Free results keep a 30-day `expires_at`. Pro results have none.

### 1.4 Analysis flow
- [x] Upload and precheck stay anonymous. The 15-minute precheck token ([precheckToken.mjs:4](services/api/plainterms-api/lambdas/lib/precheckToken.mjs#L4)) covers the sign-in round trip.
- [x] When a signed-out user presses Analyze: stash the upload details in `sessionStorage`, go to AuthKit with `returnTo=/?resume=1`, then resume automatically. Extend [contractSubmit.ts](src/lib/contractSubmit.ts) with an `"analyze"` path and a sign-in pause step.
- [x] Add a new `POST /analyze` Lambda modelled on [previewAnalysis.mjs](services/api/plainterms-api/lambdas/previewAnalysis.mjs). It:
  1. Requires auth and upserts the user.
  2. Checks the quota against the hidden `FREE_MONTHLY_DOC_LIMIT` parameter, returning `429 monthly_limit_reached` when it's hit.
  3. Runs the instant rules pass, then the LLM pass.
  4. Writes `owner_user_id`.
  5. For Pro, starts the existing `GenerateRevisionFunction`.
- [x] Replace `PAID_ANALYSIS_MODEL_BY_TIER` and `resolveFinalAnalysisSelection` ([runAnalysis.mjs:695-725](services/api/plainterms-api/lambdas/lib/runAnalysis.mjs#L695-L725)) with `MODEL_BY_PLAN`. The parameters are `FreeLlmModel` (default `gpt-5-mini`) and `ProLlmModel` (default `gpt-5.5`). Keep the `PAID_ANALYSIS_MODE=rules` kill switch.
- [x] Results store `entitlements { plan, rewrites, revisedDocument, history }`. `getResult` allows the owner **or** the existing access key, so old links keep working.

### 1.5 Stripe subscription
- [x] Use the [stripeConfig.mjs](services/api/plainterms-api/lambdas/lib/stripeConfig.mjs) and [ssm.mjs](services/api/plainterms-api/lambdas/lib/ssm.mjs) pattern. Add SSM params for the Pro price ID and the webhook secret, and extend [deploy-stripe-mode.mjs](scripts/deploy-stripe-mode.mjs).
- [x] `POST /billing/checkout`: a Checkout Session in `mode: "subscription"`, reusing the customer, with `client_reference_id = userId`.
- [x] `POST /billing/portal`: a Billing Portal session.
- [x] `POST /billing/webhook`:
  - Verifies the signature against the raw body. It skips auth and CORS.
  - Is idempotent through StripeEventsTable.
  - Handles `checkout.session.completed`, `customer.subscription.*` and `invoice.payment_failed`.
  - Is the only source of truth for the plan. On downgrade, it restores 30-day expiry using the GSI.
- [x] Retire the one-off purchase UI: the tier picker, the pricing cards, the [UpgradeModal.tsx](src/components/UpgradeModal.tsx) checkout and [/analyze/complete](src/app/analyze/complete/page.tsx). `createCheckout` and `verifyCheckout` stay deployed until old links expire.

### 1.6 App-first UI build (using the approved designs from 1.1)
- [x] Build `/` as the workspace: drop zone, sample contract, paste text, and recent documents for signed-in users. Reuse the drop handling from [analyze/page.tsx](src/app/analyze/page.tsx).
- [x] Move the current marketing page to `/how-it-works` so its SEO content survives. Redirect `/analyze` to `/`, and update [sitemap.ts](src/app/sitemap.ts) and [robots.ts](src/app/robots.ts).
- [x] Rework [SiteHeader.tsx](src/components/SiteHeader.tsx):
  - Signed out: Sign in.
  - Signed in: an avatar menu (Dashboard, Plan & billing, Sign out), plus Upgrade for free users.
- [x] In [ResultWorkspace.tsx](src/components/ResultWorkspace.tsx), replace the `reportTier` checks (around line 702) with `entitlements`. Add the "Top 3 fixes" opening view and the provisional-then-refined result. Only Track Changes / Revised and Rewrites are locked for free users.
- [x] Show the monthly-limit message only when a 429 comes back.
- [x] CLAUDE.md rules:
  - Update [/sample-report](src/app/sample-report/page.tsx) and [SampleReportTabsPreview.tsx](src/components/SampleReportTabsPreview.tsx) so they mirror the new result tabs and locks exactly.
  - `/preview/[id]` stays as-is for old links.
  - All copy is user-facing.
- [x] Update [privacy](src/app/privacy/page.tsx) and [terms](src/app/terms/page.tsx) for accounts, billing, Pro retention and account deletion.

### 1.7 Account dashboard (`/dashboard`, sign-in required)
- [x] Layout: a sidebar on desktop and tabs on mobile.
- [x] **Documents:** a list using a GSI cursor, newest first, showing status, risk score and date. Includes open, delete, filename search and an empty state that points to the drop zone.
- [x] **Plan & billing:** shows the plan and renewal date, with Upgrade or Manage billing (Stripe portal).
- [x] **Account settings:** name and email, sign out, and "Delete account and data". Deletion removes results and S3 objects, cancels Stripe, deletes the user row and deletes the WorkOS user.
- [x] Lambdas `GET /me`, `GET /documents`, `DELETE /documents/{id}` and `DELETE /me`, each with a matching Next.js API route under `src/app/api/`.

### 1.8 Verify and hand over
- [ ] Run the checks in **Verification** below. Unit tests, lint, build and accessibility pass; end-to-end needs NEED.md §1–3.
- [ ] Push `app-first-accounts`, share the Vercel preview URL and sandbox notes, and the user decides whether to merge.

---

## Phase 2: legal-AI quality and legal data
- [ ] Prompts and clause checklists per document type, extending [llmAnalyze.mjs](services/api/plainterms-api/lambdas/lib/llmAnalyze.mjs).
- [ ] Retrieval over statutes and case law: state contractor-licensing and mechanic's-lien laws first, then CourtListener (Free Law Project) case law. Answers cite the source.
- [ ] An evaluation set of real contracts with expected findings, run as a regression gate before any prompt or model change.
- [ ] Move the async Lambda invokes to SQS with a dead-letter queue and retries. Add per-user rate limits and load testing.

## Phase 3: more consumer tools (ranked by impact)

**A. Highest impact, and they fit the current product**
1. **Ask your contract:** chat Q&A about the document, where every answer cites the clause it came from.
2. **Scan a paper contract:** photo or scanned-PDF upload with OCR, for example AWS Textract. Many homeowners get paper contracts, and today scanned PDFs can't be read.
3. **Compare versions:** upload the contractor's revised draft and see what changed and whether it got better or worse.
4. **Key dates and money:** pull out deadlines, payment milestones and warranty periods, then offer an "Add to calendar" (.ics) download and optional email reminders.
5. **Contractor check:** state licence-lookup links, an insurance and bond checklist, and a payment-schedule check against state deposit limits (for example, California's cap on home-improvement down payments).
6. **Legal document templates with guided fill-in:** answer a few questions and get a filled DOCX or PDF, with state variants where the law requires them. Starting set:
   - Home and renovation: home improvement contract, change order, lien waivers (conditional and unconditional; some states require a set statutory form), final payment and completion sign-off.
   - Everyday: NDA, freelance or services agreement, independent contractor agreement, residential lease, roommate agreement, bill of sale, promissory note, payment plan agreement.
   - Letters: demand letter, security-deposit demand, complaint letter to a contractor, reply to a cease-and-desist.
7. **Explain a legal letter:** collection notices, HOA violations, lease notices, insurance denials.

**B. Strong follow-ons**

8. Negotiation tracker: what you asked for, what came back, and re-analysis of the new version.
9. Plain-English glossary that shows meanings when you hover over legal terms.
10. Spanish (and other language) versions of reports.
11. E-signature, through an e-sign API.
12. State-by-state small claims guides.
13. Analyze a contract by forwarding the email to a PlainTerms address.
14. "Get a lawyer to review this": an attorney referral marketplace. This needs a check against state bar referral rules first.

**Guardrail for all of these:** explaining documents and providing self-help templates is generally fine, which is the Nolo and LegalZoom model. Tailored legal advice is not. Keep the disclaimers and the self-help framing, and get a short lawyer review before launching templates.

## Phase 4: lawyer-facing product
A separate experience on the same accounts, using WorkOS enterprise SSO for firms. Scope it after Phase 3.

---

## Verification (for Phase 1)
1. **Backend tests:** `cd services/api/plainterms-api/lambdas && npm test`, with new tests for:
   - `auth.mjs`: valid, expired and wrong-audience tokens.
   - The quota at the limit under concurrent calls.
   - The webhook signature, plus replaying the same event.
   - `getResult`: owner versus access key versus stranger.
2. **Sandbox deploy:** `npm run stripe:sandbox:build`.
3. **End to end on `npm run dev` and the Vercel preview of the branch:**
   1. The sample contract opens instantly, signed out.
   2. Drop in a PDF and press Analyze. Sign-in appears. Sign in with Google, the upload resumes, and the provisional verdict shows within seconds, then fills in.
   3. All free tabs are open and only Revised is locked.
   4. The document appears in `/dashboard`.
   5. Upgrade with test card `4242 4242 4242 4242`. The webhook sets the plan to Pro, and Pro gets the stronger model and Revised.
   6. Cancel in the portal. The plan returns to free and the 30-day expiry is restored.
   7. With `FREE_MONTHLY_DOC_LIMIT=1`, the second document shows the limit message.
   8. An old `/result/[id]?k=` link still works.
   9. Deleting the account removes the DynamoDB rows and S3 objects.
4. **UI quality:**
   - Screenshots at 360px and 1440px for home, result and dashboard.
   - Lighthouse performance and accessibility of 95 or above.
   - Keyboard-only walkthrough.
   - `/sample-report` matches a real free result's tab shapes.
5. **Final checks:** `npm run lint`, `npm run build`, and `npm run smoke:funnel` updated for the new flow.
