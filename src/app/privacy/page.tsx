import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | PlainTerms",
  description: "Privacy policy for PlainTerms contract analysis.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | PlainTerms",
    description: "Privacy policy for PlainTerms contract analysis.",
    url: "/privacy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | PlainTerms",
    description: "Privacy policy for PlainTerms contract analysis.",
  },
};

const sections = [
  {
    title: "Overview",
    body: "PlainTerms is built to handle your documents with minimal footprint. We collect only what is necessary to deliver your analysis, process payments, and keep the service running. We do not sell your data, and we do not use your uploaded contracts to train AI models.",
  },
  {
    title: "Information we collect",
    body: "When you use PlainTerms we may collect: the document you upload for analysis; your email address if you contact us; payment information processed by Stripe (we never see or store your card details); usage data such as pages visited, report views, and upload events; and technical data like IP address, browser type, and device type collected automatically.",
  },
  {
    title: "Document processing and storage",
    body: "Uploaded documents are transferred to secure cloud storage (AWS S3) solely for the purpose of running your analysis. Documents are intended to be stored ephemerally and are not retained beyond what is required to complete and deliver your report. Structured analysis results are stored temporarily to allow you to retrieve your report. We do not read, share, or use your contract documents for any purpose other than generating your requested analysis.",
  },
  {
    title: "How we use your information",
    body: "We use the information we collect to deliver and improve the PlainTerms service; process payments and prevent fraud; respond to support requests; send transactional communications such as report delivery confirmations; and analyse aggregate usage patterns to improve the product. We do not use your information for targeted advertising.",
  },
  {
    title: "Third-party services",
    body: "PlainTerms relies on the following third-party providers to operate: Stripe for payment processing (subject to Stripe's privacy policy); Amazon Web Services for secure document storage and infrastructure; an AI language model provider to generate contract analysis (your document text is transmitted to this provider solely to produce your report); and Google Analytics for aggregate usage analytics. Each provider is subject to their own data handling practices.",
  },
  {
    title: "Cookies and tracking",
    body: "We use cookies and similar technologies to remember your preferences and collect aggregate analytics data. You can disable cookies in your browser settings, though some features of the service may not work correctly without them. We do not use third-party advertising cookies.",
  },
  {
    title: "Data retention",
    body: "Uploaded documents are deleted after analysis is complete or within a short retention window. Report results are stored to allow retrieval within a reasonable period after purchase. You may request deletion of your data at any time by contacting us.",
  },
  {
    title: "Security",
    body: "We use HTTPS for all data in transit, access controls on cloud storage, and follow security best practices to protect your information. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security. We will notify affected users promptly in the event of a data breach.",
  },
  {
    title: "Your rights",
    body: "You have the right to request access to the personal data we hold about you, request correction of inaccurate data, request deletion of your data, and opt out of non-essential communications. To exercise any of these rights, contact us at the address below.",
  },
  {
    title: "Children's privacy",
    body: "PlainTerms is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this privacy policy from time to time. When we do, we will update the effective date at the top of this page. Continued use of PlainTerms after changes are posted constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact",
    body: "If you have questions about this privacy policy or how your data is handled, contact us at plaintermsinfo@gmail.com.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="pt-page-pad min-h-screen py-10">
      <div className="pt-container-reading">
        <Link href="/" className="text-sm font-semibold text-[var(--pt-muted)] hover:text-[var(--pt-ink)]">
          ← Back to home
        </Link>

      <h1 className="mt-5 text-4xl text-[var(--pt-ink)]">Privacy Policy</h1>
      <p className="mt-1 text-xs text-[var(--pt-muted)]">Effective April 17, 2026</p>
      <p className="mt-4 text-sm text-[var(--pt-muted)]">
        PlainTerms is designed for minimal, practical data handling. Here is exactly what we collect, why, and how we protect it.
      </p>

      <section className="mt-6 grid gap-4 text-sm text-[var(--pt-muted)]">
        {sections.map((s) => (
          <article key={s.title} className="rounded-[var(--pt-radius)] border border-[var(--pt-border)] bg-[var(--pt-surface)] p-5">
            <h2 className="text-xl text-[var(--pt-ink)]">{s.title}</h2>
            <p className="mt-2 leading-relaxed">{s.body}</p>
          </article>
        ))}
      </section>
      </div>
    </main>
  );
}
