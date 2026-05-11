import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preparing Your Report",
  description: "Finalizing your contract analysis and loading your report.",
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
