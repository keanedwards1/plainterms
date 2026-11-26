"use client";

import { usePathname } from "next/navigation";
import { SkeletonFor } from "@/components/Skeletons";

// Shown the moment a page is opened: the shape of that page, filled in as it arrives.
export default function Loading() {
  return <SkeletonFor path={usePathname() || "/"} />;
}
