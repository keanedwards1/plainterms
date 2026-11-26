import type { DiffPart } from "@/lib/wordDiff";

/**
 * Builds a Word file whose edits are real tracked changes, so the other side
 * can accept or reject each one in Word. Loaded on demand.
 */
export async function contractDocx(paragraphs: DiffPart[][], author = "PlainTerms"): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, InsertedTextRun, DeletedTextRun } = await import("docx");
  const date = new Date().toISOString();
  let id = 1;
  const children = paragraphs.map(
    (parts) =>
      new Paragraph({
        spacing: { after: 200, line: 300 },
        children: parts.map((part) => {
          if (part.type === "ins") return new InsertedTextRun({ text: part.text, id: id++, author, date });
          if (part.type === "del") return new DeletedTextRun({ text: part.text, id: id++, author, date });
          return new TextRun({ text: part.text });
        }),
      })
  );
  const doc = new Document({
    styles: { default: { document: { run: { font: "Georgia", size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
