"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * A date in the visitor's own time zone. The server can't know that zone, so while the page hydrates this
 * renders the UTC date (matching the server's HTML), then switches to local time straight after.
 */
export default function LocalDate({ iso, options, fallback = "" }: { iso: string; options: Intl.DateTimeFormatOptions; fallback?: string }) {
  const local = useSyncExternalStore(noop, () => true, () => false);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <>{fallback}</>;
  return <>{new Intl.DateTimeFormat("en-US", { ...options, timeZone: local ? undefined : "UTC" }).format(date)}</>;
}
