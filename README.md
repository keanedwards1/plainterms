# PlainTerms

PlainTerms is a contract explainer app that turns legal language into plain English.

- Frontend: Next.js + TypeScript (App Router), deployed on Vercel
- Backend: AWS SAM serverless stack (Lambda + API Gateway), deployed on AWS

## High-Level Architecture

- The Next.js frontend calls an AWS API Gateway base URL.
- Lambda handlers process requests for uploads, analysis jobs, and results.
- Infrastructure is managed with AWS SAM in `services/api/plainterms-api`.

## Current Project Status

- AWS backend is deployed and reachable.
- Vercel project and environment wiring are configured.
- Frontend and backend are connected via `API_BASE_URL` through Next.js API proxy routes.
- Local upload -> checkout -> result flow is implemented.

Live backend URL currently in use:
`https://kmg693wwdj.execute-api.us-west-2.amazonaws.com/Prod`

Health/test path:
`https://kmg693wwdj.execute-api.us-west-2.amazonaws.com/Prod/hello/`

## Repo Structure

- `src/`: Next.js application code
- `services/api/plainterms-api/`: AWS SAM backend (template, handlers, deploy config)
- `schemas/`: shared schema definitions

## Local Development

Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Frontend expects:

```bash
API_BASE_URL=https://kmg693wwdj.execute-api.us-west-2.amazonaws.com/Prod
NEXT_PUBLIC_RESULT_RETENTION_DAYS=30
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
# Recommended for metrics origin allowlist:
# NEXT_PUBLIC_SITE_URL=https://www.plainterms.us
# METRICS_ALLOWED_ORIGINS=https://www.plainterms.us,https://plainterms.us,http://localhost:3000
# Use either of these for Search Console meta verification:
# GOOGLE_SITE_VERIFICATION=your_verification_token
# NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_verification_token
# Optional: webhook endpoint for 5xx API alerts from Next.js routes
# ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
# Optional fallback for legacy code paths:
# NEXT_PUBLIC_API_BASE_URL=https://kmg693wwdj.execute-api.us-west-2.amazonaws.com/Prod
```

Set this in:
- `.env.local` for local development
- Vercel project environment variables for `Preview` and `Production`

