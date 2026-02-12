import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finalizing Payment",
  description: "Verifying payment and finalizing contract analysis.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/analyze/complete",
  },
};

export default function AnalyzeCompleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
