import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze a Contract",
  description:
    "Upload a home renovation, remodeling, or construction contract to get a plain-English summary in a calm, neutral tone.",
  alternates: {
    canonical: "/analyze",
  },
  openGraph: {
    title: "Analyze a Contract | PlainTerms",
    description:
      "Upload a PDF or DOCX agreement and receive a clear, plain-English contract summary.",
    url: "/analyze",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Analyze a Contract | PlainTerms",
    description:
      "Upload a contract for a plain-English explanation focused on clarity and reliability.",
  },
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
