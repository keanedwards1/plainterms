import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const headingFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://plainterms.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PlainTerms",
    template: "%s | PlainTerms",
  },
  description:
    "Understand any contract before you sign. Plain-English risk analysis for creators.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PlainTerms",
    title: "PlainTerms",
    description:
      "Understand any contract before you sign. Plain-English risk analysis for creators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms",
    description:
      "Understand any contract before you sign. Plain-English risk analysis for creators.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable} pt-body antialiased`}>
        <nav className="sticky top-0 z-50 border-b border-[var(--pt-border)] bg-[var(--pt-bg)]/84 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--pt-accent)] shadow-sm shadow-black/10">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 0.5L11.5 6L6 11.5L0.5 6L6 0.5Z" fill="#FFFDF7" />
                </svg>
              </span>
              <span style={{ fontFamily: "var(--font-heading), Georgia, serif" }} className="text-[1.45rem] font-semibold tracking-tight text-[var(--pt-ink)]">
                PlainTerms
              </span>
            </Link>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link
                href="/analyze"
                className="pt-btn-primary rounded-full px-5 py-2 text-sm font-semibold"
              >
                Analyze Contract
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
