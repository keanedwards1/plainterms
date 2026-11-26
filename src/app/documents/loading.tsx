import LogoLoader from "@/components/LogoLoader";

// Shown instantly while the documents page loads.
export default function Loading() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide pb-10">
        <header className="pb-8 pt-6 sm:pt-10">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em]">Documents</h1>
          <p className="mt-3 select-none text-lg text-transparent">Loading</p>
        </header>
        <div className="pt-section-loading min-h-[20rem]">
          <LogoLoader label="Loading your documents" />
        </div>
      </div>
    </main>
  );
}
