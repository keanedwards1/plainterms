import "server-only";
import type { TemplateDoc } from "@/lib/templateKit/types";
import { BUSINESS_LIBRARY, SELLING_LIBRARY } from "@/lib/templateLibrary/business";
import { CREATORS_LIBRARY } from "@/lib/templateLibrary/creators";
import { HOME_LIBRARY } from "@/lib/templateLibrary/home";
import { MONEY_LIBRARY, PERSONAL_LIBRARY } from "@/lib/templateLibrary/money";
import { RENTING_LIBRARY } from "@/lib/templateLibrary/renting";
import { WORK_LIBRARY } from "@/lib/templateLibrary/work";

/**
 * Every written template. Server-only so the full library never ships to the browser;
 * each template page sends just its own template.
 */
export const LIBRARY: TemplateDoc[] = [
  ...HOME_LIBRARY,
  ...RENTING_LIBRARY,
  ...WORK_LIBRARY,
  ...CREATORS_LIBRARY,
  ...BUSINESS_LIBRARY,
  ...SELLING_LIBRARY,
  ...MONEY_LIBRARY,
  ...PERSONAL_LIBRARY,
];

export function templateDoc(slug: string): TemplateDoc | null {
  return LIBRARY.find((t) => t.slug === slug) ?? null;
}
