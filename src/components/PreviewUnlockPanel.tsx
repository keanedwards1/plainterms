"use client";

import { useState } from "react";
import Image from "next/image";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import {
  REPORT_TIER_DESCRIPTIONS,
  REPORT_TIER_NAMES,
  REPORT_TIER_PRICES,
  type ReportTierOption,
} from "@/lib/pricingOptions";

type PreviewUnlockPanelProps = {
  resultId: string;
  previewAccessKey: string;
  canceled?: boolean;
  redFlagCount: number;
  clauseCount: number;
};

type CheckoutResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
};

type FeaturePreview = {
  title: string;
  meta: string;
  detail: string;
  tiers: ReportTierOption[];
};

const TIER_ORDER: ReportTierOption[] = ["scan_39", "report_69", "protect_99"];

const TIER_FEATURES: Record<ReportTierOption, string[]> = {
  scan_39: ["Priority risk summary", "Top issue spotting", "Sign-or-negotiate guidance"],
  report_69: ["Full red-flag review", "Clause-by-clause breakdown", "Questions to ask"],
  protect_99: ["Rewrite options", "Negotiation plan", "Ready-to-send email draft"],
};

async function readErrorResponse(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof json.error === "string" && json.error.trim()) return json.error;
      if (typeof json.message === "string" && json.message.trim()) return json.message;
      return JSON.stringify(json).slice(0, 500);
    }

    const text = await res.text();
    if (text.trim()) return text.slice(0, 500);
  } catch {
    // Fall back below.
  }

  return res.statusText || "Unknown error";
}

export default function PreviewUnlockPanel({
  resultId,
  previewAccessKey,
  canceled,
  redFlagCount,
  clauseCount,
}: PreviewUnlockPanelProps) {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ReportTierOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<FeaturePreview | null>(null);

  const featurePreviews: FeaturePreview[] = [
    {
      title: "Red flag review",
      meta: `${redFlagCount} issue${redFlagCount === 1 ? "" : "s"} found`,
      detail: "Open the risk findings behind this score, with plain-English notes on what each issue changes for you.",
      tiers: ["scan_39", "report_69", "protect_99"],
    },
    {
      title: "Clause-by-clause analysis",
      meta: `${clauseCount} clause${clauseCount === 1 ? "" : "s"} checked`,
      detail: "See the contract terms broken down by area, including what is clear, unclear, or missing.",
      tiers: ["report_69", "protect_99"],
    },
    {
      title: "Document review",
      meta: "Source-backed review",
      detail: "Review the contract text alongside highlighted risk areas and suggested wording changes.",
      tiers: ["report_69", "protect_99"],
    },
    {
      title: "Negotiation prep",
      meta: "Plan and email draft",
      detail: "Turn the findings into a practical negotiation plan, fallback positions, and a draft email.",
      tiers: ["protect_99"],
    },
  ];

  async function startCheckout(reportTier: ReportTierOption) {
    setSelectedTier(reportTier);
    setIsStartingCheckout(true);
    setError(null);

    try {
      void trackFunnelMetric({
        event: "checkout_start",
        funnelId: getOrCreateFunnelId(),
        resultId,
      });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          previewResultId: resultId,
          previewAccessKey,
          reportTier,
        }),
      });

      if (!res.ok) {
        const detail = await readErrorResponse(res);
        throw new Error(`Checkout failed (${res.status}): ${detail}`);
      }

      const data = (await res.json()) as CheckoutResponse;
      if (!data.checkoutUrl) {
        throw new Error("Checkout succeeded but no checkout URL was returned.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      setError(detail);
      setIsStartingCheckout(false);
      setSelectedTier(null);
    }
  }

  return (
    <section className="space-y-4">
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-[var(--pt-border)] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(31,43,61,0.55)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--pt-ink)]">{toast.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--pt-muted)]">{toast.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {toast.tiers.map((tier) => (
              <button
                key={`toast-${tier}`}
                type="button"
                onClick={() => startCheckout(tier)}
                disabled={isStartingCheckout}
                className="rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--pt-ink)] hover:border-[var(--pt-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingCheckout && selectedTier === tier
                  ? "Opening..."
                  : `${REPORT_TIER_NAMES[tier]} ${REPORT_TIER_PRICES[tier]}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-4">
        <div className="flex items-start gap-3">
          <Image
            src="/graphics/icon-search.svg"
            alt=""
            width={42}
            height={42}
            className="h-10 w-10 shrink-0 rounded-lg border border-[var(--pt-border)] bg-white p-2"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--pt-ink)]">Explore the analysis</p>
            <p className="mt-1 text-sm leading-6 text-[var(--pt-muted)]">
              Tap a section to choose the review level that fits what you need to see.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {featurePreviews.map((feature) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => setToast(feature)}
              className="relative overflow-hidden rounded-lg border border-[var(--pt-border)] bg-white p-4 text-left transition-colors hover:border-[var(--pt-accent)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[#de8f79]" />
              <div className="flex items-center gap-3">
                <Image
                  src="/graphics/icon-doc.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md border border-[var(--pt-border)] bg-[var(--pt-surface-soft)] p-1"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--pt-ink)]">{feature.title}</p>
                  <p className="text-xs text-[var(--pt-muted)]">{feature.meta}</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-[var(--pt-accent)]">View</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#e9d3b0] bg-[#fff8ef] p-4 shadow-[0_14px_26px_-24px_var(--pt-shadow)]">
        <p className="text-sm font-semibold text-[#6e4f1e]">Choose your review</p>
        <div className="mt-3 grid gap-3">
          {TIER_ORDER.map((tier) => (
            <article
              key={tier}
              className="rounded-lg border border-[#e9d3b0] bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--pt-ink)]">
                    {REPORT_TIER_NAMES[tier]}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[var(--pt-muted)]">
                    {REPORT_TIER_DESCRIPTIONS[tier]}
                  </p>
                </div>
                <p className="text-xl font-semibold text-[var(--pt-ink)]">
                  {REPORT_TIER_PRICES[tier]}
                </p>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-[var(--pt-muted)]">
                {TIER_FEATURES[tier].map((item) => (
                  <li key={`${tier}-${item}`}>• {item}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => startCheckout(tier)}
                disabled={isStartingCheckout}
                className={`mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                  tier === "report_69" ? "pt-btn-primary" : "pt-btn-secondary"
                }`}
              >
                {isStartingCheckout && selectedTier === tier
                  ? "Opening checkout..."
                  : `Continue with ${REPORT_TIER_NAMES[tier]}`}
              </button>
            </article>
          ))}
        </div>
      </div>

      {canceled && !error ? (
        <p className="mt-3 rounded-md border border-[#ead3a1] bg-white px-3 py-2 text-xs text-[#6e4f1e]">
          Checkout was canceled. The preview is still here.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-[#efc1b6] bg-[#fff0ee] px-3 py-2 text-xs text-[#9e3f2d]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
