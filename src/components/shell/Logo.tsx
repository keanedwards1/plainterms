import Link from "next/link";

/** The PlainTerms mark: two overlapping rounded squares in a frame, the overlap knocked out. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 307 307" aria-hidden="true" className={className}>
      <rect x="5" y="5" width="297" height="297" fill="none" stroke="currentColor" strokeWidth="10" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M39,17H193A22,22 0 0 1 215,39V185A22,22 0 0 1 193,207H39A22,22 0 0 1 17,185V39A22,22 0 0 1 39,17ZM114,92H265A22,22 0 0 1 287,114V265A22,22 0 0 1 265,287H114A22,22 0 0 1 92,265V114A22,22 0 0 1 114,92Z"
      />
    </svg>
  );
}

export default function Logo({ withWord = true, className = "" }: { withWord?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="PlainTerms home" className={`inline-flex items-center gap-2.5 text-(--pt-ink) ${className}`}>
      <LogoMark className="h-7 w-7 text-(--pt-accent)" />
      {withWord ? <span className="font-heading text-xl font-semibold tracking-[-0.03em]">PlainTerms</span> : null}
    </Link>
  );
}
