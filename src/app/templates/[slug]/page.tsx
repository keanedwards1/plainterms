import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TemplateFiller from "@/components/templates/TemplateFiller";
import { getSession } from "@/lib/auth";
import { LIBRARY, templateDoc } from "@/lib/templateLibrary";
import { TEMPLATES } from "@/lib/templates";

type Props = { params: Promise<{ slug: string }> };

// Only written templates have pages; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LIBRARY.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = templateDoc(slug);
  if (!doc) return {};
  const name = TEMPLATES.find((t) => t.slug === slug)?.name ?? doc.title;
  return { title: `${name} template`, description: doc.summary };
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const doc = templateDoc(slug);
  if (!doc) notFound();
  const info = TEMPLATES.find((t) => t.slug === slug);
  const session = await getSession();

  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide pb-12">
        <header className="pb-6 pt-6 sm:pt-10">
          <Link href="/templates" className="text-sm text-(--pt-muted) underline-offset-4 hover:underline">
            Templates{info ? ` · ${info.group}` : ""}
          </Link>
          <h1 className="mt-2 text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-[-0.04em]">{info?.name ?? doc.title}</h1>
          <p className="mt-3 max-w-[62ch] text-lg text-(--pt-muted)">{doc.summary}</p>
        </header>
        <TemplateFiller doc={doc} signedIn={Boolean(session)} />
      </div>
    </main>
  );
}
