import type { Metadata } from "next";
import TemplateBrowser from "@/components/templates/TemplateBrowser";
import "@/components/home/home.css";

export const metadata: Metadata = {
  title: "Templates",
  description: "Leases, NDAs, freelance contracts, bills of sale, change orders, lien waivers, demand letters and more, filled in by answering a few questions.",
};

export default function TemplatesPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <header className="pb-6 pt-6 sm:pt-10">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">Templates</h1>
          <p className="mt-3 max-w-[60ch] text-lg text-(--pt-muted)">
            Answer a few questions and get a filled-in document you can sign, send or print.
          </p>
        </header>
        <TemplateBrowser />
      </div>
    </main>
  );
}
