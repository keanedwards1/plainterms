import LogoLoader from "@/components/LogoLoader";

// Shown instantly while a dashboard page loads its data.
export default function DashboardSkeleton() {
  return (
    <div className="pt-section-loading min-h-[50vh]">
      <LogoLoader size={52} label="Loading your account" />
    </div>
  );
}
