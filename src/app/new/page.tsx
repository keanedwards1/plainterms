import type { Metadata } from "next";
import HeroClouds from "@/components/art/HeroClouds";
import HeroWidgets from "@/components/art/HeroWidgets";
import Workspace from "@/components/home/Workspace";
import { getSession } from "@/lib/auth";
import CloseButton from "./CloseButton";
import "@/components/home/home.css";

export const metadata: Metadata = {
  title: "Review a document",
  robots: { index: false, follow: false },
};

/** Full-screen start: just the hero and the upload field, opened by the + button and every "Review" button. */
export default async function NewDocumentPage() {
  const session = await getSession();

  return (
    <main className="pt-new">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <HeroClouds />
      </div>
      <CloseButton />
      <section aria-labelledby="new-heading" className="pt-new-sheet">
        <HeroWidgets />
        <div className="relative flex w-full flex-col items-center px-4 text-center">
          <h1 id="new-heading" className="text-balance text-[clamp(3.25rem,7.4vw,7rem)] font-semibold leading-[0.9] tracking-[-0.055em]">
            What are you
            <br />
            about to sign?
          </h1>
          <p className="mx-auto mb-8 mt-6 max-w-[52ch] text-lg text-(--pt-muted)">
            Leases, contractor bids, freelance contracts and the letters that come after them. Drop one in and get it back in
            plain English.
          </p>
          <Workspace signedIn={Boolean(session)} />
        </div>
      </section>
    </main>
  );
}
