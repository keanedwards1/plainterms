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
        <nav className="sticky top-0 z-50 border-b border-[var(--pt-border)] bg-[#eaf2fc]/94 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-12">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-[2.1rem] leading-none tracking-tight text-[var(--pt-ink)] md:text-[2.35rem]">
                <span className="font-bold">Plain</span>
                <span className="font-medium text-[var(--pt-accent)]">Terms</span>
              </span>
            </Link>

            <div className="hidden items-center gap-10 text-sm md:flex">
              <Link href="/how-it-works" className="pt-nav-link">
                How It Works
              </Link>
              <Link href="/pricing" className="pt-nav-link">
                Pricing
              </Link>
              <Link href="/faq" className="pt-nav-link">
                FAQ
              </Link>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/analyze" className="pt-btn-primary rounded-lg px-6 py-2 text-sm font-semibold">
                Sign In
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
