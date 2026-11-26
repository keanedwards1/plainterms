import { notFound } from "next/navigation";
import { Waiting } from "@/components/review/ReviewResult";

export const metadata = { robots: { index: false, follow: false } };

/** Local preview of the wait screen. Not served in production. */
export default function LoaderPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="pt-page-pad py-5">
      <div className="pt-container-wide">
        <Waiting />
      </div>
    </main>
  );
}
