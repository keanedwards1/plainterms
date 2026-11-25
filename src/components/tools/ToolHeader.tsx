import { ToolIcon } from "@/components/home/ToolRow";

export function SoonChip() {
  return <span className="pt-pill bg-(--pt-butter)/60 text-(--pt-ink)">Opening soon</span>;
}

/** Page head for a tool: its drawn icon, a label, the title and one line on what it does. */
export default function ToolHeader({
  icon,
  label,
  title,
  line,
  soon = false,
}: {
  icon: string;
  label: string;
  title: string;
  line: string;
  soon?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-4 pb-8 pt-6 sm:pt-10">
      <ToolIcon name={icon} className="[&_.illu]:h-20 [&_.illu]:w-20 [&_.illu]:drop-shadow-[0_8px_10px_rgb(21_50_44/0.18)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="pt-label">{label}</p>
          {soon ? <SoonChip /> : null}
        </div>
        <h1 className="mt-2 text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">{title}</h1>
        <p className="mt-3 max-w-[60ch] text-lg text-(--pt-muted)">{line}</p>
      </div>
    </header>
  );
}

export function ExampleLabel({ children = "Example" }: { children?: React.ReactNode }) {
  return (
    <div className="mb-4 mt-12 flex items-center gap-3">
      <p className="pt-label">{children}</p>
      <span className="h-px flex-1 bg-(--pt-line)" />
    </div>
  );
}

export function DisabledDrop({ prompt, action }: { prompt: string; action: string }) {
  return (
    <div className="pt-framed flex min-h-16 flex-wrap items-center gap-3.5 bg-white py-2 pl-5 pr-2">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-(--pt-muted)" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <span className="min-w-0 flex-1 text-[1.0625rem] text-(--pt-muted)">{prompt}</span>
      <button type="button" disabled className="pt-btn pt-btn-solid h-11 rounded-[3px] px-5 text-[0.9375rem]">
        {action}
      </button>
    </div>
  );
}
