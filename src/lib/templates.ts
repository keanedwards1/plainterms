export type TemplateInfo = {
  slug: string;
  name: string;
  line: string;
  /** Where the template can be filled in today. Without one it shows as opening soon. */
  href?: string;
  /** Other words people search for it by. */
  keywords?: string;
  group:
    | "Home and renovation"
    | "Renting"
    | "Work and freelancing"
    | "Creators and social media"
    | "Business"
    | "Buying and selling"
    | "Money and disputes"
    | "Personal and family";
};

export const TEMPLATE_GROUPS: TemplateInfo["group"][] = [
  "Home and renovation",
  "Renting",
  "Work and freelancing",
  "Creators and social media",
  "Business",
  "Buying and selling",
  "Money and disputes",
  "Personal and family",
];

export const TEMPLATES: TemplateInfo[] = [
  // Home and renovation
  { slug: "home-improvement-contract", name: "Home improvement contract", line: "The job, the price, the payment schedule and the finish date, before work starts.", keywords: "renovation remodel builder construction", group: "Home and renovation" },
  { slug: "change-order", name: "Change order", line: "Extra work, its price and the new finish date, signed before it starts.", keywords: "extra work contractor renovation", group: "Home and renovation" },
  { slug: "lien-waiver", name: "Conditional lien waiver", line: "Your contractor gives up lien rights once your payment clears.", keywords: "lien release mechanics lien contractor payment", group: "Home and renovation" },
  { slug: "completion-sign-off", name: "Final payment and sign-off", line: "Confirms the work is done before the last payment goes out.", keywords: "final payment completion certificate punch list", group: "Home and renovation" },
  { slug: "contractor-complaint", name: "Complaint to a contractor", line: "Puts the problem, the fix you want and your deadline in writing.", href: "/tools/write-a-letter", keywords: "builder renovation problem dispute", group: "Home and renovation" },

  // Renting
  { slug: "residential-lease", name: "Residential lease", line: "Rent, deposit, length of stay and house rules for a home or apartment.", keywords: "rental agreement tenancy apartment landlord tenant", group: "Renting" },
  { slug: "lease-addendum", name: "Lease addendum", line: "One change to a lease both of you sign: a pet, a parking space, a date.", keywords: "lease amendment pet parking", group: "Renting" },
  { slug: "sublease-agreement", name: "Sublease agreement", line: "Someone takes over your place for part of your lease, and pays you rent.", keywords: "sublet subletting", group: "Renting" },
  { slug: "roommate-agreement", name: "Roommate agreement", line: "Rent split, bills, quiet hours and what happens when someone leaves.", keywords: "flatmate housemate shared house", group: "Renting" },
  { slug: "move-in-checklist", name: "Move-in condition checklist", line: "A room-by-room record of the place on day one, so the deposit isn't a fight later.", keywords: "inspection condition report move out", group: "Renting" },
  { slug: "lead-paint-disclosure", name: "Lead paint disclosure", line: "The federal lead notice every lease needs for a home built before 1978.", keywords: "lead based paint epa", group: "Renting" },
  { slug: "notice-to-vacate", name: "Notice of moving out", line: "Tells your landlord in writing the date you're leaving.", keywords: "move out notice end lease termination", group: "Renting" },
  { slug: "security-deposit", name: "Security deposit request", line: "Asks a landlord for your deposit back, with your state's deadline.", href: "/tools/write-a-letter", keywords: "landlord deposit back refund tenant", group: "Renting" },

  // Work and freelancing
  { slug: "freelance-contract", name: "Freelance contract", line: "What you'll deliver, what it costs, when you get paid and who owns the work.", keywords: "freelancer contractor client agreement", group: "Work and freelancing" },
  { slug: "independent-contractor", name: "Independent contractor agreement", line: "Hire someone for a job without making them an employee.", keywords: "1099 contractor hire", group: "Work and freelancing" },
  { slug: "statement-of-work", name: "Statement of work", line: "The tasks, deliverables and dates for one project.", keywords: "sow project scope", group: "Work and freelancing" },
  { slug: "nda", name: "Non-disclosure agreement", line: "Keeps what you share private, one way or both, for a set time.", keywords: "confidentiality agreement confidential mutual", group: "Work and freelancing" },
  { slug: "job-offer-letter", name: "Job offer letter", line: "Role, pay, start date and benefits on one page.", keywords: "employment offer hire", group: "Work and freelancing" },

  // Creators and social media
  { slug: "brand-deal", name: "Brand deal agreement", line: "Posts, platforms, dates, pay and approval rounds for a sponsored campaign.", keywords: "influencer sponsorship sponsored post sponsor instagram tiktok youtube", group: "Creators and social media" },
  { slug: "ugc-agreement", name: "UGC creator agreement", line: "Videos or photos made for a brand's own channels and ads, with usage rights.", keywords: "user generated content creator brand", group: "Creators and social media" },
  { slug: "content-license", name: "Content usage license", line: "Who can use your post, where, for how long and for what fee.", keywords: "usage rights licensing repost whitelisting", group: "Creators and social media" },
  { slug: "photo-release", name: "Photo and video release", line: "Permission to use someone's picture or recording, and where you can use it.", keywords: "model release image consent", group: "Creators and social media" },
  { slug: "creator-collab", name: "Creator collaboration agreement", line: "Two or more creators make something together and split what it earns.", keywords: "collaboration revenue split youtube", group: "Creators and social media" },
  { slug: "social-media-manager", name: "Social media management agreement", line: "Accounts, posting schedule, monthly fee and who keeps the logins.", keywords: "smm instagram tiktok agency", group: "Creators and social media" },
  { slug: "affiliate-agreement", name: "Affiliate agreement", line: "Commission rate, tracking, payout dates and the rules for promoting.", keywords: "commission referral link partner", group: "Creators and social media" },
  { slug: "talent-management", name: "Talent management agreement", line: "What a manager does for you, their cut and how either side can end it.", keywords: "manager agent creator commission", group: "Creators and social media" },

  // Business
  { slug: "services-agreement", name: "Services agreement", line: "The terms for doing work for a business client: scope, fees, payment and liability.", keywords: "msa master services client contract", group: "Business" },
  { slug: "partnership-agreement", name: "Partnership agreement", line: "Who puts in what, how profits split and what happens if a partner leaves.", keywords: "business partners partner", group: "Business" },
  { slug: "llc-operating-agreement", name: "LLC operating agreement", line: "Ownership, voting, profits and exit rules for the members of an LLC.", keywords: "llc members company", group: "Business" },
  { slug: "founder-agreement", name: "Founder agreement", line: "Equity split, vesting, roles and who owns the idea and the code.", keywords: "cofounder co-founder startup equity vesting", group: "Business" },
  { slug: "ip-assignment", name: "IP assignment", line: "Moves ownership of work, code or designs to you or your company.", keywords: "intellectual property copyright invention assignment", group: "Business" },
  { slug: "letter-of-intent", name: "Letter of intent", line: "The main terms of a deal both sides agree on before the full contract.", keywords: "loi term sheet", group: "Business" },
  { slug: "commercial-lease", name: "Commercial lease", line: "Rent, term, build-out and repairs for an office, shop or warehouse.", keywords: "office lease retail lease", group: "Business" },
  { slug: "referral-agreement", name: "Referral agreement", line: "Pays a fee or commission for clients someone sends your way.", keywords: "finder fee commission", group: "Business" },
  { slug: "terms-of-service", name: "Website terms of service", line: "The rules for using your site or app, and the limits of your liability.", keywords: "terms and conditions tos website", group: "Business" },
  { slug: "privacy-policy", name: "Privacy policy", line: "What data your site or app collects, why, and who it's shared with.", keywords: "gdpr ccpa data website", group: "Business" },

  // Buying and selling
  { slug: "bill-of-sale", name: "Bill of sale", line: "Records a private sale: what was sold, the price, the date and that it's sold as is.", keywords: "receipt sale private sale", group: "Buying and selling" },
  { slug: "vehicle-bill-of-sale", name: "Vehicle bill of sale", line: "VIN, mileage, price and both signatures for selling a car or motorbike.", keywords: "car sale auto motorcycle", group: "Buying and selling" },
  { slug: "consignment-agreement", name: "Consignment agreement", line: "A shop sells your item and you split the price.", keywords: "consign resale shop", group: "Buying and selling" },

  // Money and disputes
  { slug: "demand-letter", name: "Demand letter", line: "What you are owed, by when, and what happens if it isn't paid.", href: "/tools/write-a-letter", keywords: "owed money collect pay small claims", group: "Money and disputes" },
  { slug: "promissory-note", name: "Promissory note", line: "A loan in writing: how much, any interest, and when it's paid back.", keywords: "loan iou borrow lend", group: "Money and disputes" },
  { slug: "payment-plan", name: "Payment plan agreement", line: "Who pays what, on which dates, and what a missed payment means.", keywords: "installments installment agreement", group: "Money and disputes" },
  { slug: "settlement-agreement", name: "Settlement agreement", line: "Ends a dispute: who pays what, and neither side takes it further.", keywords: "release of claims dispute", group: "Money and disputes" },
  { slug: "debt-dispute-letter", name: "Debt dispute letter", line: "Tells a debt collector the debt isn't yours, or asks them to prove it.", keywords: "debt collector validation not my debt", group: "Money and disputes" },
  { slug: "debt-stop-contact", name: "Stop contact letter", line: "Tells a debt collector to stop calling, or to talk only to your lawyer.", keywords: "debt collector cease and desist stop calling", group: "Money and disputes" },

  // Personal and family
  { slug: "power-of-attorney", name: "Power of attorney", line: "Lets someone you trust handle your money or paperwork for you.", keywords: "poa", group: "Personal and family" },
  { slug: "child-travel-consent", name: "Child travel consent", line: "Lets your child travel with another adult, signed by the parents.", keywords: "minor travel consent letter", group: "Personal and family" },
  { slug: "nanny-agreement", name: "Nanny agreement", line: "Hours, pay, duties and time off for in-home child care.", keywords: "babysitter childcare au pair", group: "Personal and family" },
];

export const HOME_TEMPLATES = TEMPLATES.filter((t) =>
  ["change-order", "lien-waiver", "demand-letter", "security-deposit", "lease-addendum", "payment-plan"].includes(t.slug),
);
