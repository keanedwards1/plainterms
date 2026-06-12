import Image from "next/image";

type QuickReadoutProps = {
  riskScore: number;
  recommendationLabel: string;
  flagsFound: number;
};

export default function QuickReadout({ riskScore, recommendationLabel, flagsFound }: QuickReadoutProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--pt-border)] bg-gradient-to-r from-[#fff4ef] via-[#fff9f6] to-[#fff2dc] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Image
          src="/graphics/icon-doc.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg border border-[var(--pt-border)] bg-white p-1.5"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--pt-ink)]">Quick Readout</p>
          <p className="text-xs text-[var(--pt-muted)]">Snapshot of outcome before digging into details.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-[#efc1b6] bg-[#ffe8e3] px-3 py-2">
          <p className="text-xs text-[#9e3f2d]">Risk score</p>
          <p className="text-xl font-semibold text-[#7f2e1f]">{riskScore}</p>
        </div>
        <div className="rounded-lg border border-[#ead3a1] bg-[#fff4df] px-3 py-2">
          <p className="text-xs text-[#8c6526]">Recommendation</p>
          <p className="text-sm font-semibold text-[#6e4f1e]">{recommendationLabel}</p>
        </div>
        <div className="rounded-lg border border-[#b2ddd4] bg-[#e1f4ef] px-3 py-2">
          <p className="text-xs text-[#1d655f]">Flags found</p>
          <p className="text-xl font-semibold text-[#154f4a]">{flagsFound}</p>
        </div>
      </div>
    </article>
  );
}
