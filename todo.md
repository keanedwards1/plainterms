# Security Audit TODO

## Medium Severity

- [ ] **LLM Prompt Injection** — `services/api/plainterms-api/lambdas/lib/llmAnalyze.mjs:119-134`
  - Document text is embedded directly into the LLM prompt. A crafted contract could manipulate analysis output.
  - Existing mitigations: text truncated to 18k chars, JSON response format enforced, field-level sanitization (500 char limits, status validation, quote verification).
  - Action: Add delimiter/boundary marker around document text and instruct the model to ignore instructions within the document.

- [ ] **No Frontend Rate Limiting** — `src/app/api/` routes
  - Next.js proxy layer has no rate limiting. Backend has WAF (1500 req/5min per IP) and API Gateway throttling (10 req/sec), but Vercel frontend routes are unprotected.
  - Action: Add Vercel rate limiting or middleware-based throttling on sensitive endpoints (`/api/checkout`, `/api/upload-url`).

- [ ] **Precheck Token Replay** — `services/api/plainterms-api/lambdas/createCheckout.mjs:78-98`
  - A valid precheck token can create multiple Stripe checkout sessions within its 15-minute TTL. Each requires separate payment, but could enable abuse patterns.
  - Action: Consider adding a nonce or one-time-use flag to precheck tokens.

- [ ] **Webhook URL Not Validated** — `src/lib/observability.ts:59`
  - `ALERT_WEBHOOK_URL` is fetched without URL validation. If the env var is compromised, it becomes an SSRF vector.
  - Action: Validate the URL is HTTPS and matches an expected domain pattern.

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

- [ ] **S3 CORS Allows All Headers** — `services/api/plainterms-api/template.yaml:126`
  - Low risk since objects aren't publicly readable.
  - Action: Restrict `AllowedHeaders` to specific values (`content-type`, `x-amz-*`).

- [ ] **Wildcard CORS for Vercel Previews** — `services/api/plainterms-api/lambdas/lib/cors.mjs:19-24`
  - `plainterms-*.vercel.app` allows any preview deployment.
  - Action: Consider restricting to explicitly listed preview URLs or requiring auth on preview backends.

---

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
