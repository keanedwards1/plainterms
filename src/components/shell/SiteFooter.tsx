import Link from "next/link";
import Stipple from "@/components/art/Stipple";
import Logo from "@/components/shell/Logo";

const COLUMNS = [
  {
    title: "Tools",
    links: [
      { href: "/new", label: "Review a contract" },
      { href: "/tools/explain-a-letter", label: "Explain a letter" },
      { href: "/tools/compare-versions", label: "Compare versions" },
      { href: "/tools/write-a-letter", label: "Write a letter" },
      { href: "/tools/check-a-contractor", label: "Check a contractor" },
      { href: "/emails", label: "Emails" },
    ],
  },
  {
    title: "Templates",
    links: [
      { href: "/templates#change-order", label: "Change order" },
      { href: "/templates#lien-waiver", label: "Lien waivers" },
      { href: "/templates#demand-letter", label: "Demand letter" },
      { href: "/templates#lease-addendum", label: "Lease addendum" },
      { href: "/templates", label: "All templates" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/documents", label: "Your documents" },
      { href: "/deadlines", label: "Dates" },
      { href: "/dashboard/billing", label: "Plan and billing" },
      { href: "/dashboard/settings", label: "Settings" },
    ],
  },
  {
    title: "PlainTerms",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="pt-page-pad mt-24">
      <div className="pt-container-wide">
        <div className="relative isolate flex min-h-[18rem] items-end justify-center overflow-hidden sm:min-h-[22rem]">
          <Stipple kind="glow" ink="#F09A6A" className="absolute inset-0 -z-10 h-full w-full [image-rendering:pixelated]" />
          <p aria-hidden="true" className="font-heading pb-2 text-[clamp(3.75rem,12vw,12.5rem)] font-semibold leading-[0.8] tracking-[-0.065em] text-(--pt-ink)">
            PlainTerms
          </p>
        </div>
        <div className="grid gap-10 border-t border-(--pt-line) pt-10 md:grid-cols-[1fr_2.4fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-6 text-(--pt-muted)">Contracts, leases and letters, explained in plain English.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="font-sans text-sm font-semibold tracking-normal">{column.title}</h2>
                <ul className="mt-3 grid gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-[0.9375rem] text-(--pt-muted) transition-colors hover:text-(--pt-ink)">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="mt-10 pb-10 text-sm text-(--pt-muted)">
          PlainTerms explains documents. It isn&apos;t a law firm and doesn&apos;t give legal advice. © {new Date().getFullYear()} PlainTerms
        </p>
      </div>
    </footer>
  );
}
