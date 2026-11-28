import type { TemplateDoc } from "@/lib/templateKit/types";
import { LETTER_FIELDS, lineItems } from "@/lib/templateLibrary/shared";

/**
 * Everyday documents that stand in for the held-back templates (see the legal-templates skill):
 * records, letters and simple one-to-one agreements with no state-specific required wording.
 */

const items = lineItems(5);

// ---------- Home and renovation ----------

export const EVERYDAY_HOME: TemplateDoc[] = [
  {
    slug: "punch-list",
    version: 1,
    title: "Punch List",
    summary: "The items left to fix at the end of a job, where they are, and when each will be done.",
    fields: [
      { id: "ownerName", label: "Owner", type: "text", placeholder: "Jordan Lee" },
      { id: "contractorName", label: "Contractor", type: "text", placeholder: "Brightline Remodeling LLC" },
      { id: "projectAddress", label: "Project address", type: "text", placeholder: "48 Willow Ave, Portland, OR" },
      { id: "walkDate", label: "Walk-through date", type: "date" },
      { id: "finishBy", label: "Everything fixed by", type: "date" },
      ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [
        { id: `fix${n}`, label: `Item ${n}`, type: "text" as const, placeholder: n === 1 ? "Touch up paint above the range hood" : "" },
        { id: `where${n}`, label: `Location ${n}`, type: "text" as const, placeholder: n === 1 ? "Kitchen" : "" },
      ]),
    ],
    groups: [
      { title: "The job", fields: ["ownerName", "contractorName", "projectAddress", "walkDate", "finishBy"] },
      { title: "Items", fields: [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [`fix${n}`, `where${n}`]) },
    ],
    body: [
      { t: "title", text: "Punch List" },
      {
        t: "boxes",
        rows: [
          [
            { label: "Owner", value: "{{ownerName}}" },
            { label: "Contractor", value: "{{contractorName}}" },
          ],
          [
            { label: "Project address", value: "{{projectAddress}}" },
            { label: "Walk-through date", value: "{{walkDate}}" },
          ],
        ],
      },
      { t: "p", text: "The owner and the contractor walked through the work together and listed below everything that still needs to be finished or fixed." },
      {
        t: "table",
        columns: ["#", "Item to finish or fix", "Location", "Done (initials)"],
        widths: [0.06, 0.56, 0.2, 0.18],
        rows: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [String(n), `{{fix${n}}}`, `{{where${n}}}`, ""]),
      },
      { t: "clause", title: "1. Finishing the list", text: "The contractor will finish every item on this list by {{finishBy}}, at no extra cost unless the contract says otherwise. When an item is done, the owner checks it and initials it." },
      { t: "clause", title: "2. The contract still applies", text: "This list does not change the contract. Any final payment held back for unfinished work is released as the contract provides once every item is initialed." },
      { t: "sign", parties: [{ role: "Owner", name: "{{ownerName}}" }, { role: "Contractor", name: "{{contractorName}}" }] },
    ],
    notes: ["Walk through together, take dated photos of each item, and keep a signed copy until the last item is initialed."],
  },
  {
    slug: "contractor-info-request",
    version: 1,
    title: "Request for Contractor License and Insurance",
    blanks: "brackets",
    summary: "Asks a contractor for their license, insurance and references before you hire them.",
    fields: [
      ...LETTER_FIELDS,
      { id: "contractorName", label: "Contractor", type: "text", placeholder: "Summit Roofing" },
      { id: "contractorAddress", label: "Contractor's address", type: "long", placeholder: "900 Industrial Way\nPortland, OR 97211" },
      { id: "projectDescription", label: "The project", type: "text", placeholder: "Replacing the roof at 18 Elm St" },
      { id: "replyBy", label: "Reply by", type: "date" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["contractorName", "contractorAddress"] },
      { title: "The project", fields: ["projectDescription", "replyBy"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{contractorName}}\n{{contractorAddress}}", re: "License and insurance information for {{projectDescription}}" },
      { t: "p", text: "Dear {{contractorName}}," },
      { t: "p", text: "Thank you for your bid for {{projectDescription}}. Before I decide, please send me the following:" },
      {
        t: "ol",
        items: [
          "Your contractor license number, the state or local agency that issued it, and its expiration date.",
          "A certificate of general liability insurance, showing the insurer, policy number, coverage amounts and expiration date.",
          "Proof of workers' compensation insurance for anyone who will work on the project, or a note explaining why it doesn't apply.",
          "Your license bond, if your state or city requires one.",
          "Which permits the project needs, and who will get them.",
          "Two or three recent customers I may contact as references.",
        ],
      },
      { t: "p", text: "Please send this by {{replyBy}}. I will check your license and insurance with the issuing agency and insurer before signing a contract." },
      { t: "p", text: "Sincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Check the license yourself on your state contractor board's website. Many let you search by name or number.",
      "Ask the insurer to send the certificate to you directly, so you know it's current.",
    ],
  },
];

// ---------- Renting ----------

export const EVERYDAY_RENTING: TemplateDoc[] = [
  {
    slug: "repair-request",
    version: 1,
    title: "Repair Request to Landlord",
    blanks: "brackets",
    summary: "Puts a repair request in writing: the problem, when it started, and when you need it fixed.",
    fields: [
      ...LETTER_FIELDS,
      { id: "landlordName", label: "Landlord or property manager", type: "text", placeholder: "Harbor Point Properties LLC" },
      { id: "landlordAddress", label: "Landlord's address", type: "long", placeholder: "1200 Bay St\nSeattle, WA 98101" },
      { id: "propertyAddress", label: "Rental address", type: "text", placeholder: "214 Harbor Point Dr, Unit 3B, Seattle, WA" },
      { id: "problem", label: "The problem", type: "long", placeholder: "The kitchen sink leaks under the cabinet, and the cabinet floor is now soft and smells of mold." },
      { id: "startedOn", label: "When it started", type: "date" },
      { id: "reportedBefore", label: "Earlier reports, if any", type: "text", placeholder: "I reported it by phone on November 2" },
      { id: "fixBy", label: "Please fix by", type: "date" },
      { id: "access", label: "Access for repairs", type: "text", placeholder: "Weekdays after 4 pm, or let me know and I'll arrange a time" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["landlordName", "landlordAddress"] },
      { title: "The repair", fields: ["propertyAddress", "problem", "startedOn", "reportedBefore", "fixBy", "access"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{landlordName}}\n{{landlordAddress}}", re: "Repair needed at {{propertyAddress}}" },
      { t: "p", text: "Dear {{landlordName}}," },
      { t: "p", text: "I am writing to ask for a repair at {{propertyAddress}}. The problem is:" },
      { t: "p", text: "{{problem}}" },
      { t: "p", text: "It started on {{startedOn}}. {{reportedBefore}}." },
      { t: "p", text: "Please make this repair by {{fixBy}}. Access for repairs: {{access}}. Please let me know in writing when the work is scheduled." },
      { t: "p", text: "Thank you.\n\nSincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Keep a copy, with photos of the problem and the date you sent it.",
      "Some states let tenants take further steps if serious repairs aren't made, but the rules are strict. Check your state's rules before holding back rent or paying for repairs yourself.",
    ],
  },
  {
    slug: "move-out-checklist",
    version: 1,
    title: "Move-Out Condition Checklist",
    summary: "A room-by-room record of the place when you hand back the keys, to compare with move-in.",
    fields: [
      { id: "propertyAddress", label: "Rental address", type: "text", placeholder: "214 Harbor Point Dr, Unit 3B, Seattle, WA" },
      { id: "tenantNames", label: "Tenants", type: "text", placeholder: "Jordan Lee and Sam Rivera" },
      { id: "landlordName", label: "Landlord or manager", type: "text", placeholder: "Harbor Point Properties LLC" },
      { id: "inspectionDate", label: "Inspection date", type: "date" },
      { id: "keysReturned", label: "Keys and remotes returned", type: "text", placeholder: "2 door keys, 1 mailbox key, 1 garage remote" },
      { id: "forwardingAddress", label: "Tenants' forwarding address", type: "text", placeholder: "77 Lake St, Tacoma, WA 98402" },
    ],
    groups: [{ title: "The rental", fields: ["propertyAddress", "tenantNames", "landlordName", "inspectionDate", "keysReturned", "forwardingAddress"] }],
    body: [
      { t: "title", text: "Move-Out Condition Checklist" },
      {
        t: "boxes",
        rows: [
          [{ label: "Rental address", value: "{{propertyAddress}}" }],
          [
            { label: "Tenants", value: "{{tenantNames}}" },
            { label: "Landlord or manager", value: "{{landlordName}}" },
          ],
          [{ label: "Inspection date", value: "{{inspectionDate}}" }],
        ],
      },
      { t: "p", text: "Write the condition of each item at move-out, and note anything that was already listed on the move-in checklist. Take dated photos of every room." },
      { t: "h", text: "Living areas" },
      { t: "grid", columns: ["Item", "Condition at move-out", "Notes"], rows: ["Walls and ceilings", "Floors and carpet", "Windows, screens and blinds", "Doors and locks", "Lights, switches and outlets", "Heating and air conditioning", "Smoke and carbon monoxide alarms"] },
      { t: "h", text: "Kitchen" },
      { t: "grid", columns: ["Item", "Condition at move-out", "Notes"], rows: ["Refrigerator", "Stove, oven and microwave", "Dishwasher", "Sink and faucet", "Counters", "Cabinets and drawers", "Floor"] },
      { t: "h", text: "Bathrooms" },
      { t: "grid", columns: ["Item", "Condition at move-out", "Notes"], rows: ["Toilet", "Sink and faucet", "Tub and shower", "Tiles and grout", "Mirror and cabinet", "Fan", "Floor"] },
      { t: "h", text: "Bedrooms and other" },
      { t: "grid", columns: ["Item", "Condition at move-out", "Notes"], rows: ["Walls, ceiling and floor", "Closets and doors", "Windows, lights and outlets", "Washer and dryer", "Patio, garage or yard"] },
      {
        t: "boxes",
        rows: [
          [
            { label: "Keys and remotes returned", value: "{{keysReturned}}" },
            { label: "Forwarding address", value: "{{forwardingAddress}}" },
          ],
        ],
      },
      { t: "p", text: "Both parties agree this checklist describes the condition of the rental on the inspection date. Signing it does not mean either party agrees to any deduction from the security deposit." },
      { t: "sign", parties: [{ role: "Tenant(s)" }, { role: "Landlord or manager", name: "{{landlordName}}" }] },
    ],
    notes: [
      "Compare it with your move-in checklist and photos. Normal wear and tear usually can't be charged to your deposit.",
      "Give the landlord your forwarding address in writing so the deposit and any list of deductions reach you.",
    ],
  },
];

// ---------- Work and freelancing ----------

export const EVERYDAY_WORK: TemplateDoc[] = [
  {
    slug: "late-payment-reminder",
    version: 1,
    title: "Late Payment Reminder",
    blanks: "brackets",
    summary: "A polite first reminder to a client whose invoice is overdue.",
    fields: [
      ...LETTER_FIELDS,
      { id: "clientName", label: "Client", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "clientAddress", label: "Client's address", type: "long", placeholder: "500 Pine St\nSeattle, WA 98101" },
      { id: "invoiceNumber", label: "Invoice number", type: "text", placeholder: "1042" },
      { id: "invoiceDate", label: "Invoice date", type: "date" },
      { id: "amountDue", label: "Amount due", type: "money", placeholder: "1750" },
      { id: "dueDate", label: "Original due date", type: "date" },
      { id: "payBy", label: "Please pay by", type: "date" },
      { id: "howToPay", label: "How to pay", type: "text", placeholder: "bank transfer to the account on the invoice, or by card at the invoice link" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["clientName", "clientAddress"] },
      { title: "The invoice", fields: ["invoiceNumber", "invoiceDate", "amountDue", "dueDate", "payBy", "howToPay"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{clientName}}\n{{clientAddress}}", re: "Invoice {{invoiceNumber}}, now overdue" },
      { t: "p", text: "Dear {{clientName}}," },
      { t: "p", text: "This is a friendly reminder that invoice {{invoiceNumber}}, dated {{invoiceDate}}, for {{amountDue}}, was due on {{dueDate}} and has not been paid yet." },
      { t: "p", text: "Please pay the full amount by {{payBy}}, by {{howToPay}}. If you have already paid, thank you, and please send me the payment date and reference so I can match it." },
      { t: "p", text: "If there's a problem with the invoice or the work, please let me know so we can sort it out." },
      { t: "p", text: "Thank you.\n\nSincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Attach a copy of the invoice. Keep the tone friendly in a first reminder; a demand letter comes later if needed.",
      "Only add late fees or interest if your contract or invoice terms allow them.",
    ],
  },
  {
    slug: "resignation-letter",
    version: 1,
    title: "Resignation Letter",
    blanks: "brackets",
    summary: "Gives your employer written notice of your last day, and offers to help hand over your work.",
    fields: [
      ...LETTER_FIELDS,
      { id: "managerName", label: "Your manager", type: "text", placeholder: "Priya Shah" },
      { id: "companyName", label: "Company", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "companyAddress", label: "Company address", type: "long", placeholder: "500 Pine St\nSeattle, WA 98101" },
      { id: "jobTitle", label: "Your job title", type: "text", placeholder: "Store manager" },
      { id: "lastDay", label: "Your last day", type: "date" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["managerName", "companyName", "companyAddress"] },
      { title: "Your notice", fields: ["jobTitle", "lastDay"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{managerName}}\n{{companyName}}\n{{companyAddress}}", re: "Resignation" },
      { t: "p", text: "Dear {{managerName}}," },
      { t: "p", text: "Please accept this letter as notice that I am resigning from my position as {{jobTitle}} at {{companyName}}. My last day will be {{lastDay}}." },
      { t: "p", text: "I'm glad to help with the handover before I leave, including documenting my work and training whoever takes it on." },
      { t: "p", text: "Please let me know what I need to return, and send details of my final pay, any unused paid time off, and benefits to the address above." },
      { t: "p", text: "Thank you for the opportunity to work here.\n\nSincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Check your employment contract or handbook for a required notice period. Two weeks is common but not required everywhere.",
      "Rules on final paychecks and unused vacation pay vary by state.",
    ],
  },
];

// ---------- Creators and social media ----------

export const EVERYDAY_CREATORS: TemplateDoc[] = [
  {
    slug: "dmca-takedown",
    version: 1,
    title: "Copyright Takedown Notice (DMCA)",
    blanks: "brackets",
    summary: "Asks a website or platform to remove a copy of your work posted without permission.",
    fields: [
      ...LETTER_FIELDS,
      { id: "yourEmail", label: "Your email", type: "email", placeholder: "jordan@example.com" },
      { id: "yourPhone", label: "Your phone", type: "phone", placeholder: "(503) 555-0142" },
      { id: "platformName", label: "Website or platform", type: "text", placeholder: "Example Video Inc." },
      { id: "agentAddress", label: "Its copyright agent's address or email", type: "long", placeholder: "Copyright Agent\n100 Market St\nSan Francisco, CA 94105\ncopyright@example.com" },
      { id: "originalWork", label: "Your original work", type: "long", placeholder: "My video \"Pour-over at home\", first posted March 3, 2027 at youtube.com/watch?v=..." },
      { id: "infringingLinks", label: "Where the copy is (exact links)", type: "long", placeholder: "https://example.com/v/12345" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "yourEmail", "yourPhone", "letterDate"] },
      { title: "To", fields: ["platformName", "agentAddress"] },
      { title: "The copy", fields: ["originalWork", "infringingLinks"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}\n{{yourEmail}}\n{{yourPhone}}", date: "{{letterDate}}", to: "Designated Copyright Agent\n{{platformName}}\n{{agentAddress}}", re: "Notice of copyright infringement under 17 U.S.C. § 512(c)" },
      { t: "p", text: "Dear Copyright Agent," },
      { t: "p", text: "I am writing to report material on your service that infringes a copyright I own, and to ask you to remove it or disable access to it." },
      { t: "clause", title: "1. The copyrighted work", text: "{{originalWork}}" },
      { t: "clause", title: "2. The infringing material and where it is", text: "{{infringingLinks}}" },
      { t: "clause", title: "3. Contact information", text: "You can reach me at the address, email and phone number above." },
      { t: "clause", title: "4. Good-faith statement", text: "I have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law." },
      { t: "clause", title: "5. Accuracy statement", text: "The information in this notification is accurate, and under penalty of perjury, I am the owner, or am authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed." },
      { t: "p", text: "Sincerely," },
      { t: "sign", parties: [{ role: "Copyright owner or authorized agent", name: "{{yourName}}" }] },
    ],
    notes: [
      "Send it to the platform's designated copyright agent. Most list one on their copyright page, and the U.S. Copyright Office keeps a directory of agents.",
      "Only send it if the work is yours (or you're authorized) and the use isn't fair use. Knowingly false claims can make you liable for damages under 17 U.S.C. § 512(f).",
      "The person who posted it can send a counter-notice, and the platform may then restore it.",
    ],
  },
];

// ---------- Business ----------

const paymentTotals = (totalLabel: string) => ({
  t: "amounts" as const,
  rows: [
    { label: "Subtotal", value: "{{subtotal}}" },
    { label: "Tax", value: "{{tax}}" },
    { label: totalLabel, value: "{{total}}", total: true },
  ],
});

const totalsFields = [
  { id: "subtotal", label: "Subtotal", type: "money" as const, placeholder: "3500" },
  { id: "tax", label: "Tax", type: "money" as const, placeholder: "0" },
  { id: "total", label: "Total", type: "money" as const, placeholder: "3500" },
];

export const EVERYDAY_BUSINESS: TemplateDoc[] = [
  {
    slug: "invoice",
    version: 1,
    title: "Invoice",
    summary: "Bills a client for work or goods: what, how much, when it's due and how to pay.",
    fields: [
      { id: "invoiceNumber", label: "Invoice no.", type: "text", placeholder: "1042" },
      { id: "fromName", label: "From (your business)", type: "text", placeholder: "Jordan Lee Design" },
      { id: "fromContact", label: "Your address or email", type: "text", placeholder: "48 Willow Ave, Portland, OR · jordan@example.com" },
      { id: "billToName", label: "Bill to", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "billToContact", label: "Client's address or email", type: "text", placeholder: "500 Pine St, Seattle, WA · ops@northwind.example" },
      { id: "invoiceDate", label: "Invoice date", type: "date" },
      { id: "dueDate", label: "Due date", type: "date" },
      { id: "terms", label: "Terms", type: "text", placeholder: "Net 15" },
      ...items.fields,
      ...totalsFields,
      { id: "paymentDetails", label: "How to pay", type: "long", placeholder: "Bank transfer: Example Bank, account 000123456, routing 000000000. Or pay by card at the link in the email." },
    ],
    groups: [
      { title: "Invoice", fields: ["invoiceNumber", "invoiceDate", "dueDate", "terms"] },
      { title: "From and to", fields: ["fromName", "fromContact", "billToName", "billToContact"] },
      { title: "Items", fields: [...items.ids, "subtotal", "tax", "total"] },
      { title: "Payment", fields: ["paymentDetails"] },
    ],
    body: [
      { t: "title", text: "Invoice", aside: "No. {{invoiceNumber}}" },
      {
        t: "boxes",
        rows: [
          [
            { label: "From", value: "{{fromName}}" },
            { label: "Bill to", value: "{{billToName}}" },
          ],
          [
            { label: "Address or email", value: "{{fromContact}}" },
            { label: "Address or email", value: "{{billToContact}}" },
          ],
          [
            { label: "Invoice date", value: "{{invoiceDate}}" },
            { label: "Due date", value: "{{dueDate}}" },
            { label: "Terms", value: "{{terms}}" },
          ],
        ],
      },
      items.table,
      paymentTotals("Total due"),
      { t: "clause", title: "How to pay", text: "{{paymentDetails}}" },
      { t: "p", text: "Thank you for your business." },
    ],
    notes: [
      "Number invoices in order and keep a copy of each for your taxes.",
      "Whether you charge sales tax depends on what you sell and where. Check your state's rules.",
    ],
  },
  {
    slug: "estimate",
    version: 1,
    title: "Estimate",
    summary: "A price quote for a job before it starts: the work, the price, and how long the price holds.",
    fields: [
      { id: "estimateNumber", label: "Estimate no.", type: "text", placeholder: "Q-207" },
      { id: "fromName", label: "From (your business)", type: "text", placeholder: "Jordan Lee Design" },
      { id: "fromContact", label: "Your address or email", type: "text", placeholder: "48 Willow Ave, Portland, OR · jordan@example.com" },
      { id: "clientName", label: "Prepared for", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "clientContact", label: "Client's address or email", type: "text", placeholder: "500 Pine St, Seattle, WA" },
      { id: "estimateDate", label: "Date", type: "date" },
      { id: "validUntil", label: "Valid until", type: "date" },
      { id: "scope", label: "The work", type: "long", placeholder: "Design a logo, a one-page brand guide and social media templates." },
      ...items.fields,
      ...totalsFields,
      { id: "paymentTerms", label: "Payment terms", type: "text", placeholder: "50% to start, 50% on delivery" },
    ],
    groups: [
      { title: "Estimate", fields: ["estimateNumber", "estimateDate", "validUntil"] },
      { title: "From and to", fields: ["fromName", "fromContact", "clientName", "clientContact"] },
      { title: "The work", fields: ["scope", ...items.ids, "subtotal", "tax", "total", "paymentTerms"] },
    ],
    body: [
      { t: "title", text: "Estimate", aside: "No. {{estimateNumber}}" },
      {
        t: "boxes",
        rows: [
          [
            { label: "From", value: "{{fromName}}" },
            { label: "Prepared for", value: "{{clientName}}" },
          ],
          [
            { label: "Address or email", value: "{{fromContact}}" },
            { label: "Address or email", value: "{{clientContact}}" },
          ],
          [
            { label: "Date", value: "{{estimateDate}}" },
            { label: "Valid until", value: "{{validUntil}}" },
          ],
        ],
      },
      { t: "clause", title: "The work", text: "{{scope}}" },
      items.table,
      paymentTotals("Estimated total"),
      { t: "clause", title: "1. About this estimate", text: "This is an estimate, not a final bill. The prices above hold until {{validUntil}}. If the work changes, the price may change, and any change will be agreed in writing first." },
      { t: "clause", title: "2. Payment", text: "{{paymentTerms}}." },
      { t: "clause", title: "3. Accepting", text: "To go ahead, sign below and return this estimate. Work starts after it is accepted." },
      { t: "sign", parties: [{ role: "Accepted by (client)", name: "{{clientName}}" }] },
    ],
    notes: ["For larger jobs, pair an accepted estimate with a services agreement or freelance contract that covers ownership, changes and ending the work."],
  },
  {
    slug: "purchase-order",
    version: 1,
    title: "Purchase Order",
    summary: "Orders goods or services from a supplier: what you're buying, the price, and where and when to deliver.",
    fields: [
      { id: "poNumber", label: "PO no.", type: "text", placeholder: "PO-3318" },
      { id: "buyerName", label: "Buyer (your business)", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "vendorName", label: "Vendor", type: "text", placeholder: "Cascade Packaging Supply" },
      { id: "shipTo", label: "Ship to", type: "text", placeholder: "500 Pine St, Seattle, WA 98101" },
      { id: "poDate", label: "Order date", type: "date" },
      { id: "deliverBy", label: "Deliver by", type: "date" },
      ...items.fields,
      ...totalsFields,
      { id: "paymentTerms", label: "Payment terms", type: "text", placeholder: "Net 30 from delivery" },
    ],
    groups: [
      { title: "Order", fields: ["poNumber", "poDate", "deliverBy"] },
      { title: "Buyer and vendor", fields: ["buyerName", "vendorName", "shipTo"] },
      { title: "Items", fields: [...items.ids, "subtotal", "tax", "total", "paymentTerms"] },
    ],
    body: [
      { t: "title", text: "Purchase Order", aside: "No. {{poNumber}}" },
      {
        t: "boxes",
        rows: [
          [
            { label: "Buyer", value: "{{buyerName}}" },
            { label: "Vendor", value: "{{vendorName}}" },
          ],
          [{ label: "Ship to", value: "{{shipTo}}" }],
          [
            { label: "Order date", value: "{{poDate}}" },
            { label: "Deliver by", value: "{{deliverBy}}" },
          ],
        ],
      },
      items.table,
      paymentTotals("Order total"),
      { t: "clause", title: "1. Confirming", text: "Please confirm this order, the prices and the delivery date in writing before shipping." },
      { t: "clause", title: "2. Delivery", text: "Deliver to the address above by the date above. Tell the buyer right away if anything will be late, short or substituted." },
      { t: "clause", title: "3. Invoicing and payment", text: "Show the PO number on your invoice and packing slip. Payment terms: {{paymentTerms}}." },
      { t: "sign", parties: [{ role: "Authorized by (buyer)", name: "{{buyerName}}" }] },
    ],
    notes: ["If you have a supply agreement with this vendor, its terms usually apply to every purchase order."],
  },
  {
    slug: "testimonial-release",
    version: 1,
    title: "Testimonial Permission",
    summary: "A customer's permission to use their review, name or photo in your marketing.",
    fields: [
      { id: "businessName", label: "Business", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "customerName", label: "Customer", type: "text", placeholder: "Sam Rivera" },
      { id: "testimonial", label: "The testimonial", type: "long", placeholder: "\"Best cold brew in Seattle. The staff remember my order every time.\"" },
      { id: "includes", label: "What may be used with it", type: "text", placeholder: "First name, last initial, city and photo" },
      { id: "whereUsed", label: "Where it may be used", type: "text", placeholder: "Website, social media and in-store signs" },
      { id: "incentive", label: "Anything given in return", type: "text", placeholder: "None" },
    ],
    groups: [{ title: "The permission", fields: ["businessName", "customerName", "testimonial", "includes", "whereUsed", "incentive"] }],
    body: [
      { t: "title", text: "Testimonial Permission" },
      {
        t: "boxes",
        rows: [
          [
            { label: "Business", value: "{{businessName}}" },
            { label: "Customer", value: "{{customerName}}" },
          ],
        ],
      },
      { t: "clause", title: "1. The testimonial", text: "{{testimonial}}" },
      { t: "clause", title: "2. Permission", text: "The customer gives the business permission to use the testimonial above, along with: {{includes}}, in these places: {{whereUsed}}. The business may shorten it for space but will not change its meaning." },
      { t: "clause", title: "3. Honest opinion", text: "The customer confirms the testimonial is their honest opinion from their own experience. Anything the business gave in return: {{incentive}}. If the customer received something of value, the business will disclose that alongside the testimonial." },
      { t: "clause", title: "4. Taking it back", text: "The customer may ask in writing for the testimonial to stop being used. The business will stop new uses within a reasonable time. Printed materials already made may be used up." },
      { t: "sign", parties: [{ role: "Customer", name: "{{customerName}}" }, { role: "Business", name: "{{businessName}}" }] },
    ],
    notes: [
      "Under the FTC's Endorsement Guides, testimonials must reflect real experiences, and any payment, discount or free product given for one must be disclosed.",
      "Don't present one customer's unusual results as typical.",
    ],
  },
  {
    slug: "cancellation-letter",
    version: 1,
    title: "Cancellation Letter",
    blanks: "brackets",
    summary: "Cancels a subscription, membership or service, and asks the company to stop billing you.",
    fields: [
      ...LETTER_FIELDS,
      { id: "companyName", label: "Company", type: "text", placeholder: "FitLife Gyms" },
      { id: "companyAddress", label: "Company's address", type: "long", placeholder: "PO Box 2200\nDenver, CO 80201" },
      { id: "serviceName", label: "Service or membership", type: "text", placeholder: "Monthly gym membership" },
      { id: "accountNumber", label: "Account or member number", type: "text", placeholder: "FL-88213" },
      { id: "cancelDate", label: "Cancel as of", type: "date" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["companyName", "companyAddress"] },
      { title: "The account", fields: ["serviceName", "accountNumber", "cancelDate"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{companyName}}\n{{companyAddress}}", re: "Cancellation of account {{accountNumber}}" },
      { t: "p", text: "Dear {{companyName}}," },
      { t: "p", text: "Please cancel my {{serviceName}}, account {{accountNumber}}, as of {{cancelDate}}." },
      { t: "p", text: "Please stop all charges to my card or bank account after that date. I withdraw my authorization for any further recurring payments. If any part of a payment covers time after the cancellation date and your terms allow a refund, please refund it." },
      { t: "p", text: "Please confirm the cancellation, and that no more charges will be made, in writing." },
      { t: "p", text: "Sincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Check your contract for a required notice period or cancellation method, and send it that way if there is one.",
      "Keep proof you sent it. If charges continue after cancellation, you can dispute them with your bank or card issuer.",
    ],
  },
  {
    slug: "meeting-minutes",
    version: 1,
    title: "Meeting Minutes",
    summary: "A record of a meeting: who was there, what was decided, and who does what next.",
    fields: [
      { id: "orgName", label: "Organization or team", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "meetingDate", label: "Date", type: "date" },
      { id: "meetingTime", label: "Time", type: "text", placeholder: "10:00 am" },
      { id: "location", label: "Location", type: "text", placeholder: "Pine St office and video call" },
      { id: "attendees", label: "Attendees", type: "long", placeholder: "Priya Shah (chair), Jordan Lee, Sam Rivera" },
      { id: "discussion", label: "Discussion", type: "long", placeholder: "Reviewed spring menu launch timeline and supplier quotes." },
      { id: "decisions", label: "Decisions", type: "long", placeholder: "Approved Cascade Packaging as cup supplier. Launch moved to April 14." },
      ...[1, 2, 3, 4].flatMap((n) => [
        { id: `action${n}`, label: `Action ${n}`, type: "text" as const, placeholder: n === 1 ? "Send signed PO to Cascade" : "" },
        { id: `owner${n}`, label: `Owner ${n}`, type: "text" as const, placeholder: n === 1 ? "Sam" : "" },
        { id: `due${n}`, label: `Due ${n}`, type: "text" as const, placeholder: n === 1 ? "March 20" : "" },
      ]),
      { id: "nextMeeting", label: "Next meeting", type: "text", placeholder: "April 3, 10:00 am" },
      { id: "recorder", label: "Recorded by", type: "text", placeholder: "Jordan Lee" },
    ],
    groups: [
      { title: "Meeting", fields: ["orgName", "meetingDate", "meetingTime", "location", "attendees"] },
      { title: "Notes", fields: ["discussion", "decisions"] },
      { title: "Actions", fields: [...[1, 2, 3, 4].flatMap((n) => [`action${n}`, `owner${n}`, `due${n}`]), "nextMeeting", "recorder"] },
    ],
    body: [
      { t: "title", text: "Meeting Minutes" },
      {
        t: "boxes",
        rows: [
          [{ label: "Organization or team", value: "{{orgName}}" }],
          [
            { label: "Date", value: "{{meetingDate}}" },
            { label: "Time", value: "{{meetingTime}}" },
            { label: "Location", value: "{{location}}" },
          ],
        ],
      },
      { t: "clause", title: "Attendees", text: "{{attendees}}" },
      { t: "clause", title: "Discussion", text: "{{discussion}}" },
      { t: "clause", title: "Decisions", text: "{{decisions}}" },
      { t: "h", text: "Action items" },
      {
        t: "table",
        columns: ["Action", "Owner", "Due"],
        widths: [0.6, 0.22, 0.18],
        rows: [1, 2, 3, 4].map((n) => [`{{action${n}}}`, `{{owner${n}}}`, `{{due${n}}}`]),
      },
      { t: "p", text: "Next meeting: {{nextMeeting}}" },
      { t: "sign", parties: [{ role: "Recorded by", name: "{{recorder}}" }] },
    ],
    notes: ["For a company's formal board or member meetings, your state law and bylaws may require particular details in the minutes."],
  },
  {
    slug: "price-increase-notice",
    version: 1,
    title: "Price Increase Notice",
    blanks: "brackets",
    summary: "Tells a client or customer about a new price, when it starts, and what stays the same.",
    fields: [
      ...LETTER_FIELDS,
      { id: "clientName", label: "Client or customer", type: "text", placeholder: "Northwind Coffee Co." },
      { id: "clientAddress", label: "Their address", type: "long", placeholder: "500 Pine St\nSeattle, WA 98101" },
      { id: "serviceName", label: "Service or product", type: "text", placeholder: "monthly bookkeeping" },
      { id: "oldPrice", label: "Current price", type: "text", placeholder: "$400 per month" },
      { id: "newPrice", label: "New price", type: "text", placeholder: "$450 per month" },
      { id: "effectiveDate", label: "New price starts", type: "date" },
      { id: "reason", label: "Why (optional)", type: "text", placeholder: "rising software and payroll costs" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["clientName", "clientAddress"] },
      { title: "The change", fields: ["serviceName", "oldPrice", "newPrice", "effectiveDate", "reason"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{clientName}}\n{{clientAddress}}", re: "New pricing for {{serviceName}}" },
      { t: "p", text: "Dear {{clientName}}," },
      { t: "p", text: "Thank you for working with us. I'm writing to let you know that starting {{effectiveDate}}, the price of {{serviceName}} will change from {{oldPrice}} to {{newPrice}}, because of {{reason}}." },
      { t: "p", text: "Everything else about the service stays the same. Work done and invoices issued before that date stay at the current price." },
      { t: "p", text: "If you have questions or would like to talk about your options, please reply or call me." },
      { t: "p", text: "Sincerely,\n\n{{yourName}}" },
    ],
    notes: ["If you have a contract with this client, check it first: it may fix the price for a term or require a certain amount of notice before a change."],
  },
];

// ---------- Buying and selling ----------

export const EVERYDAY_SELLING: TemplateDoc[] = [
  {
    slug: "payment-receipt",
    version: 1,
    title: "Payment Receipt",
    summary: "Confirms a payment: who paid whom, how much, for what, and any balance left.",
    fields: [
      { id: "receiptNumber", label: "Receipt no.", type: "text", placeholder: "R-0193" },
      { id: "receivedFrom", label: "Received from", type: "text", placeholder: "Sam Rivera" },
      { id: "paidTo", label: "Paid to", type: "text", placeholder: "Jordan Lee" },
      { id: "paymentDate", label: "Date paid", type: "date" },
      { id: "amount", label: "Amount", type: "money", placeholder: "650" },
      { id: "method", label: "Paid by", type: "text", placeholder: "Cash" },
      { id: "paidFor", label: "For", type: "text", placeholder: "Trek FX 3 bicycle" },
      { id: "balance", label: "Balance still owed", type: "money", placeholder: "0" },
    ],
    groups: [{ title: "The payment", fields: ["receiptNumber", "receivedFrom", "paidTo", "paymentDate", "amount", "method", "paidFor", "balance"] }],
    body: [
      { t: "title", text: "Payment Receipt", aside: "No. {{receiptNumber}}" },
      {
        t: "boxes",
        rows: [
          [
            { label: "Received from", value: "{{receivedFrom}}" },
            { label: "Paid to", value: "{{paidTo}}" },
          ],
          [
            { label: "Date paid", value: "{{paymentDate}}" },
            { label: "Amount", value: "{{amount}}" },
            { label: "Paid by", value: "{{method}}" },
          ],
          [{ label: "For", value: "{{paidFor}}" }],
          [{ label: "Balance still owed", value: "{{balance}}" }],
        ],
      },
      { t: "p", text: "The person signing below confirms they received the payment described above." },
      { t: "sign", parties: [{ role: "Received by", name: "{{paidTo}}" }] },
    ],
    notes: ["Give the payer a signed copy and keep one yourself."],
  },
];

// ---------- Money and disputes ----------

export const EVERYDAY_MONEY: TemplateDoc[] = [
  {
    slug: "credit-report-dispute",
    version: 1,
    title: "Credit Report Dispute Letter",
    blanks: "brackets",
    summary: "Asks a credit bureau to investigate and correct a mistake on your credit report.",
    fields: [
      ...LETTER_FIELDS,
      { id: "bureauName", label: "Credit bureau", type: "text", placeholder: "Equifax Information Services LLC" },
      { id: "bureauAddress", label: "Bureau's dispute address", type: "long", placeholder: "PO Box 740256\nAtlanta, GA 30374" },
      { id: "reportNumber", label: "Report or confirmation number", type: "text", placeholder: "1234567890" },
      { id: "itemsDisputed", label: "Items you dispute", type: "long", placeholder: "Main Street Medical, account ending 4411, shown as 90 days late in May 2026." },
      { id: "whyWrong", label: "Why they're wrong", type: "long", placeholder: "I paid this bill in full on April 2, 2026. A copy of the receipt is enclosed." },
      { id: "enclosures", label: "What you're enclosing", type: "text", placeholder: "Copy of my report with the item circled, payment receipt, copy of my ID" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["bureauName", "bureauAddress", "reportNumber"] },
      { title: "The dispute", fields: ["itemsDisputed", "whyWrong", "enclosures"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{bureauName}}\n{{bureauAddress}}", re: "Dispute of information in my credit report, report number {{reportNumber}}" },
      { t: "p", text: "Dear Sir or Madam," },
      { t: "p", text: "I am writing to dispute the following information in my credit report. The items I dispute are:" },
      { t: "p", text: "{{itemsDisputed}}" },
      { t: "p", text: "This information is inaccurate because:" },
      { t: "p", text: "{{whyWrong}}" },
      { t: "p", text: "I am asking that the information be removed or corrected. Enclosed are copies of: {{enclosures}}." },
      { t: "p", text: "Please investigate this matter and correct the disputed items as soon as possible, and send me the results and an updated copy of my report." },
      { t: "p", text: "Sincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Send it by certified mail with a return receipt, and send copies of documents, never originals. Each bureau (Equifax, Experian, TransUnion) has its own dispute address.",
      "Under the Fair Credit Reporting Act, the bureau generally must investigate within 30 days. You can also dispute with the company that reported the information.",
    ],
    basedOn: "the Federal Trade Commission's sample letter for disputing errors on credit reports (public domain).",
  },
  {
    slug: "itemized-bill-request",
    version: 1,
    title: "Request for an Itemized Bill",
    blanks: "brackets",
    summary: "Asks a hospital, doctor or other provider for a line-by-line bill before you pay.",
    fields: [
      ...LETTER_FIELDS,
      { id: "providerName", label: "Provider", type: "text", placeholder: "Main Street Medical Center" },
      { id: "providerAddress", label: "Billing address", type: "long", placeholder: "Patient Billing\nPO Box 3300\nPortland, OR 97208" },
      { id: "accountNumber", label: "Account number", type: "text", placeholder: "MS-552901" },
      { id: "serviceDates", label: "Dates of service", type: "text", placeholder: "February 10 to 12, 2027" },
      { id: "patientName", label: "Patient's name", type: "text", placeholder: "Jordan Lee" },
    ],
    groups: [
      { title: "From", fields: ["yourName", "yourAddress", "letterDate"] },
      { title: "To", fields: ["providerName", "providerAddress"] },
      { title: "The bill", fields: ["accountNumber", "patientName", "serviceDates"] },
    ],
    body: [
      { t: "letter", from: "{{yourName}}\n{{yourAddress}}", date: "{{letterDate}}", to: "{{providerName}}\n{{providerAddress}}", re: "Request for itemized bill, account {{accountNumber}}" },
      { t: "p", text: "Dear Billing Department," },
      { t: "p", text: "Please send me a fully itemized bill for account {{accountNumber}}, for services to {{patientName}} on {{serviceDates}}. Please include:" },
      {
        t: "ul",
        items: [
          "Each service, supply and medication, with the date and the charge for each.",
          "The billing code for each line (such as CPT, HCPCS or revenue codes).",
          "All payments, insurance payments and adjustments applied to the account.",
          "The balance you say I owe, and how it was calculated.",
        ],
      },
      { t: "p", text: "While I review the bill, please do not send this account to collections. I will contact you about any questions once I receive it." },
      { t: "p", text: "Sincerely,\n\n{{yourName}}" },
    ],
    notes: [
      "Compare the itemized bill with your insurer's explanation of benefits. Duplicate charges and services you didn't receive are common errors.",
      "Keep paying attention to deadlines on the bill while you wait, and ask about a payment plan or financial assistance if you need one.",
    ],
  },
];

// ---------- Personal and family ----------

export const EVERYDAY_PERSONAL: TemplateDoc[] = [
  {
    slug: "pet-sitting-agreement",
    version: 1,
    title: "Pet Sitting Agreement",
    summary: "Dates, fee, care instructions and an emergency plan for someone looking after your pets.",
    fields: [
      { id: "ownerName", label: "Owner", type: "text", placeholder: "Jordan Lee" },
      { id: "ownerPhone", label: "Owner's phone", type: "phone", placeholder: "(503) 555-0142" },
      { id: "sitterName", label: "Sitter", type: "text", placeholder: "Alex Chen" },
      { id: "sitterPhone", label: "Sitter's phone", type: "phone", placeholder: "(503) 555-0177" },
      { id: "startDate", label: "From", type: "date" },
      { id: "endDate", label: "To", type: "date" },
      { id: "pets", label: "The pets", type: "long", placeholder: "Miso, 4-year-old cat, indoor only. Biscuit, 6-year-old beagle, friendly with people, not with other dogs." },
      { id: "care", label: "Care instructions", type: "long", placeholder: "Feed twice a day (7 am, 6 pm). Walk Biscuit 3 times a day. Miso's medication: half a pill in food each morning." },
      { id: "fee", label: "Fee", type: "text", placeholder: "$40 per day, paid on the last day" },
      { id: "vetName", label: "Vet and phone", type: "text", placeholder: "Willow Animal Clinic, (503) 555-0110" },
      { id: "emergencyLimit", label: "Emergency vet spending limit", type: "money", placeholder: "500" },
      { id: "keys", label: "Keys and access", type: "text", placeholder: "Spare key in lockbox, code given separately" },
    ],
    groups: [
      { title: "Who", fields: ["ownerName", "ownerPhone", "sitterName", "sitterPhone"] },
      { title: "When and pay", fields: ["startDate", "endDate", "fee", "keys"] },
      { title: "The pets", fields: ["pets", "care", "vetName", "emergencyLimit"] },
    ],
    body: [
      { t: "title", text: "Pet Sitting Agreement" },
      {
        t: "boxes",
        rows: [
          [
            { label: "Owner", value: "{{ownerName}}" },
            { label: "Owner's phone", value: "{{ownerPhone}}" },
          ],
          [
            { label: "Sitter", value: "{{sitterName}}" },
            { label: "Sitter's phone", value: "{{sitterPhone}}" },
          ],
          [
            { label: "From", value: "{{startDate}}" },
            { label: "To", value: "{{endDate}}" },
            { label: "Fee", value: "{{fee}}" },
          ],
        ],
      },
      { t: "clause", title: "1. The pets", text: "{{pets}}" },
      { t: "clause", title: "2. Care", text: "{{care}}" },
      { t: "clause", title: "3. Keys and the home", text: "{{keys}}. The sitter will keep the home secure, use it only to care for the pets, and return all keys at the end." },
      { t: "clause", title: "4. Emergencies", text: "If a pet is sick or hurt, the sitter will call the owner and the vet: {{vetName}}. If the owner can't be reached, the sitter may approve emergency treatment up to {{emergencyLimit}}, and the owner will pay the vet." },
      { t: "clause", title: "5. Responsibility", text: "The owner confirms the pets' vaccinations are up to date and has told the sitter about any behavior issues. The sitter will follow these instructions and take reasonable care." },
      { t: "sign", parties: [{ role: "Owner", name: "{{ownerName}}" }, { role: "Sitter", name: "{{sitterName}}" }] },
    ],
    notes: ["Leave the vet a note that the sitter may bring your pets in and approve care up to your limit."],
  },
  {
    slug: "car-use-permission",
    version: 1,
    title: "Permission to Use My Vehicle",
    summary: "Lets someone else drive your car, for set dates and a set purpose.",
    fields: [
      { id: "ownerName", label: "Vehicle owner", type: "text", placeholder: "Jordan Lee" },
      { id: "ownerPhone", label: "Owner's phone", type: "phone", placeholder: "(503) 555-0142" },
      { id: "driverName", label: "Driver", type: "text", placeholder: "Sam Rivera" },
      { id: "driverLicense", label: "Driver's license no. and state", type: "text", placeholder: "OR 1234567" },
      { id: "vehicle", label: "Vehicle (year, make, model, color)", type: "text", placeholder: "2021 Honda Civic, blue" },
      { id: "plate", label: "License plate", type: "text", placeholder: "OR 123 ABC" },
      { id: "vin", label: "VIN", type: "text", placeholder: "1HGBH41JXMN109186" },
      { id: "startDate", label: "From", type: "date" },
      { id: "endDate", label: "To", type: "date" },
      { id: "purpose", label: "Purpose and limits", type: "text", placeholder: "Commuting to work; no trips outside Oregon" },
    ],
    groups: [
      { title: "Owner and driver", fields: ["ownerName", "ownerPhone", "driverName", "driverLicense"] },
      { title: "The vehicle", fields: ["vehicle", "plate", "vin"] },
      { title: "Use", fields: ["startDate", "endDate", "purpose"] },
    ],
    body: [
      { t: "title", text: "Permission to Use My Vehicle" },
      {
        t: "boxes",
        rows: [
          [
            { label: "Owner", value: "{{ownerName}}" },
            { label: "Owner's phone", value: "{{ownerPhone}}" },
          ],
          [
            { label: "Driver", value: "{{driverName}}" },
            { label: "Driver's license", value: "{{driverLicense}}" },
          ],
          [
            { label: "Vehicle", value: "{{vehicle}}" },
            { label: "Plate", value: "{{plate}}" },
          ],
          [{ label: "VIN", value: "{{vin}}" }],
          [
            { label: "From", value: "{{startDate}}" },
            { label: "To", value: "{{endDate}}" },
          ],
        ],
      },
      { t: "clause", title: "1. Permission", text: "I, the owner named above, give the driver named above permission to drive the vehicle above between these dates, for this purpose: {{purpose}}." },
      { t: "clause", title: "2. The driver's responsibilities", text: "The driver confirms they hold a valid driver's license, will obey traffic laws, will not let anyone else drive, and will pay any tickets, tolls or parking fines from the time they have the vehicle." },
      { t: "clause", title: "3. Insurance", text: "The owner's insurance may or may not cover other drivers. This permission does not change any insurance policy." },
      { t: "p", text: "Questions about this permission can be directed to the owner at the phone number above." },
      { t: "sign", parties: [{ role: "Owner", name: "{{ownerName}}" }, { role: "Driver", name: "{{driverName}}" }] },
    ],
    notes: [
      "Check with your insurer that the driver is covered before handing over the keys.",
      "Keep this with the registration and insurance card in the vehicle. Some situations, like crossing a border, may need it notarized.",
    ],
  },
];
