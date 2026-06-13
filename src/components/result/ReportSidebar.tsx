"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import {
  riskLabelClass,
  riskMeterClass,
  recommendationToneClass,
  type RiskTone,
} from "@/lib/reportStyles";

export type SidebarTab = {
  key: string;
  label: string;
  icon: string;
  count?: number | "all";
  loading?: boolean;
};

export type SidebarRecommendation = {
  label: string;
  reason: ReactNode;
  tone: RiskTone;
};

type ReportSidebarProps = {
  title?: string;
  tabs: SidebarTab[];
  activeKey: string;
  onSelectTab: (key: string) => void;
  risk?: { score: number; label: RiskTone };
  recommendation?: SidebarRecommendation;
  footer?: ReactNode;
  tabAriaLabel?: (label: string) => string;
};

export default function ReportSidebar({
  title = "At A Glance",
  tabs,
  activeKey,
  onSelectTab,
  risk,
  recommendation,
  footer,
  tabAriaLabel,
}: ReportSidebarProps) {
  return (
    <aside className="pt-card p-4">
      <h2 className="text-xl text-[var(--pt-ink)]">{title}</h2>

      <nav aria-label="Result sections" className="mt-3 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
              activeKey === tab.key
                ? "border-[#de8f79] bg-[#ffe5dc] text-[#5a2f25] shadow-[inset_0_0_0_1px_rgba(222,143,121,0.15)]"
                : "border-[var(--pt-border)] bg-[var(--pt-surface)] text-[var(--pt-muted)] hover:border-[#de8f79] hover:text-[var(--pt-ink)]"
            }`}
            aria-label={tabAriaLabel ? tabAriaLabel(tab.label) : undefined}
          >
            <span className="flex items-center gap-2">
              <Image src={tab.icon} alt="" width={16} height={16} className="h-4 w-4" />
              <span>{tab.label}</span>
            </span>
            {tab.loading ? (
              <span
                className="inline-flex h-5 w-8 items-center justify-center rounded-full border border-[var(--pt-border)] bg-[var(--pt-surface)]"
                aria-label="Loading"
              >
                <span className="pt-tab-loader" />
              </span>
            ) : tab.count !== undefined ? (
              <span className="pt-pill !px-2 !py-0.5 !text-[10px]">
                {tab.count === "all" ? "All" : tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-3">
        {risk ? (
          <div className="pt-card-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Risk</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskLabelClass(risk.label)}`}>
                {risk.label.toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-[var(--pt-ink)]">{risk.score}/100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
              <div
                className={`h-full rounded-full ${riskMeterClass(risk.label)}`}
                style={{ width: `${Math.max(risk.score, 6)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="pt-card-soft relative overflow-hidden p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Risk</p>
            <div className="pointer-events-none mt-2 select-none blur-[3px]">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-[#e6d8c3] bg-[#fef3e2] px-2.5 py-1 text-[11px] font-semibold text-[#8c6526]">
                  ——
                </span>
                <span className="text-sm font-semibold text-[var(--pt-ink)]">—/100</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6d8c3]">
                <div className="h-full w-1/2 rounded-full bg-[#d4a05a]" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-[var(--pt-border)] bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--pt-muted)] backdrop-blur">
                Locked
              </span>
            </div>
          </div>
        )}

        {recommendation ? (
          <div className="pt-card-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Recommendation</p>
            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${recommendationToneClass(
                recommendation.tone
              )}`}
            >
              {recommendation.label}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-[var(--pt-ink)]/85">{recommendation.reason}</p>
          </div>
        ) : (
          <div className="pt-card-soft relative overflow-hidden p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pt-muted)]">Recommendation</p>
            <div className="pointer-events-none mt-2 select-none space-y-2 blur-[3px]">
              <div className="h-5 w-32 rounded-full bg-[#e6d8c3]" />
              <div className="h-3 w-full rounded bg-[#ede6db]" />
              <div className="h-3 w-4/5 rounded bg-[#ede6db]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-[var(--pt-border)] bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--pt-muted)] backdrop-blur">
                Locked
              </span>
            </div>
          </div>
        )}
      </div>

      {footer ?? null}
    </aside>
  );
}
