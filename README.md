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

Quick Vercel CLI setup:

```bash
vercel env add API_BASE_URL preview
vercel env add API_BASE_URL production
```

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
   - `POST /api/upload-file`
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
3. `POST /api/upload-file` uploads a tiny PDF to S3.
4. `POST /api/precheck` validates file type/readability and returns `precheckToken`.
5. `POST /api/checkout` returns Stripe checkout session fields.
6. `POST /api/checkout/verify` returns expected unpaid status (`409`) or a valid paid result (`200`).

Set repository variable:
- `SMOKE_BASE_URL` (for example `https://plainterms.vercel.app`)

Run locally:

```bash
SMOKE_BASE_URL=https://plainterms.vercel.app npm run smoke:funnel
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
- `StripeSecretKeyParamName` (SSM secure string for Stripe secret key)
- `StripeReportPriceIdParamName` (SSM string for `Report ($69)` price ID)
- `StripeScanPriceIdParamName` (SSM string for `Scan ($39)` price ID)
- `StripeProtectPriceIdParamName` (SSM string for `Protect ($99)` price ID)
- `StripePriceIdParamName` (legacy fallback; also defaults to report price path)
- `AppBaseUrl` (for example `https://plainterms.vercel.app`)
- `PrecheckTokenSecretParamName` (SSM secure string for precheck token signing)
- Security controls (from SAM parameters):
  - `ApiDefaultRateLimit` / `ApiDefaultBurstLimit` for stage-level throttling
  - `WafGlobalIpLimitPer5Min` for WAF IP-based blocks
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

```bash
cd services/api/plainterms-api
sam build

# Rules mode (current default behavior)
sam deploy --parameter-overrides AppBaseUrl=https://plainterms.vercel.app AnalysisMode=rules LlmModel=gpt-4o-mini

# LLM mode with GPT-5.2
sam deploy --parameter-overrides AppBaseUrl=https://plainterms.vercel.app AnalysisMode=llm LlmModel=gpt-5.2
```

Quick UI switch for testing:
- On `/analyze`, use the `Testing controls` card to choose:
  - `Rules (no LLM)`
  - `LLM` + model (`gpt-4o-mini`, `gpt-5-mini`, `gpt-5`, `gpt-5.2`)
- The selection is stored in browser local storage and attached to checkout metadata, so each checkout run can use a different model without redeploying.

If your stack was originally created with guided prompts, update `samconfig.toml` so
`parameter_overrides` includes:

```toml
parameter_overrides = "AppBaseUrl=https://plainterms.vercel.app AnalysisMode=rules LlmModel=gpt-4o-mini"
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
- `POST /checkout/verify` -> verify paid session and create/reuse result
- `GET /result/{id}` -> return result, `202` processing, or `410` expired
