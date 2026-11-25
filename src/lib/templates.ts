export type TemplateInfo = {
  slug: string;
  name: string;
  line: string;
  group: "Home and renovation" | "Renting" | "Money and disputes";
};

export const TEMPLATES: TemplateInfo[] = [
  { slug: "change-order", name: "Change order", line: "Extra work, its price and the new finish date, signed before it starts.", group: "Home and renovation" },
  { slug: "lien-waiver", name: "Conditional lien waiver", line: "Your contractor gives up lien rights once your payment clears.", group: "Home and renovation" },
  { slug: "completion-sign-off", name: "Final payment and sign-off", line: "Confirms the work is done before the last payment goes out.", group: "Home and renovation" },
  { slug: "demand-letter", name: "Demand letter", line: "What you are owed, by when, and what happens if it isn't paid.", group: "Money and disputes" },
  { slug: "security-deposit", name: "Security deposit request", line: "Asks a landlord for your deposit back, with your state's deadline.", group: "Renting" },
  { slug: "lease-addendum", name: "Lease addendum", line: "One change to a lease both of you sign: a pet, a parking space, a date.", group: "Renting" },
  { slug: "payment-plan", name: "Payment plan agreement", line: "Who pays what, on which dates, and what a missed payment means.", group: "Money and disputes" },
  { slug: "contractor-complaint", name: "Complaint to a contractor", line: "Puts the problem, the fix you want and your deadline in writing.", group: "Home and renovation" },
  { slug: "roommate-agreement", name: "Roommate agreement", line: "Rent split, bills, quiet hours and what happens when someone leaves.", group: "Renting" },
];

export const HOME_TEMPLATES = TEMPLATES.filter((t) =>
  ["change-order", "lien-waiver", "demand-letter", "security-deposit", "lease-addendum", "payment-plan"].includes(t.slug),
);
