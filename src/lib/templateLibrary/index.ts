import "server-only";
import type { TemplateDoc } from "@/lib/templateKit/types";
import { BUSINESS_LIBRARY, SELLING_LIBRARY } from "@/lib/templateLibrary/business";
import { CREATORS_LIBRARY } from "@/lib/templateLibrary/creators";
import {
  EVERYDAY_BUSINESS,
  EVERYDAY_CREATORS,
  EVERYDAY_HOME,
  EVERYDAY_MONEY,
  EVERYDAY_PERSONAL,
  EVERYDAY_RENTING,
  EVERYDAY_SELLING,
  EVERYDAY_WORK,
} from "@/lib/templateLibrary/everyday";
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
  ...EVERYDAY_HOME,
  ...EVERYDAY_RENTING,
  ...EVERYDAY_WORK,
  ...EVERYDAY_CREATORS,
  ...EVERYDAY_BUSINESS,
  ...EVERYDAY_SELLING,
  ...EVERYDAY_MONEY,
  ...EVERYDAY_PERSONAL,
];

export function templateDoc(slug: string): TemplateDoc | null {
  return LIBRARY.find((t) => t.slug === slug) ?? null;
}
