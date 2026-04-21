"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  measurementId?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });
}

export default function GoogleAnalytics({ measurementId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId || !pathname) return;

    ensureGtag();

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    const pageLocation = window.location.href;

    window.gtag?.("event", "page_view", {
      page_path: pagePath,
      page_location: pageLocation,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}
