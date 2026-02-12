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
- Local upload -> analyze -> result flow is working.

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
# Optional fallback for legacy code paths:
# NEXT_PUBLIC_API_BASE_URL=https://kmg693wwdj.execute-api.us-west-2.amazonaws.com/Prod
```

Set this in:
- `.env.local` for local development
- Vercel project environment variables for `Preview` and `Production`

`API_BASE_URL` is preferred because requests are proxied through Next.js API routes (avoids browser CORS issues).

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
   - `POST /api/analyze`
3. Confirm redirect to `/result/{id}` succeeds and renders summary content.
4. If anything fails, check the on-screen error detail (status + backend message) and Vercel function logs:

```bash
vercel logs <deployment-url>
```

Backend (AWS SAM, from `services/api/plainterms-api`):

```bash
sam build
sam deploy --guided
```

## AWS Setup Notes

- AWS account uses IAM user credentials (no root access keys).
- Billing alerts are enabled.
- Credentials were verified with `aws sts get-caller-identity`.
- SAM deployment created Lambda, API Gateway, and IAM resources successfully.

## Planned Backend API Upgrade

The current hello-world style backend is being replaced with a job-based flow for uploads, payment, and analysis.

Planned handlers:
- `POST /checkout` -> create Stripe checkout session for a job
- `POST /webhook/stripe` -> process Stripe webhook and mark job paid
- `POST /analyze` -> accept upload/start analysis job
- `GET /result/{id}` -> return structured analysis result

Planned AWS resources:
- DynamoDB table `PlainTermsJobs` for job state/results (`pk`, `status`, timestamps, result payload)
- S3 uploads bucket (`plainterms-uploads-*`) with lifecycle auto-delete (for example, 1 day retention)

Planned handler file layout under `services/api/plainterms-api`:

```bash
src/handlers/createCheckout.ts
src/handlers/stripeWebhook.ts
src/handlers/startAnalysis.ts
src/handlers/getResult.ts
src/lib/types.ts
```
