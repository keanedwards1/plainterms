# Template sources

Source documents for PlainTerms templates. Every file here is either a US federal government work (public domain under 17 U.S.C. 105) or the text of a statute (laws are not copyrightable). We can copy, change, fill in and charge for them.

Each `.txt` file is a plain-text copy of the original next to it, extracted for building our own fill-in templates. Downloaded 2026-11-27.

Rules for adding to this folder:

- Only add a source if its licence allows commercial use **and** changes: public domain, CC0, CC BY 4.0, or statute text.
- Never add CC BY-ND (no changes), CC BY-NC (no commercial use), or "free to download" sites (LegalZoom, Rocket Lawyer, LawDepot, eForms, Template.net, Nolo, law firm blogs).
- State agency and court websites are not automatically public domain. Use them only for statute text, or after checking that site's copyright notice.
- A GitHub repo's MIT licence covers what its authors wrote. It doesn't cover forms they copied from someone else.
- Record each new source below: URL, licence, date and which template it feeds.

## Federal works (public domain)

### CFPB debt collection response letters — `cfpb-debt-collection/`

Five sample letters from the Consumer Financial Protection Bureau (July 2013, updated May 2014). Licence: CFPB-created content is public domain (CFPB website legal notices); credit is requested.

| File | Use |
|---|---|
| `201307_cfpb_debt-collection-letter_1-not-my-debt.doc` | Tell a collector the debt isn't yours |
| `201307_cfpb_debt-collection-letter-2_more-information.doc` | Ask a collector to prove the debt |
| `201307_cfpb_debt-collection-letter-3_stop-contacting.doc` | Tell a collector to stop contacting you |
| `201307_cfpb_debt-collection-letter-4_contact-my-lawyer.doc` | Send all contact to your lawyer |
| `201307_cfpb_debt-collection-letter-5_heres-how-to-contact-me.doc` | Limit how and when a collector contacts you |

Source: https://www.consumerfinance.gov/archive/blog/debtcollection/ (files at `https://files.consumerfinance.gov/f/<name>.doc`). Feeds a new "Money and disputes" template set.

### EPA lessor lead-based paint disclosure — `epa-lead-disclosure/`

`lessor-disclosure-en.pdf`: EPA Form 9600-041, "Disclosure of Information on Lead-Based Paint and/or Lead-Based Paint Hazards", for leases of housing built before 1978. Licence: US federal work, public domain. Landlords don't have to use this exact form, but they must give the same disclosures (40 CFR 745 subpart F).

Source: https://www.epa.gov/sites/default/files/documents/lesr_eng.pdf (landing page https://www.epa.gov/lead/lead-based-paint-disclosure-rule-section-1018-title-x). Feeds `lease-addendum` (a lead disclosure addendum) and any future lease template.

### FTC sample letters (reference only, not downloaded)

The FTC site blocks scripted downloads, so these weren't saved. Their content is public domain (https://www.ftc.gov/site-information/website-policy, "Copyright Permission"; suggested credit: "Source: United States Federal Trade Commission, www.ftc.gov").

- Sample customer complaint letter (Nov 2023): https://consumer.ftc.gov/articles/sample-customer-complaint-letter. Model for `contractor-complaint` and `demand-letter`. It covers what was bought and when, what went wrong, the fix wanted, enclosed records and a deadline.
- Sample letter disputing credit report errors with the business that supplied them (May 2021): https://consumer.ftc.gov/articles/sample-letter-disputing-errors-credit-reports-business-supplied-information.

To keep a copy, save the pages from a browser into `ftc/`.

## Statutory forms (statute text, not copyrightable)

### California lien waivers: Civil Code §§ 8132, 8134, 8136, 8138 — `ca-lien-waivers/`

A waiver and release in California is void unless it is in substantially the statutory form, so use this wording as is and fill in only the blanks. These are the Contractors State License Board's layouts of the four statutory forms, dated 7/1/12 (the date the sections took effect):

| File | Section | When |
|---|---|---|
| `ConditionalWaiverAndReleaseOnProgressPayment.pdf` | 8132 | Progress payment, not yet paid |
| `UnconditionalWaiverAndReleaseOnProgressPayment.pdf` | 8134 | Progress payment, already paid |
| `ConditionalWaiverAndReleaseOnFinalPayment.pdf` | 8136 | Final payment, not yet paid |
| `UnconditionalWaiverAndReleaseOnFinalPayment.pdf` | 8138 | Final payment, already paid |

Source: https://www.cslb.ca.gov/consumers/legal_issues_for_consumers/Mechanics_Lien/Conditional_And_Unconditional_Waiver_Release_Form.aspx (files at `https://www2.cslb.ca.gov/Resources/MechanicsLien/<name>.pdf`). Feeds `lien-waiver` and `completion-sign-off`.

**Before launch:** check the wording against the official text at https://leginfo.legislature.ca.gov (CIV 8132–8138). That site blocks scripted access, so it hasn't been checked yet. No amendments since 2012 were found.

### Texas lien waivers: Property Code § 53.284 — `tx-lien-waivers/`

`prop-code-53.284-53.287.txt`: the text of §§ 53.284–53.287 (subchapter L), taken from the official Texas statutes site. § 53.284(b)–(e) holds the four required forms (conditional and unconditional, progress and final). § 53.284(a) makes a waiver unenforceable unless it substantially complies with them.

Source: https://tcss.legis.texas.gov/resources/PR/htm/PR.53.htm (the HTML behind https://statutes.capitol.texas.gov). Feeds `lien-waiver`.

## Templates with no free source

No source we can legally reuse was found for these, so we write them ourselves. Our own wording is our copyright.

- `change-order`. AIA G701 and ConsensusDocs are copyrighted and sold.
- `completion-sign-off`. Can pair with the final-payment lien waivers above.
- `lease-addendum`. The lead disclosure above covers one case only.
- `payment-plan`
- `roommate-agreement`
- `security-deposit`. State legal aid and court letters (MassLegalHelp, LawHelp sites, California Courts self-help) are copyrighted or limited to non-commercial use. Build ours from each state's deadline statute.
- `demand-letter` and `contractor-complaint`. Use the FTC complaint letter structure as a model.
