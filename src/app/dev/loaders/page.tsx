import { notFound } from "next/navigation";
import LoaderLab from "./LoaderLab";

export const metadata = { robots: { index: false, follow: false } };

/** Local comparison of splash loader options. Not served in production. */
export default function LoadersPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LoaderLab />;
}
