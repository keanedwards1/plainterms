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
    body: "PlainTerms is built to handle your documents with minimal footprint. We collect only what is necessary to run your account, deliver your analysis, process payments, and keep the service running. We do not sell your data, and we do not use your uploaded contracts to train AI models.",
  },
  {
    title: "Information we collect",
    body: "When you use PlainTerms we may collect: account details from the sign-in provider you choose (Google, Microsoft, Apple or email), such as your name, email address and profile picture; the documents you upload or paste for analysis and the analyses we produce; your plan and subscription status; payment information processed by Stripe (we never see or store your card details); how many documents you analyze each month; usage data such as pages visited, report views, and upload events; and technical data like IP address, browser type, and device type collected automatically.",
  },
  {
    title: "Document processing and storage",
    body: "Uploaded documents are encrypted and stored in secure cloud storage (AWS) to run your analysis and to show it to you in your account. We do not read, share, or use your contract documents for any purpose other than generating and displaying your analyses. Only you can open documents in your account, unless you share a document's private link with someone.",
  },
  {
    title: "How we use your information",
    body: "We use the information we collect to deliver and improve the PlainTerms service; process payments and prevent fraud; respond to support requests; send transactional communications such as report delivery confirmations; and analyse aggregate usage patterns to improve the product. We do not use your information for targeted advertising.",
  },
  {
    title: "Third-party services",
    body: "PlainTerms relies on the following third-party providers to operate: Stripe for payment processing (subject to Stripe's privacy policy); Amazon Web Services for secure document storage and infrastructure; WorkOS for sign-in and account security; an AI language model provider to generate contract analysis (your document text is transmitted to this provider solely to produce your report); and Google Analytics for aggregate usage analytics. Each provider is subject to their own data handling practices.",
  },
  {
    title: "Cookies and tracking",
    body: "We use cookies and similar technologies to keep you signed in, remember your preferences, and collect aggregate analytics data. You can disable cookies in your browser settings, though some features of the service may not work correctly without them. We do not use third-party advertising cookies.",
  },
  {
    title: "Data retention",
    body: "On the free plan, documents and their analyses are kept for 30 days and then deleted automatically. On Pro, they are kept until you delete them; if you leave Pro, they go back to being deleted 30 days later. You can delete any document from your dashboard at any time, and you can delete your whole account and everything in it from Account settings. Payment records are kept by Stripe as required by law.",
  },
  {
    title: "Security",
    body: "We use HTTPS for all data in transit, access controls on cloud storage, and follow security best practices to protect your information. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security. We will notify affected users promptly in the event of a data breach.",
  },
  {
    title: "Your rights",
    body: "You have the right to request access to the personal data we hold about you, request correction of inaccurate data, delete your documents or your entire account yourself from your dashboard, and opt out of non-essential communications. To exercise any of these rights, contact us at the address below.",
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
    body: "If you have questions about this privacy policy or how your data is handled, contact us at keanedwards1@gmail.com.",
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
      <p className="mt-1 text-xs text-[var(--pt-muted)]">Effective November 23, 2026</p>
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
