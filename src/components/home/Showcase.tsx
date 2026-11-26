import Link from "next/link";
import ExampleReview from "@/components/home/ExampleReview";
import ExampleLetter from "@/components/tools/ExampleLetter";
import LetterWriter from "@/components/tools/LetterWriter";

function ScreenHead({
  id,
  label,
  title,
  meta,
  actions,
}: {
  id: string;
  label: string;
  title: string;
  meta: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div>
        <div className="flex items-center gap-2.5">
          <p className="pt-label">{label}</p>
          <span className="pt-pill">Example</span>
        </div>
        <h2 id={id} className="mt-1.5 text-[clamp(2rem,3.4vw,2.75rem)] leading-[1.05] tracking-[-0.045em]">
          {title}
        </h2>
        <p className="mt-1.5 text-(--pt-muted)">{meta}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">{actions}</div>
    </div>
  );
}

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4.5 w-4.5",
  "aria-hidden": true,
};

/** Three full tool screens under the templates: a contract review, a letter explained, a letter written. */
export default function Showcase() {
  return (
    <div className="grid gap-20">
      <section aria-labelledby="ex-review" className="border-t border-(--pt-line) pt-14">
        <ScreenHead
          id="ex-review"
          label="Contract review"
          title="Kitchen remodel contract"
          meta="Brightline Remodeling · 11 clauses"
          actions={
            <>
              <Link href="/tools/ask" className="pt-btn pt-btn-outline h-11 px-4 text-[0.9375rem]">
                <svg {...ICON}><path d="M4 5h16v11H9l-5 4z" /><path d="M10 9.5a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.2M12 14.5h.01" /></svg>
                Ask about it
              </Link>
              <Link href="/new" className="pt-btn pt-btn-solid h-11 px-4 text-[0.9375rem]">
                <svg {...ICON}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
                Review yours
              </Link>
            </>
          }
        />
        <ExampleReview />
      </section>

      <section aria-labelledby="ex-letter" className="border-t border-(--pt-line) pt-14">
        <ScreenHead
          id="ex-letter"
          label="Explain a letter"
          title="HOA fence notice"
          meta="Oakridge Homeowners Association · dated Nov 12"
          actions={
            <>
              <Link href="/deadlines" className="pt-btn pt-btn-outline h-11 px-4 text-[0.9375rem]">
                <svg {...ICON}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                On your calendar
              </Link>
              <Link href="/#write" className="pt-btn pt-btn-solid h-11 px-4 text-[0.9375rem]">
                <svg {...ICON}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
                Draft a reply
              </Link>
            </>
          }
        />
        <ExampleLetter />
      </section>

      <section id="write" aria-labelledby="ex-write" className="scroll-mt-24 border-t border-(--pt-line) pt-14">
        <div className="mb-6">
          <p className="pt-label">Write a letter</p>
          <h2 id="ex-write" className="mt-1.5 text-[clamp(2rem,3.4vw,2.75rem)] leading-[1.05] tracking-[-0.045em]">
            Put it in writing
          </h2>
          <p className="mt-1.5 text-(--pt-muted)">Fill in a few details and the letter writes itself. Copy it or print it.</p>
        </div>
        <LetterWriter />
      </section>
    </div>
  );
}
