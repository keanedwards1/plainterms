export type TemplateInfo = {
  slug: string;
  name: string;
  line: string;
  group:
    | "Home and renovation"
    | "Renting"
    | "Work and freelancing"
    | "Buying and selling"
    | "Money and disputes"
    | "Personal and family";
};

export const TEMPLATE_GROUPS: TemplateInfo["group"][] = [
  "Home and renovation",
  "Renting",
  "Work and freelancing",
  "Buying and selling",
  "Money and disputes",
  "Personal and family",
];

export const TEMPLATES: TemplateInfo[] = [
  // Home and renovation
  { slug: "home-improvement-contract", name: "Home improvement contract", line: "The job, the price, the payment schedule and the finish date, before work starts.", group: "Home and renovation" },
  { slug: "change-order", name: "Change order", line: "Extra work, its price and the new finish date, signed before it starts.", group: "Home and renovation" },
  { slug: "lien-waiver", name: "Conditional lien waiver", line: "Your contractor gives up lien rights once your payment clears.", group: "Home and renovation" },
  { slug: "completion-sign-off", name: "Final payment and sign-off", line: "Confirms the work is done before the last payment goes out.", group: "Home and renovation" },
  { slug: "contractor-complaint", name: "Complaint to a contractor", line: "Puts the problem, the fix you want and your deadline in writing.", group: "Home and renovation" },

  // Renting
  { slug: "residential-lease", name: "Residential lease", line: "Rent, deposit, length of stay and house rules for a home or apartment.", group: "Renting" },
  { slug: "lease-addendum", name: "Lease addendum", line: "One change to a lease both of you sign: a pet, a parking space, a date.", group: "Renting" },
  { slug: "sublease-agreement", name: "Sublease agreement", line: "Someone takes over your place for part of your lease, and pays you rent.", group: "Renting" },
  { slug: "roommate-agreement", name: "Roommate agreement", line: "Rent split, bills, quiet hours and what happens when someone leaves.", group: "Renting" },
  { slug: "move-in-checklist", name: "Move-in condition checklist", line: "A room-by-room record of the place on day one, so the deposit isn't a fight later.", group: "Renting" },
  { slug: "lead-paint-disclosure", name: "Lead paint disclosure", line: "The federal lead notice every lease needs for a home built before 1978.", group: "Renting" },
  { slug: "notice-to-vacate", name: "Notice of moving out", line: "Tells your landlord in writing the date you're leaving.", group: "Renting" },
  { slug: "security-deposit", name: "Security deposit request", line: "Asks a landlord for your deposit back, with your state's deadline.", group: "Renting" },

  // Work and freelancing
  { slug: "freelance-contract", name: "Freelance contract", line: "What you'll deliver, what it costs, when you get paid and who owns the work.", group: "Work and freelancing" },
  { slug: "independent-contractor", name: "Independent contractor agreement", line: "Hire someone for a job without making them an employee.", group: "Work and freelancing" },
  { slug: "statement-of-work", name: "Statement of work", line: "The tasks, deliverables and dates for one project.", group: "Work and freelancing" },
  { slug: "nda", name: "Non-disclosure agreement", line: "Keeps what you share private, one way or both, for a set time.", group: "Work and freelancing" },
  { slug: "job-offer-letter", name: "Job offer letter", line: "Role, pay, start date and benefits on one page.", group: "Work and freelancing" },
  { slug: "photo-release", name: "Photo and video release", line: "Permission to use someone's picture or recording, and where you can use it.", group: "Work and freelancing" },

  // Buying and selling
  { slug: "bill-of-sale", name: "Bill of sale", line: "Records a private sale: what was sold, the price, the date and that it's sold as is.", group: "Buying and selling" },
  { slug: "vehicle-bill-of-sale", name: "Vehicle bill of sale", line: "VIN, mileage, price and both signatures for selling a car or motorbike.", group: "Buying and selling" },
  { slug: "consignment-agreement", name: "Consignment agreement", line: "A shop sells your item and you split the price.", group: "Buying and selling" },

  // Money and disputes
  { slug: "demand-letter", name: "Demand letter", line: "What you are owed, by when, and what happens if it isn't paid.", group: "Money and disputes" },
  { slug: "promissory-note", name: "Promissory note", line: "A loan in writing: how much, any interest, and when it's paid back.", group: "Money and disputes" },
  { slug: "payment-plan", name: "Payment plan agreement", line: "Who pays what, on which dates, and what a missed payment means.", group: "Money and disputes" },
  { slug: "settlement-agreement", name: "Settlement agreement", line: "Ends a dispute: who pays what, and neither side takes it further.", group: "Money and disputes" },
  { slug: "debt-dispute-letter", name: "Debt dispute letter", line: "Tells a debt collector the debt isn't yours, or asks them to prove it.", group: "Money and disputes" },
  { slug: "debt-stop-contact", name: "Stop contact letter", line: "Tells a debt collector to stop calling, or to talk only to your lawyer.", group: "Money and disputes" },

  // Personal and family
  { slug: "power-of-attorney", name: "Power of attorney", line: "Lets someone you trust handle your money or paperwork for you.", group: "Personal and family" },
  { slug: "child-travel-consent", name: "Child travel consent", line: "Lets your child travel with another adult, signed by the parents.", group: "Personal and family" },
  { slug: "nanny-agreement", name: "Nanny agreement", line: "Hours, pay, duties and time off for in-home child care.", group: "Personal and family" },
];

export const HOME_TEMPLATES = TEMPLATES.filter((t) =>
  ["change-order", "lien-waiver", "demand-letter", "security-deposit", "lease-addendum", "payment-plan"].includes(t.slug),
);
