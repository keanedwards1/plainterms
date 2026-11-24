# PlainTerms

PlainTerms turns dense contracts into clear, useful explanations. Upload a contract, review its key terms in plain English, and understand what deserves attention before you sign.

The project is built with Next.js and TypeScript. Its analysis and checkout services run on AWS through an AWS SAM serverless stack.

## Motivation

Contracts are written for precision, but that precision often makes them difficult to read. PlainTerms is designed to make important obligations, risks, deadlines, and next steps easier to understand without forcing people to decode legal language first.

PlainTerms is an informational tool, not a law firm or a substitute for advice from a qualified attorney.

## Quick Start

### Requirements

- Node.js 20 or newer
- npm
- Access to the backend API for end-to-end analysis flows

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For local API-backed flows, create `.env.local` with the backend URL:

```bash
API_BASE_URL=https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod
```

Additional optional environment variables are listed in [Environment variables](#environment-variables).

## Usage

### Analyze a contract

1. Open `/analyze`.
2. Upload a supported contract file.
3. Continue through checkout when prompted.
4. Review the generated result at `/result/<id>`.

### Useful commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run build     # Create a production build
npm run start     # Serve the production build locally
```

### Environment variables

The frontend supports these variables:

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Backend API Gateway base URL. |
| `NEXT_PUBLIC_RESULT_RETENTION_DAYS` | Retention period shown in the UI. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional Google Analytics 4 measurement ID. |
| `NEXT_PUBLIC_SITE_URL` | Optional production site URL used for trusted-origin checks. |
| `METRICS_ALLOWED_ORIGINS` | Optional comma-separated metrics origins. |
| `GOOGLE_SITE_VERIFICATION` | Optional Search Console verification token. |
| `CONSTRUCTION_PASSWORD` | Optional temporary password for the construction gate. |

Do not commit secrets or `.env.local` files. Vercel deployments should receive their environment variables through Vercel project settings.

### Project structure

```text
src/                         Next.js application
services/api/plainterms-api/ AWS SAM backend
schemas/                     Shared schemas and examples
scripts/                     Deployment and smoke-test utilities
```

### Deployment

The frontend can be deployed with Vercel:

```bash
vercel
vercel --prod
```

Build and deploy the AWS backend from `services/api/plainterms-api`:

```bash
sam build
sam deploy --guided
```

Before deploying, configure the required AWS, Stripe, and application environment values for your deployment. The repository also includes a funnel smoke test:

```bash
SMOKE_BASE_URL=https://www.example.com npm run smoke:funnel
```

## Contributing

Contributions are welcome. A typical workflow is:

1. Create a focused branch from the default branch.
2. Make the smallest change that addresses the issue.
3. Run `npm run lint` and `npm run build` before opening a pull request.
4. Describe the user impact, implementation details, and verification steps in the pull request.

Please avoid committing credentials, generated build output, private product notes, or other root-level Markdown files. Keep user-facing documentation in this README and place internal working notes outside the repository.

## License

No open-source license has been declared yet. Until a license is added, all rights are reserved.
