import type { Metadata } from "next";
import ClassicResult from "@/components/result/ClassicResult";
import ReviewResult from "@/components/review/ReviewResult";
import { loadResult, type ResultQuery } from "@/components/result/loadResult";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<ResultQuery>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Contract Result",
    description:
      "Plain-English contract summary result for a home renovation, remodeling, or construction agreement.",
    alternates: {
      canonical: `/result/${id}`,
    },
    openGraph: {
      title: "Contract Result | PlainTerms",
      description: "Structured plain-English agreement summary with section-by-section explanations.",
      url: `/result/${id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: "Contract Result | PlainTerms",
      description: "Read a structured, plain-English contract explanation focused on calm clarity.",
    },
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const loaded = await loadResult(id, query, `/result/${encodeURIComponent(id)}`);
  if (!loaded.ok) return loaded.notice;

  // New analyses get the step-by-step review; older results keep the classic page.
  if (loaded.data.review || loaded.data.analysis_stage === "refining") {
    return (
      <ReviewResult
        initial={loaded.data}
        retentionDays={loaded.retentionDays}
        accessKey={loaded.accessKey || undefined}
        abVariant={loaded.abVariant}
        signedIn={loaded.signedIn}
      />
    );
  }

  return (
    <ClassicResult
      data={loaded.data}
      retentionDays={loaded.retentionDays}
      accessKey={loaded.accessKey}
      abVariant={loaded.abVariant}
      signedIn={loaded.signedIn}
    />
  );
}
