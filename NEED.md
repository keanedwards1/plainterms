# What I need from you

Phase 1 code is on the `app-first-accounts` branch. To run it end to end, it needs the items below. Each is marked **Blocking** (it won't work without this) or **Review** (it works, but you should confirm my choice).

Never put keys or secrets in this file or in git. They go in `.env.local`, Vercel settings or AWS SSM, as described below.

---

## 1. Where to deploy the backend — Blocking, needs a decision

`npm run stripe:sandbox:build` redeploys the **production** stack (`samconfig.toml` has one stack). If it ran with `StripeMode=sandbox`, real customers' checkouts would switch to Stripe test mode. I didn't deploy anything.

Pick one:
- [ ] **A. Add a staging stack (recommended).** I'd add a `staging` environment to `samconfig.toml` and parameterize the three hard-coded table names (`PlainTermsResults`, `PlainTermsFeedback`, `PlainTermsTestimonials`) so two stacks can coexist. Then everything gets tested in sandbox without touching production. Tell me to go ahead.
- [ ] **B. Deploy to production after you merge.** The changes add to what's there: new tables, new functions and one new index on the results table. Old links and the one-off checkout keep working. You'd test with real sign-ins on the live site.

## 2. WorkOS (sign-in) — Blocking

1. [x] Create a WorkOS account and an AuthKit application. Staging is done and sign-in/out works locally.
2. [ ] Check that **Authentication** has Google, Microsoft, Apple and Magic Auth (email link).
3. [x] In **Redirects**, add (localhost done; add the production and preview URLs later):
   - Redirect URIs: `http://localhost:3000/callback` and `https://www.plainterms.us/callback`, plus your Vercel preview domain + `/callback` if you test on previews.
   - Sign-out redirect: `https://www.plainterms.us/` (and `http://localhost:3000/`).
4. [x] `.env.local` done. [ ] Still needed in Vercel (Preview + Production):
   ```
   WORKOS_CLIENT_ID=client_...
   WORKOS_API_KEY=sk_...
   WORKOS_COOKIE_PASSWORD=<run: openssl rand -base64 32>
   NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback   # production: https://www.plainterms.us/callback
   ```
5. [ ] Add the same client ID to the backend. In `services/api/plainterms-api/samconfig.toml`, append `WorkosClientId=\"client_...\"` inside `parameter_overrides`.

Until this is done, the site works signed out (upload, sample report, how it works), and pressing **Analyze** shows "Sign-in is unavailable right now."

## 3. Stripe (Pro subscription) — Blocking for upgrades

Do these in **sandbox** first, then repeat in **live**.
1. [ ] Create a product **PlainTerms Pro** with a **recurring monthly** price ($5, as you said).
2. [ ] Save the price ID in AWS SSM (String):
   ```
   aws ssm put-parameter --name /plainterms/stripe/test/price-id-pro --type String --value price_...
   aws ssm put-parameter --name /plainterms/stripe/price-id-pro      --type String --value price_...   # live
   ```
3. [ ] After the backend is deployed, add a webhook endpoint at `<ApiUrl>/billing/webhook`. `ApiUrl` is printed by the deploy. Choose these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Save its signing secret:
   ```
   aws ssm put-parameter --name /plainterms/stripe/test/webhook-secret --type SecureString --value whsec_...
   aws ssm put-parameter --name /plainterms/stripe/webhook-secret      --type SecureString --value whsec_...   # live
   ```
4. [ ] In Stripe **Settings → Billing → Customer portal**, turn on: update payment method, view invoices, cancel subscription.
5. [ ] Optional: set `NEXT_PUBLIC_PRO_PRICE_LABEL` in Vercel if the price isn't `$5/month`. Every price mention in the UI uses it.

## 4. Choices I made for you — Review

- [ ] **Design.** The plan said I'd show you three home page directions first. You asked me to work uninterrupted, so I built one, keeping your current brand (cream, coral, the Fraunces headings). The first screen is the upload box beside a "What you'll get" example of a real result. Look at `/`, `/result/...`, `/dashboard` and `/sample-report`, and tell me anything you'd change.
- [ ] **Free monthly limit: 30 documents.** Pro has a safety cap of 300. These are the `FreeMonthlyDocLimit` and `ProMonthlyDocLimit` template parameters. The UI never mentions the limit until someone reaches it.
- [ ] **AI models.** Free uses `gpt-5-mini` and Pro uses `gpt-5.5`, set by the `FreeLlmModel` and `ProLlmModel` parameters. Before this, free previews used the rules engine only, so **free users now cost OpenAI money on every document**. The rules engine still gives the instant first read.
- [ ] **"Try a sample"** fills the paste box with a sample contract. Analyzing it still asks for sign-in, so the result is real. The no-sign-in look is the **Example report** page (`/sample-report`).
- [ ] **Privacy policy and terms** are rewritten for accounts, the 30-day/Pro retention and monthly billing. **Have a lawyer read them** before launch.

## 5. What I couldn't verify without the above

- Signing in, the sign-in → analyze → result flow, upgrading, the webhook, cancelling, deleting an account, and the limit message. The code and unit tests are done (`services/api/plainterms-api/lambdas`: `npm test`, 54 passing), but these need WorkOS, Stripe and a deployed backend.
- Lighthouse **performance** must be measured on a Vercel preview, not the dev server. Accessibility scored 100 on `/` and `/sample-report` locally.
- `npm run lint` still reports 4 errors that were already there, in `CookieConsent.tsx` and `opengraph-image.tsx`. I didn't touch those files.
