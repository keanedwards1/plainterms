// Email templates for the Emails tool. Each one is an email plus, where it fits,
// the contract or legal document it sends. Placeholders are filled from fields.

export type EmailField = { key: string; label: string; placeholder: string };

export type EmailTemplate = {
  slug: string;
  name: string;
  group: "Contracts to send" | "Getting paid" | "Notices" | "Requests";
  line: string;
  attachment: string | null;
  fields: EmailField[];
  subject: (v: Record<string, string>) => string;
  body: (v: Record<string, string>) => string;
};

const f = (v: Record<string, string>, key: string, fallback: string) => v[key]?.trim() || `[${fallback}]`;

const sign = (v: Record<string, string>) => `Thanks,\n${f(v, "you", "Your name")}`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    slug: "mutual-nda",
    name: "Mutual NDA",
    group: "Contracts to send",
    line: "Send a two-way non-disclosure agreement before you share details.",
    attachment: "Mutual NDA.pdf",
    fields: [
      { key: "to", label: "Their name", placeholder: "Jordan Lee" },
      { key: "topic", label: "What you'll discuss", placeholder: "the new product line" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `NDA before we talk about ${f(v, "topic", "the project")}`,
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nBefore we get into ${f(v, "topic", "the project")}, I've attached a mutual NDA so we can both speak freely. It covers what each of us shares and lasts two years.\n\nIf it looks good, please sign and send it back. Happy to walk through any of it.\n\n${sign(v)}`,
  },
  {
    slug: "services-agreement",
    name: "Freelance services agreement",
    group: "Contracts to send",
    line: "Scope, price, timeline and payment terms for a client project.",
    attachment: "Services agreement.pdf",
    fields: [
      { key: "to", label: "Client name", placeholder: "Riverside Bakery" },
      { key: "project", label: "Project", placeholder: "a new website" },
      { key: "price", label: "Price", placeholder: "$4,800" },
      { key: "start", label: "Start date", placeholder: "March 3" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `Agreement for ${f(v, "project", "the project")}`,
    body: (v) =>
      `Hi ${f(v, "to", "Client")},\n\nAttached is the agreement for ${f(v, "project", "the project")}. It sets out the scope we discussed, the price of ${f(v, "price", "price")}, a start date of ${f(v, "start", "start date")} and how payments work.\n\nOnce you've signed it, I'll send the first invoice and we can get started.\n\n${sign(v)}`,
  },
  {
    slug: "contractor-agreement",
    name: "Independent contractor agreement",
    group: "Contracts to send",
    line: "Bring on a contractor with clear terms on work, pay and ownership.",
    attachment: "Independent contractor agreement.pdf",
    fields: [
      { key: "to", label: "Contractor name", placeholder: "Sam Patel" },
      { key: "role", label: "Work they'll do", placeholder: "bookkeeping" },
      { key: "rate", label: "Rate", placeholder: "$45 an hour" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `Contractor agreement for ${f(v, "role", "the work")}`,
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nGlad to have you helping with ${f(v, "role", "the work")}. I've attached our contractor agreement: it covers the work, your rate of ${f(v, "rate", "rate")}, invoicing, confidentiality and who owns what you make.\n\nPlease sign and return it, along with a W-9, and we're set.\n\n${sign(v)}`,
  },
  {
    slug: "change-order",
    name: "Change order",
    group: "Contracts to send",
    line: "Put extra work, its price and the new finish date in writing.",
    attachment: "Change order.pdf",
    fields: [
      { key: "to", label: "Who it's for", placeholder: "Brightline Remodeling" },
      { key: "change", label: "The change", placeholder: "add a tile backsplash" },
      { key: "cost", label: "Added cost", placeholder: "$1,250" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `Change order: ${f(v, "change", "the change")}`,
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nAs we discussed, I've attached a change order to ${f(v, "change", "the change")} for an added ${f(v, "cost", "cost")}. Please confirm the new finish date and sign it before any of this work starts.\n\n${sign(v)}`,
  },
  {
    slug: "lease-addendum",
    name: "Lease addendum",
    group: "Contracts to send",
    line: "One change to a lease both of you sign: a pet, a parking space, a date.",
    attachment: "Lease addendum.pdf",
    fields: [
      { key: "to", label: "Tenant or landlord", placeholder: "Harbor Point Apartments" },
      { key: "change", label: "The change", placeholder: "add one cat to the lease" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `Lease addendum: ${f(v, "change", "the change")}`,
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nI've attached a short addendum to our lease to ${f(v, "change", "the change")}. Everything else in the lease stays the same. Please sign and send it back when you can.\n\n${sign(v)}`,
  },
  {
    slug: "payment-reminder",
    name: "Friendly payment reminder",
    group: "Getting paid",
    line: "A polite nudge for an invoice that's a few days late.",
    attachment: null,
    fields: [
      { key: "to", label: "Client name", placeholder: "Riverside Bakery" },
      { key: "invoice", label: "Invoice number", placeholder: "1042" },
      { key: "amount", label: "Amount", placeholder: "$2,400" },
      { key: "due", label: "Was due", placeholder: "February 14" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `Invoice ${f(v, "invoice", "number")} is past due`,
    body: (v) =>
      `Hi ${f(v, "to", "Client")},\n\nA quick reminder that invoice ${f(v, "invoice", "number")} for ${f(v, "amount", "amount")} was due on ${f(v, "due", "date")}. If it's already on its way, thank you, and please ignore this.\n\nIf anything's holding it up, just let me know.\n\n${sign(v)}`,
  },
  {
    slug: "final-notice",
    name: "Final notice before collections",
    group: "Getting paid",
    line: "A firm last request with a clear deadline.",
    attachment: null,
    fields: [
      { key: "to", label: "Who owes you", placeholder: "Riverside Bakery" },
      { key: "amount", label: "Amount", placeholder: "$2,400" },
      { key: "by", label: "Pay by", placeholder: "March 15" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: () => "Final notice: payment overdue",
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nI've reached out several times about the ${f(v, "amount", "amount")} that's overdue. Please pay in full by ${f(v, "by", "date")}.\n\nIf I haven't received it by then, I'll look at my other options, including small claims court or a collections agency. I'd rather settle this directly, so please reply if you'd like to set up a payment plan.\n\n${sign(v)}`,
  },
  {
    slug: "payment-plan",
    name: "Payment plan offer",
    group: "Getting paid",
    line: "Offer to split an overdue balance into dated payments.",
    attachment: "Payment plan agreement.pdf",
    fields: [
      { key: "to", label: "Who owes you", placeholder: "Riverside Bakery" },
      { key: "amount", label: "Balance", placeholder: "$2,400" },
      { key: "installments", label: "Payments", placeholder: "three monthly payments of $800" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: () => "A payment plan for your balance",
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nTo make the ${f(v, "amount", "balance")} easier to clear, I can accept ${f(v, "installments", "the payments")}. The attached agreement lists the dates and what happens if a payment is missed.\n\nIf that works, sign and return it and the plan starts right away.\n\n${sign(v)}`,
  },
  {
    slug: "termination",
    name: "Contract termination notice",
    group: "Notices",
    line: "End an agreement in writing, with the notice the contract requires.",
    attachment: null,
    fields: [
      { key: "to", label: "The other party", placeholder: "Summit Roofing" },
      { key: "contract", label: "Agreement", placeholder: "our maintenance agreement dated May 1" },
      { key: "end", label: "Last day", placeholder: "April 30" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: () => "Notice of termination",
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nThis is my written notice that I'm ending ${f(v, "contract", "our agreement")}. My last day under the agreement will be ${f(v, "end", "date")}, which gives the notice it requires.\n\nPlease send a final invoice for anything owed through that date.\n\n${sign(v)}`,
  },
  {
    slug: "lease-non-renewal",
    name: "Lease non-renewal",
    group: "Notices",
    line: "Tell a landlord or tenant the lease won't renew.",
    attachment: null,
    fields: [
      { key: "to", label: "Landlord or tenant", placeholder: "Harbor Point Apartments" },
      { key: "address", label: "Address", placeholder: "214 Harbor Point Dr, Unit 3B" },
      { key: "end", label: "Lease ends", placeholder: "June 30" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: (v) => `Lease at ${f(v, "address", "address")} will not renew`,
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nI'm writing to let you know I won't be renewing the lease for ${f(v, "address", "the address")}, which ends on ${f(v, "end", "date")}.\n\nPlease let me know how you'd like to handle the move-out inspection and the return of the security deposit.\n\n${sign(v)}`,
  },
  {
    slug: "w9-request",
    name: "W-9 request",
    group: "Requests",
    line: "Ask a contractor for the tax form you need before paying them.",
    attachment: null,
    fields: [
      { key: "to", label: "Contractor name", placeholder: "Sam Patel" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: () => "Could you send a W-9?",
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nBefore I send your first payment, could you send me a completed W-9? It's the IRS form I need for year-end tax reporting.\n\n${sign(v)}`,
  },
  {
    slug: "insurance-certificate",
    name: "Certificate of insurance request",
    group: "Requests",
    line: "Ask a contractor for proof of insurance before work starts.",
    attachment: null,
    fields: [
      { key: "to", label: "Contractor", placeholder: "Brightline Remodeling" },
      { key: "address", label: "Job address", placeholder: "18 Elm St" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: () => "Certificate of insurance before we start",
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nBefore work starts at ${f(v, "address", "the address")}, could you have your insurer send me a certificate of insurance for general liability and, if you have employees, workers' compensation?\n\n${sign(v)}`,
  },
  {
    slug: "lien-waiver-request",
    name: "Lien waiver request",
    group: "Requests",
    line: "Ask for a lien waiver each time you make a payment.",
    attachment: "Conditional lien waiver.pdf",
    fields: [
      { key: "to", label: "Contractor", placeholder: "Brightline Remodeling" },
      { key: "amount", label: "Payment", placeholder: "$12,000" },
      { key: "you", label: "Your name", placeholder: "Alex Morgan" },
    ],
    subject: () => "Lien waiver for this payment",
    body: (v) =>
      `Hi ${f(v, "to", "Name")},\n\nI'm ready to send the ${f(v, "amount", "payment")} payment. Along with it, please sign the attached conditional lien waiver, and ask any major suppliers on the job to do the same.\n\n${sign(v)}`,
  },
];

export const EMAIL_GROUPS: EmailTemplate["group"][] = ["Contracts to send", "Getting paid", "Notices", "Requests"];
