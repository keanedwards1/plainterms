# Security Audit TODO

## Critical — Broken Paid Flow (Blocker)

- [ ] **Preview-unlock checkout always returns 500** — `services/api/plainterms-api/lambdas/createCheckout.mjs:166`
  - `resultCheck.reportTier` is read inside the **preview-unlock** branch, but `resultCheck` is declared with `const` at line 223 in the **result-upgrade** branch below. Temporal dead zone violation.
  - Verified: throws `ReferenceError: Cannot access 'resultCheck' before initialization` (not `undefined`). The branch's own `catch` at line 211 swallows it into a generic `500 checkout_creation_failed`.
  - Impact: **nobody converting from a preview link can pay.** This code path has never succeeded in production. Fails closed, so it is a revenue bug, not an exploit.
  - Complication: `verifyPreviewResultAccess` (line 74) does not return `reportTier` at all, unlike `verifyResultAccess` (line 126). So renaming to `previewCheck` alone is not enough.
  - Decision needed: a preview has no purchased tier to upgrade *from*, so the tier-rank check should probably be dropped for previews rather than adding the field.

## Pre-Launch — Before Running Ads

### Blockers (must do before any ad spend)
- [ ] **Take the site out of "under construction"** — remove the `CONSTRUCTION_PASSWORD` env var from Vercel and redeploy. Right now `https://www.plainterms.us/` 307-redirects all traffic to `/construction`, so every ad click hits a password wall.
- [ ] **Confirm Stripe is in LIVE mode in production** (see Stripe Verification section below) — real customers can't pay on test keys.
- [x] **Confirm `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in Vercel production** so analytics actually fire.

### High (measure your ad spend)
- [x] **Add conversion tracking** — GA4 `purchase` event (value + currency + items) fires on `/analyze/complete` success, deduped per Stripe session.
  - [ ] **GA UI (one click, requires sign-in):** GA4 → Admin → Events (or Key events) → mark `purchase` as a **key event** so it counts as a conversion. The event will show up here within ~24h of the first live purchase.
  - [ ] (Optional / deferred) Add Google Ads and/or Meta Pixel conversion tags + retargeting audiences — decide later if going harder on paid.
- [ ] **Add a social/OG share image** (1200×630 `opengraph-image`) — metadata declares `summary_large_image` but no image exists, so link previews render blank.

### Medium (polish & trust)
- [x] **Add branded 404 + error pages** — `not-found.tsx`, `error.tsx`, and `global-error.tsx` added.
- [x] **Add `/sample-report` to `sitemap.ts` and the `robots.ts` allow-list** — also disallowed `/preview/` and `/construction`.
- [x] **Reconcile privacy policy** — removed account/sign-in language. NOTE: "We do not use third-party advertising cookies" line is still accurate; **must be revisited if ad pixels are added.**
- [ ] **Cookie-consent banner** — DECISION: skip for now (US-targeted, first-party GA only, no ad cookies). Add a consent banner + Google Consent Mode **before** targeting EU/UK/California or adding any ad pixel.

### Low / nice-to-have
- [ ] Bump smoke workflow Node 20 → 22 (`.github/workflows/smoke-funnel.yml`).
- [ ] Run `npm run build` as a final pre-launch sanity check.
- [ ] (Cosmetic) Internal tier keys `scan_39` / `report_69` / `protect_99` no longer match displayed prices ($29 / $79 / $149).

## Tomorrow Morning — Stripe Verification (Priority)

- [ ] Confirm backend mode is sandbox first:
  - `cd services/api/plainterms-api`
  - `sam deploy --parameter-overrides StripeMode=sandbox`
- [ ] Run 3 end-to-end sandbox checkouts from `/analyze`:
  - Core (`scan_39`)
  - Report (`report_69`)
  - Protect (`protect_99`)
- [ ] Use Stripe test card `4242 4242 4242 4242` for each checkout.
- [ ] In Stripe Dashboard (test mode), verify each Checkout Session has the expected price/amount per tier.
- [ ] Confirm app flow after payment:
  - `/analyze/complete` loads
  - Redirect reaches `/result/{id}`
- [ ] Switch to live mode when sandbox checks pass:
  - `sam deploy --parameter-overrides StripeMode=live`
- [ ] Do one real live payment test (smallest tier preferred) and verify successful result generation.
- [ ] Optional hardening: update `services/api/plainterms-api/samconfig.toml` add-on SSM paths when add-ons are ready.


## Medium Severity

- [ ] **LLM Prompt Injection** — `services/api/plainterms-api/lambdas/lib/llmAnalyze.mjs:119-134`
  - Document text is embedded directly into the LLM prompt. A crafted contract could manipulate analysis output.
  - Existing mitigations: text truncated to 18k chars, JSON response format enforced, field-level sanitization (500 char limits, status validation, quote verification).
  - Action: Add delimiter/boundary marker around document text and instruct the model to ignore instructions within the document.

- [ ] **No Frontend Rate Limiting** — `src/app/api/` routes
  - Next.js proxy layer has no rate limiting. Backend has WAF (1500 req/5min per IP) and API Gateway throttling (10 req/sec), but Vercel frontend routes are unprotected.
  - Action: Add Vercel rate limiting or middleware-based throttling on sensitive endpoints (`/api/checkout`, `/api/upload-url`).
  - Note: the backend WAF/throttle figures above were carried over from an earlier audit and were **not** re-verified against `template.yaml` in the 2026-07-21 pass. Confirm before relying on them — the unpaid-LLM item above assumes they hold.

- [ ] **Precheck Token Replay** — `services/api/plainterms-api/lambdas/createCheckout.mjs:78-98`
  - A valid precheck token can create multiple Stripe checkout sessions within its 15-minute TTL. Each requires separate payment, but could enable abuse patterns.
  - Action: Consider adding a nonce or one-time-use flag to precheck tokens.

- [ ] **Webhook URL Not Validated** — `src/lib/observability.ts:59`
  - `ALERT_WEBHOOK_URL` is fetched without URL validation. If the env var is compromised, it becomes an SSRF vector.
  - Action: Validate the URL is HTTPS and matches an expected domain pattern.

- [ ] **Unpaid LLM cost amplification via `/preview`** — `services/api/plainterms-api/lambdas/previewAnalysis.mjs`
  - `previewAnalysis` runs a **full** `runAnalysis` (LLM call included) with no payment required — only a valid precheck token gates it. Each request costs real inference spend.
  - Backend WAF (1500 req/5min per IP) and API Gateway throttling (10 req/sec) blunt this, but both are per-IP and the endpoint is unauthenticated, so a distributed caller can still drive cost.
  - Interacts with the "Precheck Token Replay" item below: one valid token can drive repeated preview analyses within its 15-min TTL. A one-time-use nonce would fix both at once.
  - Action: Confirm actual WAF/throttle values in `template.yaml`, then consider per-token single-use enforcement and a cheaper preview path (rules-only, no LLM).

## Low Severity

- [ ] **Zod Validation Errors Exposed to Client** — `src/app/api/checkout/route.ts:35`
  - `details: payload.error.flatten()` reveals API schema structure to callers.
  - Action: Remove `details` field in production or gate behind `NODE_ENV === "development"`.

- [ ] **`unsafe-inline` in CSP for Scripts** — `next.config.ts:37`
  - Needed for Next.js/Stripe but widens XSS attack surface.
  - Action: Explore nonce-based CSP for inline scripts when Next.js supports it.

- [ ] **X-Forwarded-For Trusted Without Proxy Validation** — `src/app/api/metrics/route.ts:16`
  - Only used for analytics, not security decisions. Could pollute logs with spoofed IPs.
  - Action: Use platform-specific trusted header (e.g. Vercel's `x-real-ip`) instead.

- [ ] **Error Messages Include Upstream Details** — `src/app/analyze/page.tsx:204`
  - `readErrorResponse()` truncates to 500 chars but still leaks backend error text to users.
  - Action: Return generic error messages to users; log details server-side only.

- [ ] **Malware Scanning is Signature-Based Only** — `services/api/plainterms-api/lambdas/lib/malwareScan.mjs`
  - Novel techniques could bypass signature detection. Mitigated by text-extraction-only approach.
  - Action: Monitor for new PDF/DOCX exploit techniques; consider integrating a third-party scanning service for higher assurance.

- [ ] **CORS falls open to a default origin** — `services/api/plainterms-api/lib/cors.mjs:65-67`
  - A disallowed origin receives `access-control-allow-origin: https://www.plainterms.us` rather than no header at all.
  - Not exploitable — the browser still blocks on the mismatch, and the API is capability-key-based rather than cookie-based. Purely a "fail closed vs. fail confusing" cleanup.
  - Action: Omit the CORS origin header entirely when the request origin is not allowed.