`API_BASE_URL` is preferred because requests are proxied through Next.js API routes (avoids browser CORS issues).
`NEXT_PUBLIC_RESULT_RETENTION_DAYS` controls user-facing retention messaging in the frontend.
`NEXT_PUBLIC_GA_MEASUREMENT_ID` enables Google Analytics 4 tracking.
`METRICS_ALLOWED_ORIGINS` and `NEXT_PUBLIC_SITE_URL` help `/api/metrics` enforce trusted origins.
`GOOGLE_SITE_VERIFICATION` (or `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) adds the Search Console verification meta tag.

Quick Vercel CLI setup:

```bash
vercel env add API_BASE_URL preview
vercel env add API_BASE_URL production
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID preview
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID production
vercel env add GOOGLE_SITE_VERIFICATION preview
vercel env add GOOGLE_SITE_VERIFICATION production
```

## Google Analytics + Search Console

After setting the env vars and deploying:

1. Open your site and confirm requests are sent to `https://www.googletagmanager.com/gtag/js`.
2. In GA4 Realtime, confirm a page view appears when loading `/` and when navigating between pages.
3. In Search Console, use the URL-prefix property for your production URL and click Verify (meta-tag method).

## Deployments

Frontend (Vercel):

```bash
vercel
vercel --prod
```

## Production Verification Checklist

After deploy, verify one full flow on both Preview and Production:

1. Open `/analyze`, upload a file, click Continue.
2. Confirm network calls return 200 for:
   - `POST /api/upload-url`
   - `PUT <signed S3 uploadUrl>`
   - `POST /api/precheck`
   - `POST /api/checkout`
   - `POST /api/checkout/verify` (via `/analyze/complete`)
3. Confirm redirect to `/result/{id}` succeeds and renders summary content.
4. If anything fails, check the on-screen error detail (status + backend message) and Vercel function logs:

```bash
vercel logs <deployment-url>
```

## Automated Smoke Test (Funnel)

A scheduled GitHub Actions workflow runs `scripts/smoke-funnel.mjs` every 6 hours:
- `.github/workflows/smoke-funnel.yml`

What it verifies against your deployed frontend URL:
1. `GET /analyze` returns success.
2. `POST /api/upload-url` returns `uploadUrl` + `objectKey`.
3. `PUT uploadUrl` uploads a tiny PDF directly to S3.
4. `POST /api/precheck` validates file type/readability and returns `precheckToken`.
5. `POST /api/checkout` returns Stripe checkout session fields.
6. `POST /api/checkout/verify` returns expected unpaid status (`409`) or a valid paid result (`200`).
   - On `200`, response now includes `resultId` and `accessKey`.

Set repository variable:
- `SMOKE_BASE_URL` (for example `https://www.plainterms.us`)

Run locally:

```bash
SMOKE_BASE_URL=https://www.plainterms.us npm run smoke:funnel
```

## Funnel Metrics

The frontend emits funnel events to `POST /api/metrics` so you can monitor conversion drop-offs:
1. `upload_start` (user submitted a file on `/analyze`)
2. `checkout_start` (frontend started checkout request)
3. `checkout_success` (checkout verify succeeded on `/analyze/complete`)
4. `result_viewed` (user reached successful `/result/{id}` render)

Metrics are logged as structured JSON with `event: "funnel.metric"` in Vercel function logs.

Suggested quick check after deploy:
1. Open Vercel logs for your deployment.
2. Filter for `funnel.metric`.
3. Compare counts by metric event to identify drop-off points.

Backend (AWS SAM, from `services/api/plainterms-api`):

```bash
sam build
sam deploy --guided
```

Stripe checkout configuration (SAM parameters -> Lambda env):
- `StripeMode` (`live` or `sandbox`)
- `StripeSecretKeyParamName` (SSM secure string for Stripe secret key)
- `StripeTestSecretKeyParamName` (SSM secure string for Stripe sandbox/test secret key)
- `StripeReportPriceIdParamName` (SSM string for `Report ($79)` price ID)
- `StripeScanPriceIdParamName` (SSM string for `Core ($29)` price ID)
- `StripeProtectPriceIdParamName` (SSM string for `Protect ($149)` price ID)
- `StripeAddonRewritePriceIdParamName` (SSM string for `Rewrite Contract` add-on price ID)
- `StripeAddonUpdateEmailPriceIdParamName` (SSM string for `Create Update Email` add-on price ID)
- `StripeTestReportPriceIdParamName` (SSM string for Stripe sandbox/test report price ID)
- `StripeTestScanPriceIdParamName` (SSM string for Stripe sandbox/test scan price ID)
- `StripeTestProtectPriceIdParamName` (SSM string for Stripe sandbox/test protect price ID)
- `StripeTestAddonRewritePriceIdParamName` (SSM string for Stripe sandbox/test rewrite add-on price ID)
- `StripeTestAddonUpdateEmailPriceIdParamName` (SSM string for Stripe sandbox/test update-email add-on price ID)
- `StripePriceIdParamName` (legacy fallback; also defaults to report price path)
- `AppBaseUrl` (for example `https://www.plainterms.us`)
- `AppSecondaryBaseUrl` (for example `https://plainterms.us`)
- `PrecheckTokenSecretParamName` (SSM secure string for precheck token signing)
- Security controls (from SAM parameters):
  - `ApiDefaultRateLimit` / `ApiDefaultBurstLimit` for stage-level throttling
  - `EnableApiWaf` (`false` by default to reduce cost, set `true` to re-enable WAF)
  - `WafGlobalIpLimitPer5Min` for WAF IP-based blocks (used when WAF is enabled)
  - `ApiRequestCountAlarmThreshold`, `Api4xxAlarmThreshold`, `Api5xxAlarmThreshold`
  - `ApiAlarmPeriodSeconds`, `ApiAlarmEvaluationPeriods`
  - `ApiAlarmSnsTopicArn` (optional SNS alerts target; leave empty to disable notifications)
- LLM analysis (optional, via AWS SSM + Lambda env):
  - `ANALYSIS_MODE` (from SAM parameter `AnalysisMode`) = `rules` (default) or `llm`
  - `LLM_BASE_URL` (default `https://api.openai.com/v1`)
  - `LLM_MODEL` (from SAM parameter `LlmModel`; default `gpt-4o-mini`; supported: `gpt-4o-mini`, `gpt-5-mini`, `gpt-5`, `gpt-5.2`)
  - `LLM_API_KEY_PARAM` (default SSM parameter: `/plainterms/llm/api-key`)

Enable LLM analysis (AWS):

```bash
aws ssm put-parameter \
  --name /plainterms/llm/api-key \
  --type SecureString \
  --overwrite \
  --value "<YOUR_LLM_API_KEY>"
```

Clean switch examples:

From the repository root, use the npm shortcuts for routine Stripe mode switches:

```bash
# Switch checkout to Stripe sandbox/test mode.
npm run stripe:sandbox

# Switch checkout back to Stripe live mode.
npm run stripe:live

# Build the SAM backend first, then switch modes.
npm run stripe:sandbox:build
npm run stripe:live:build
```

These commands reuse `services/api/plainterms-api/samconfig.toml`, swap only `StripeMode`, and run `sam deploy`. SAM will show a CloudFormation changeset and ask for confirmation before updating AWS.

Manual SAM commands:

```bash
cd services/api/plainterms-api
sam build

# Live Stripe mode (all tiers enabled)
sam deploy --parameter-overrides AppBaseUrl=https://www.plainterms.us AppSecondaryBaseUrl=https://plainterms.us StripeMode=live AnalysisMode=rules LlmModel=gpt-4o-mini

# LLM mode with GPT-5.2
sam deploy --parameter-overrides AppBaseUrl=https://www.plainterms.us AppSecondaryBaseUrl=https://plainterms.us StripeMode=live AnalysisMode=llm LlmModel=gpt-5.2

# Sandbox Stripe mode (uses StripeTest* parameter names)
sam deploy --parameter-overrides AppBaseUrl=https://www.plainterms.us AppSecondaryBaseUrl=https://plainterms.us StripeMode=sandbox AnalysisMode=rules LlmModel=gpt-4o-mini

# Re-enable WAF later (optional) and wire alarm notifications
sam deploy --parameter-overrides AppBaseUrl=https://www.plainterms.us AppSecondaryBaseUrl=https://plainterms.us StripeMode=live AnalysisMode=rules LlmModel=gpt-4o-mini EnableApiWaf=true WafGlobalIpLimitPer5Min=1500 ApiAlarmSnsTopicArn=arn:aws:sns:us-west-2:123456789012:plainterms-alarms
```

Stripe sandbox quick switch checklist:
1. Store sandbox/test Stripe values in SSM:
```bash
aws ssm put-parameter --name /plainterms/stripe/test/secret-key --type SecureString --overwrite --value "<STRIPE_SK_TEST...>"
aws ssm put-parameter --name /plainterms/stripe/test/price-id-report --type String --overwrite --value "price_test_report"
aws ssm put-parameter --name /plainterms/stripe/test/price-id-scan --type String --overwrite --value "price_test_scan"
aws ssm put-parameter --name /plainterms/stripe/test/price-id-protect --type String --overwrite --value "price_test_protect"
aws ssm put-parameter --name /plainterms/stripe/test/price-id-addon-rewrite --type String --overwrite --value "price_test_rewrite"
aws ssm put-parameter --name /plainterms/stripe/test/price-id-addon-update-email --type String --overwrite --value "price_test_update_email"
```
2. Deploy with `StripeMode=sandbox`.
3. Switch back to `StripeMode=live` when ready for real charges.

Quick UI switch for testing:
- On `/analyze`, use the `Testing controls` card to choose:
  - `Rules (no LLM)`
  - `LLM` + model (`gpt-4o-mini`, `gpt-5-mini`, `gpt-5`, `gpt-5.2`)
- The selection is stored in browser local storage and attached to checkout metadata, so each checkout run can use a different model without redeploying.

If your stack was originally created with guided prompts, update `samconfig.toml` so
`parameter_overrides` includes:

```toml
parameter_overrides = "AppBaseUrl=https://www.plainterms.us AppSecondaryBaseUrl=https://plainterms.us StripeMode=live AnalysisMode=rules LlmModel=gpt-4o-mini EnableApiWaf=false ApiDefaultRateLimit=5 ApiDefaultBurstLimit=10"
```

Backend retention behavior:
- DynamoDB TTL is enabled on attribute `expires_at`.
- `VerifyCheckoutFunction` writes `expires_at` using `RESULT_TTL_DAYS` (default `30`).
- `GetResultFunction` returns `410 expired` once a result passes its TTL window.

## AWS Setup Notes

- AWS account uses IAM user credentials (no root access keys).
- Billing alerts are enabled.
- Credentials were verified with `aws sts get-caller-identity`.
- SAM deployment created Lambda, API Gateway, and IAM resources successfully.

## Current Backend Endpoints

- `POST /upload-url` -> create S3 presigned upload URL
- `POST /precheck` -> validate file type/size/readability and issue `precheckToken`
- `POST /checkout` -> create Stripe Checkout session
- `POST /checkout/verify` -> verify paid session and create/reuse result; returns `resultId` + `accessKey`
- `GET /result/{id}?k=<accessKey>` -> return result, `202` processing, or `410` expired

## TODO

- Implement pricing A/B split test:
  - Assign persistent variant (`A` or `B`) with cookie (50/50)
  - Render different pricing sets on `/` based on variant
  - Include `variant` in funnel metrics events (`pricing_view`, `checkout_start`, `checkout_success`)
  - Pass `variant` through checkout request and Stripe metadata
  - Compare variants by revenue per visitor, conversion rate, and refunds before choosing winner
