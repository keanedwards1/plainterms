import LogoLoader from "@/components/LogoLoader";

// Shown the moment a tab is tapped, until that page's first content arrives.
export default function Loading() {
  return (
    <main className="pt-page-pad">
      <div className="pt-section-loading min-h-[60vh]">
        <LogoLoader size={52} />
      </div>
    </main>
  );
}
