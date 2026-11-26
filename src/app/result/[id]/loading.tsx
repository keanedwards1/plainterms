import LogoLoader from "@/components/LogoLoader";

// Shown the moment a document is opened, while its analysis loads.
export default function Loading() {
  return (
    <main className="pt-page-pad">
      <div className="pt-section-loading min-h-[60vh]">
        <LogoLoader size={52} label="Loading your document" />
      </div>
    </main>
  );
}
