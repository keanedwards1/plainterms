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
        <div className="rounded-lg border border-[#efc1b0] bg-[#fbe1d6] px-3 py-2">
          <p className="text-xs text-[#a63a1e]">Risk score</p>
          <p className="text-xl font-semibold text-[#8a2f17]">{riskScore}</p>
        </div>
        <div className="rounded-lg border border-[#ecd9a6] bg-[#f9ebc6] px-3 py-2">
          <p className="text-xs text-[#8a5a0b]">Recommendation</p>
          <p className="text-sm font-semibold text-[#6e4a08]">{recommendationLabel}</p>
        </div>
        <div className="rounded-lg border border-[#b9dcc1] bg-[#d9eddc] px-3 py-2">
          <p className="text-xs text-[#23604a]">Flags found</p>
          <p className="text-xl font-semibold text-[#15322c]">{flagsFound}</p>
        </div>
      </div>
    </article>
  );
}
