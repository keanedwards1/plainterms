import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
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
    "Calm, plain-English explanations for independent contractor and services agreements.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PlainTerms",
    title: "PlainTerms",
    description:
      "Calm, plain-English explanations for independent contractor and services agreements.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms",
    description:
      "Calm, plain-English explanations for independent contractor and services agreements.",
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
        {children}
      </body>
    </html>
  );
}
