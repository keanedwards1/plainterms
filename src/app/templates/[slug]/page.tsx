import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TemplateEditor from "@/components/templates/TemplateEditor";
import { getSession } from "@/lib/auth";
import { getAccount } from "@/lib/serverApi";
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
  const account = session ? await getAccount(session) : null;

  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide pb-12">
        <header className="pb-4 pt-5 sm:pt-8">
          <Link href="/templates" className="text-sm text-(--pt-muted) underline-offset-4 hover:underline">
            Templates{info ? ` · ${info.group}` : ""}
          </Link>
          <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.05] tracking-[-0.035em]">{info?.name ?? doc.title}</h1>
          <p className="mt-2 max-w-[70ch] text-(--pt-muted)">{doc.summary}</p>
          <p className="mt-1.5 text-sm text-(--pt-muted)">
            A general template, not legal advice.{" "}
            <a href="#notes" className="underline underline-offset-3">
              Read the notes
            </a>
          </p>
        </header>
        <TemplateEditor doc={doc} signedIn={Boolean(session)} branded={account?.plan !== "pro"} />
      </div>
    </main>
  );
}