- [ ] **`getResult` mutates state on GET** — `services/api/plainterms-api/lambdas/getResult.mjs:280`
  - The revision backfill issues an `UpdateItemCommand` and can invoke the revision Lambda during a read request.
  - Access-key check precedes it, so this is not an authz hole — but it makes GET non-idempotent and lets an authorized caller trigger repeated Lambda invocations by re-fetching.
  - Action: Move the backfill to the write path, or guard it with a conditional update so concurrent GETs cannot each fire a worker.

- [ ] **S3 CORS Allows All Headers** — `services/api/plainterms-api/template.yaml:126`
  - Low risk since objects aren't publicly readable.
  - Action: Restrict `AllowedHeaders` to specific values (`content-type`, `x-amz-*`).

- [ ] **Wildcard CORS for Vercel Previews** — `services/api/plainterms-api/lambdas/lib/cors.mjs:19-24`
  - `plainterms-*.vercel.app` allows any preview deployment.
  - Action: Consider restricting to explicitly listed preview URLs or requiring auth on preview backends.

---

## Verified Sound — 2026-07-21 Review

No action needed. Recorded so a later audit does not re-litigate these.

- **Upload chain gates properly.** Presigned PUT is scoped to one key with a 300s expiry; `validateObjectKey` pins the `uploads/` prefix; `sanitizeFilename` strips path separators before use. MIME/extension disagreement is rejected outright (`uploadPolicy.mjs:71`), blocking `.pdf`-named-DOCX.
- **Precheck token cannot be cross-bound.** `createCheckout.mjs:325-347` re-binds the token to the current request's objectKey/filename/contentType/size and requires `scanPassed === true`, so a token from a clean file cannot be replayed against a different upload. (Same-file replay within TTL is still open — tracked above.)
- **Malware scan is content-based.** Magic-byte checks plus hand-rolled ZIP central-directory parsing; EOCD scan bounded to 65557 bytes and every offset bounds-checked before read — no OOB reads.
- **Access keys are capability-grade.** 256-bit random, stored only as SHA-256 hashes, compared with `timingSafeEqual`. Rotation on checkout keeps one grace generation. Preview and full access use separate keys, and preview mode returns only aggregate counts — never flag or clause text (`getResult.mjs:115-169`).
- **Prices are server-held.** Tier maps to a Stripe price ID server-side; the client never supplies an amount. `payment_status !== "paid"` blocks entry, and post-payment analysis failure auto-refunds.
- **Prompt injection is bounded.** Quotes are verified as literal substrings of the source before being kept (`llmAnalyze.mjs:19-32`) and statuses re-normalized against an allowlist. A malicious contract can sway prose summaries but cannot fabricate quotes or inject status values.
- **Secrets hygiene.** SSM-backed with env fallback; `.env*` gitignored and `.env.local` confirmed untracked.

