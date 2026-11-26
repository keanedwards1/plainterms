/**
 * Plain-English meanings for legal terms, shown as tooltips wherever a term
 * appears on the step-by-step result page.
 */
export const GLOSSARY: Readonly<Record<string, string>> = Object.freeze({
  indemnity: "Who pays legal costs if a third party sues over this contract.",
  indemnification: "Who pays legal costs if a third party sues over this contract.",
  indemnify: "To cover the other side's losses or legal costs in certain situations.",
  liability: "Legal responsibility for losses, damages, or claims.",
  "limitation of liability": "A clause that sets a maximum amount one side can owe.",
  "liability cap": "A maximum amount one side can be required to pay.",
  "governing law": "The state or country law used to interpret this contract.",
  jurisdiction: "Which courts have authority to hear a dispute.",
  venue: "The physical place or court where a dispute is handled.",
  arbitration: "A private dispute process instead of going to court.",
  "binding arbitration": "Arbitration where the decision is final and a court will enforce it. Appeals are very limited.",
  mediation: "A neutral third party helps both sides try to settle.",
  "material breach": "A serious contract violation that can justify ending the contract.",
  breach: "Failing to do what the contract requires.",
  "cure period": "Time allowed to fix a breach before penalties or termination.",
  "termination for convenience": "A right to end the contract for any reason, without either side being at fault.",
  "terminate for convenience": "End the contract for any reason, without either side being at fault.",
  terminate: "End the contract.",
  termination: "Ending the contract.",
  warranty: "A promise that certain facts or quality standards are true.",
  warranties: "Promises that certain facts or quality standards are true.",
  warrants: "Promises that something is true or will meet a standard.",
  disclaimer: "Language that limits or removes certain promises or liability.",
  assignment: "Transferring contract rights or obligations to another party.",
  assign: "Transfer rights or ownership to someone else.",
  assigned: "Transferred to someone else, such as ownership of the work.",
  subcontracting: "Hiring another party to perform part of the work.",
  subcontract: "Hire someone else to do part of the work.",
  subcontractors: "People or firms hired to do part of the work.",
  sublicensing: "Giving another party permission to use licensed rights.",
  perpetual: "No set end date; it can continue indefinitely.",
  irrevocable: "Cannot be taken back once granted.",
  exclusivity: "A restriction preventing work with certain other parties.",
  "non-compete": "A restriction on doing competing work for a period of time.",
  "non-solicit": "A restriction on approaching certain clients or employees.",
  confidentiality: "Rules for keeping sensitive information private.",
  "confidential information": "Information the contract says must be kept private.",
  "injunctive relief": "A court order requiring someone to do or stop doing something.",
  "incorporated by reference": "A separate document counts as part of this contract, as if it were written in.",
  "net 60": "Payment is due 60 days after the invoice date.",
  "net 30": "Payment is due 30 days after the invoice date.",
  "net 15": "Payment is due 15 days after the invoice date.",
  "effective date": "The date the contract starts to apply.",
  "statement of work": "A document listing the specific work, deliverables and timing.",
  sow: "Statement of work: a document listing the specific work, deliverables and timing.",
  exhibit: "A document attached to the contract that counts as part of it.",
  exhibits: "Documents attached to the contract that count as part of it.",
  appendix: "A document attached to the contract that counts as part of it.",
  "change order": "A signed agreement to change the work, price or schedule after the contract starts.",
  "change orders": "Signed agreements to change the work, price or schedule after the contract starts.",
  deliverable: "A piece of finished work you've agreed to hand over.",
  deliverables: "The finished work you've agreed to hand over.",
  scope: "The work the contract covers.",
  "willful misconduct": "Deliberately doing something wrong, or knowingly ignoring the harm it could cause.",
  negligence: "Failing to take the care a reasonable person would, and causing harm as a result.",
  fraud: "Deliberately deceiving someone to gain something.",
  "third-party claims": "Claims brought by someone who isn't a party to this contract.",
  "hold harmless": "A promise not to hold the other side responsible for certain losses.",
  "jury trial": "A trial where a jury decides the facts, not only a judge.",
  "good faith": "Acting honestly and fairly toward the other side.",
  notice: "Formal word to the other side, given the way the contract requires (usually in writing).",
  "written notice": "Formal word to the other side, given in writing.",
  "late fee": "A charge added when payment arrives after the due date.",
  merger: "Two companies combining into one.",
  "portfolio rights": "Your right to show the work as an example of what you do.",
  "pre-existing tools": "Tools, templates or code you had before this project.",
  "fixed fee": "A set price that doesn't change with the time you spend.",
  "authority to bind": "The power to sign contracts on a company's behalf.",
  "marked-up": "Showing proposed changes as tracked edits, so the other side can accept or reject each one.",
  "tracked changes": "Edits shown in the document, so the other side can accept or reject each one.",
  mutual: "Applies to both sides equally.",
  nonpayment: "Not paying what's owed.",
  "non-payment": "Not paying what's owed.",
  "kill fee": "A payment owed to you if the other side cancels the project partway.",
  "lien waiver": "A document giving up the right to claim a lien on a property once paid.",
  lien: "A legal claim against property until a debt is paid.",
  retainage: "Part of each payment held back until the work is finished.",
  "force majeure": "Events outside anyone's control, like disasters, that excuse delays.",
  "intellectual property": "Creative or technical work that can be owned, like designs, code or text.",
  "work for hire": "Work the client owns from the moment it's created.",
});

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const TERM_REGEX = new RegExp(`\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");

export type GlossSegment = string | { term: string; definition: string };

/** Splits text into plain strings and glossary terms, in order. */
export function splitTerms(text: string): GlossSegment[] {
  if (!text) return [];
  const out: GlossSegment[] = [];
  let last = 0;
  TERM_REGEX.lastIndex = 0;
  for (let m = TERM_REGEX.exec(text); m; m = TERM_REGEX.exec(text)) {
    const definition = GLOSSARY[m[0].toLowerCase()];
    if (!definition) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ term: m[0], definition });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
