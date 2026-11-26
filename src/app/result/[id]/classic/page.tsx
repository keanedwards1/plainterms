import type { Metadata } from "next";
import ClassicResult from "@/components/result/ClassicResult";
import { loadResult, type ResultQuery } from "@/components/result/loadResult";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<ResultQuery>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Contract Result",
    alternates: { canonical: `/result/${id}` },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function ClassicResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const loaded = await loadResult(id, query, `/result/${encodeURIComponent(id)}/classic`);
  if (!loaded.ok) return loaded.notice;

  const keyQuery = loaded.accessKey ? `?k=${encodeURIComponent(loaded.accessKey)}` : "";
  return (
    <ClassicResult
      data={loaded.data}
      retentionDays={loaded.retentionDays}
      accessKey={loaded.accessKey}
      abVariant={loaded.abVariant}
      signedIn={loaded.signedIn}
      newViewHref={loaded.data.review ? `/result/${encodeURIComponent(id)}${keyQuery}` : undefined}
    />
  );
}
