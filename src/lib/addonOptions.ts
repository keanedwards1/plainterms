import { ADDON_OPTIONS as SHARED_ADDON_OPTIONS } from "../../shared/contractOptions.mjs";

export const ADDON_OPTIONS = SHARED_ADDON_OPTIONS;

export type AddonOption = (typeof ADDON_OPTIONS)[number];

export const ADDON_LABELS: Record<AddonOption, string> = {
  rewrite_contract: "Rewrite Contract",
  update_email: "Draft Negotiation Email",
};

export const ADDON_DESCRIPTIONS: Record<AddonOption, string> = {
  rewrite_contract: "Generate stronger fallback clause language and cleaner wording.",
  update_email: "Generate a ready-to-send email with requested contract changes.",
};