## Homepage Changes

### Pricing Updates
- [x] Core: $20 → $29
- [x] Report: $60 → $79
- [x] Protect: $100 → $149

### Testimonials Section
- [x] Remove anonymous placeholder quotes (undermine credibility)
- [ ] Replace with real quotes from beta testers once available (Week 5-6 of launch plan)
  - Format: name + platform + follower count (e.g., "Sarah M., YouTube, 120K subscribers")
- [ ] If no real testimonials by launch day, remove the section entirely

### "Trusted by creators" Platform Bar
- [x] Change "Trusted by Creators Across a Multitude of Platforms" → "Built for creators on"
  - Current wording implies endorsement/adoption that doesn't exist yet

### "Our Mission" Section — Replace Entirely
- [x] Cut "Our Mission: Empowering Creators" heading and the three feature cards beneath it
- [x] Replace with a "How it works" section: three steps
  1. Upload your contract
  2. Get your analysis in minutes
  3. Negotiate with confidence

### Sample Report
- [ ] Create a viewable sample using an anonymized brand deal contract
- [x] Link from hero area — "See Sample Report" button should go somewhere real
  - This is the biggest missing piece; it sells the product by demonstrating it

### Legal Disclaimer
- [x] Add brief disclaimer language near the pricing section or checkout flow
  - Keep it to one line, visible but not scary
  - Bottom footer disclaimer is good; extend it to pricing area too

### Tier Names (Lower Priority)
- [ ] Consider names that speak directly to creators instead of "Core," "Report," "Protect"
  - Save for future iteration
