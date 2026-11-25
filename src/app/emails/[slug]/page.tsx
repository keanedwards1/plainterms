import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmailComposer from "@/components/emails/EmailComposer";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplates";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return EMAIL_TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = EMAIL_TEMPLATES.find((t) => t.slug === slug);
  return template ? { title: `${template.name} email`, description: template.line } : {};
}

export default async function EmailTemplatePage({ params }: Props) {
  const { slug } = await params;
  const template = EMAIL_TEMPLATES.find((t) => t.slug === slug);
  if (!template) notFound();

  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide pb-10">
        <header className="pb-8 pt-6 sm:pt-10">
          <Link href="/emails" className="inline-flex items-center gap-1.5 text-sm text-(--pt-muted) hover:text-(--pt-ink)">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            All emails
          </Link>
          <p className="pt-label mt-5">{template.group}</p>
          <h1 className="mt-2 text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[0.98] tracking-[-0.05em]">{template.name}</h1>
          <p className="mt-3 max-w-[60ch] text-lg text-(--pt-muted)">{template.line}</p>
        </header>
        <EmailComposer slug={template.slug} connected={false} />
      </div>
    </main>
  );
}
