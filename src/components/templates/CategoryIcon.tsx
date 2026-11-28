import type { TemplateInfo } from "@/lib/templates";

export type Category = TemplateInfo["group"] | "All";

// Line icons on a 24px grid, in the button's text color, to match the rail.
const PATHS: Record<Category, React.ReactNode> = {
  All: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  "Home and renovation": (
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.4V20h13V9.4" />
      <path d="M10 20v-5.5h4V20" />
      <path d="M16 6.2V4.5h2v3.3" />
    </>
  ),
  Renting: (
    <>
      <circle cx="8" cy="16" r="4" />
      <path d="m10.9 13.1 8.6-8.6" />
      <path d="m16.5 7.5 2.2 2.2" />
      <path d="m14.2 9.8 1.6 1.6" />
    </>
  ),
  "Work and freelancing": (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </>
  ),
  "Creators and social media": (
    <>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </>
  ),
  Business: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M6 20.5V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15.5" />
      <path d="M15 9.5h3a1 1 0 0 1 1 1v10" />
      <path d="M9 8h3M9 11.5h3M9 15h3" />
    </>
  ),
  "Buying and selling": (
    <>
      <path d="M3.5 4.5v6.3a1 1 0 0 0 .3.7l8.7 8.7a1.5 1.5 0 0 0 2.1 0l5.6-5.6a1.5 1.5 0 0 0 0-2.1l-8.7-8.7a1 1 0 0 0-.7-.3H4.5a1 1 0 0 0-1 1Z" />
      <circle cx="7.8" cy="7.8" r="1.3" />
    </>
  ),
  "Money and disputes": (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <circle cx="12" cy="12" r="2.75" />
      <path d="M6 12h.01M18 12h.01" strokeWidth="2.2" />
    </>
  ),
  "Personal and family": (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 19.5a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M16.2 14.1a4.6 4.6 0 0 1 5.3 4.5" />
    </>
  ),
};

export default function CategoryIcon({ category, className = "h-6 w-6" }: { category: Category; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[category]}
    </svg>
  );
}
