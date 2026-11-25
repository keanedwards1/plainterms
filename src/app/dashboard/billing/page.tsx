import { redirect } from "next/navigation";
import BillingActions from "@/components/dashboard/BillingActions";
import { getSession } from "@/lib/auth";
import { getAccount } from "@/lib/serverApi";

const PRO_PRICE_LABEL = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "$5/month";

const FREE_FEATURES = [
  "Full analysis in plain English",
  "Verdict, risk score, red flags and key terms",
  "Questions to ask and a negotiation email",
  "Documents kept for 30 days",
];

const PRO_FEATURES = [
  "Our most capable AI model",
  "Track changes and a clean revised draft",
  "Rewrite options and fallback positions",
  "Documents kept until you delete them",
];

function formatDate(epochSeconds: number | null) {
  if (!epochSeconds) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(epochSeconds * 1000)
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-(--pt-good)">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?returnTo=/dashboard/billing");
  const [{ upgraded }, account] = await Promise.all([searchParams, getAccount(session)]);

  if (!account) {
    return (
      <div>
        <h1 className="text-3xl text-(--pt-ink)">Plan &amp; billing</h1>
        <p role="alert" className="pt-alert-danger mt-5 px-4 py-3 text-sm">
          Your plan couldn&apos;t be loaded. Refresh to try again.
        </p>
      </div>
    );
  }

  const isPro = account.plan === "pro";
  const periodEnd = formatDate(account.subscription.currentPeriodEnd);
  const pastDue = account.subscription.status === "past_due";

  return (
    <div>
      <h1 className="text-3xl text-(--pt-ink)">Plan &amp; billing</h1>
      <p className="mt-1 text-(--pt-muted)">Manage your plan, payment method and invoices.</p>

      {upgraded === "1" ? (
        <p role="status" className="mt-5 rounded-(--pt-radius-pop) border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {isPro
            ? "Welcome to Pro. Your documents now open with every Pro feature."
            : "Thanks! Your payment is being confirmed. This page will show Pro within a minute. Refresh if it doesn't."}
        </p>
      ) : null}

      {pastDue ? (
        <p role="alert" className="pt-alert-warn mt-5 px-4 py-3 text-sm">
          Your last payment didn&apos;t go through. Update your payment method to keep Pro.
        </p>
      ) : null}

      <section aria-labelledby="current-plan" className="pt-panel mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--pt-muted)">Current plan</p>
            <h2 id="current-plan" className="mt-1 text-3xl text-(--pt-ink)">
              {isPro ? "Pro" : "Free"}
            </h2>
            <p className="mt-1 text-sm text-(--pt-muted)">
              {isPro
                ? account.subscription.cancelAtPeriodEnd && periodEnd
                  ? `Cancelled. You keep Pro until ${periodEnd} and won't be charged again.`
                  : periodEnd
                    ? `${PRO_PRICE_LABEL} · renews on ${periodEnd}`
                    : PRO_PRICE_LABEL
                : "Everything you need to understand a contract."}
            </p>
          </div>
          <BillingActions
            isPro={isPro}
            hasBillingAccount={account.subscription.hasBillingAccount}
            cancelAtPeriodEnd={account.subscription.cancelAtPeriodEnd}
            periodEndLabel={periodEnd}
          />
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section aria-labelledby="free-plan" className={`pt-panel p-5 ${!isPro ? "ring-2 ring-(--pt-line)" : ""}`}>
          <div className="flex items-baseline justify-between">
            <h2 id="free-plan" className="text-xl text-(--pt-ink)">Free</h2>
            <p className="text-lg font-semibold text-(--pt-ink)">$0</p>
          </div>
          <ul className="mt-4 space-y-2 text-[15px] text-(--pt-ink-soft)">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <Check />
                {feature}
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-labelledby="pro-plan"
          className={`pt-panel p-5 ${isPro ? "ring-2 ring-(--pt-action)" : "border-(--pt-action)"}`}
        >
          <div className="flex items-baseline justify-between">
            <h2 id="pro-plan" className="text-xl text-(--pt-ink)">Pro</h2>
            <p className="text-lg font-semibold text-(--pt-ink)">{PRO_PRICE_LABEL}</p>
          </div>
          <p className="mt-1 text-sm text-(--pt-muted)">Everything in Free, plus:</p>
          <ul className="mt-3 space-y-2 text-[15px] text-(--pt-ink-soft)">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <Check />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
