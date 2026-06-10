"use client";

import { useState } from "react";
import Image from "next/image";
import { getOrCreateFunnelId, trackFunnelMetric } from "@/lib/funnelMetrics";
import { REPORT_TIER_PRICES } from "@/lib/pricingOptions";

type PreviewUnlockPanelProps = {
  resultId: string;
  previewAccessKey: string;
  canceled?: boolean;
};

type CheckoutResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
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
}: PreviewUnlockPanelProps) {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
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
          reportTier: "report_69",
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
    }
  }

  return (
    <aside className="rounded-lg border border-[#e9d3b0] bg-[#fff8ef] p-4 shadow-[0_14px_26px_-24px_var(--pt-shadow)]">
      <div className="flex items-start gap-3">
        <Image
          src="/graphics/icon-shield.svg"
          alt=""
          width={42}
          height={42}
          className="h-10 w-10 shrink-0 rounded-lg border border-[#e9d3b0] bg-white p-2"
        />
        <div>
          <p className="text-sm font-semibold text-[#6e4f1e]">Unlock the actual report</p>
          <p className="mt-1 text-sm leading-6 text-[#6e4f1e]">
            See every red flag, clause explanation, suggested rewrites, and the negotiation email draft.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={startCheckout}
        disabled={isStartingCheckout}
        className="pt-btn-primary mt-4 w-full justify-center px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStartingCheckout ? "Opening checkout..." : `Unlock Report ${REPORT_TIER_PRICES.report_69}`}
      </button>

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
    </aside>
  );
}
