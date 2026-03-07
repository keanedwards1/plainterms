export const ADDON_OPTIONS = ["rewrite_contract", "update_email"] as const;

export type AddonOption = (typeof ADDON_OPTIONS)[number];

export const ADDON_LABELS: Record<AddonOption, string> = {
  rewrite_contract: "Rewrite Contract",
  update_email: "Draft Negotiation Email",
};

export const ADDON_DESCRIPTIONS: Record<AddonOption, string> = {
  rewrite_contract: "Generate stronger fallback clause language and cleaner wording.",
  update_email: "Generate a ready-to-send email with requested contract changes.",
};
