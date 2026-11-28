import { fill, type Piece } from "@/lib/templateKit/fill";
import type { Block, TemplateDoc, TemplateValues } from "@/lib/templateKit/types";

export const DOC_FOOTER = "Made from a PlainTerms template. PlainTerms is not a law firm and this is not legal advice.";

/** An empty blank prints as a line to write on; long answers get a longer line. */
export function blankLine(piece: Extract<Piece, { kind: "blank" }>): string {
  return piece.field.type === "long" ? "_".repeat(48) : "_".repeat(18);
}

/**
 * Builds the Word file in the browser. Answers go in as plain text runs (the docx library
 * escapes them), so nothing typed can become markup in the file. Loaded on demand.
 */
export async function templateDocx(doc: TemplateDoc, values: TemplateValues): Promise<Blob> {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Table, TableRow, TableCell, WidthType } = d;

  const runs = (text: string, opts: { bold?: boolean } = {}) => {
    const out: InstanceType<typeof TextRun>[] = [];
    for (const piece of fill(text, doc, values)) {
      const chunk = piece.kind === "text" ? piece.text : piece.value || blankLine(piece);
      chunk.split("\n").forEach((line, i) => out.push(new TextRun({ text: line, bold: opts.bold, break: i > 0 ? 1 : undefined })));
    }
    return out;
  };

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const add = (block: Block) => {
    switch (block.t) {
      case "title":
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 }, children: [new TextRun({ text: block.text, bold: true, size: 32 })] }));
        break;
      case "h":
        children.push(new Paragraph({ spacing: { before: 280, after: 120 }, keepNext: true, children: runs(block.text, { bold: true }) }));
        break;
      case "p":
        children.push(new Paragraph({ spacing: { after: 180, line: 300 }, children: runs(block.text) }));
        break;
      case "ol":
      case "ul":
        block.items.forEach((item, i) =>
          children.push(
            new Paragraph({
              spacing: { after: 120, line: 300 },
              indent: { left: 440, hanging: 300 },
              children: [new TextRun(block.t === "ol" ? `${i + 1}.\t` : "•\t"), ...runs(item)],
            })
          )
        );
        break;
      case "sign":
        for (const party of block.parties) {
          children.push(new Paragraph({ spacing: { before: 360, after: 60 }, keepNext: true, children: [new TextRun({ text: party.role, bold: true })] }));
          children.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: [new TextRun(`Signature: ${"_".repeat(32)}`)] }));
          children.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: [new TextRun("Name: "), ...(party.name ? runs(party.name) : [new TextRun("_".repeat(32))])] }));
          children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(`Date: ${"_".repeat(20)}`)] }));
        }
        break;
      case "grid": {
        const cell = (text: string, bold = false) =>
          new TableCell({ children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text, bold })] })] });
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ tableHeader: true, children: block.columns.map((c) => cell(c, true)) }),
              ...block.rows.map((r) => new TableRow({ children: [cell(r), ...block.columns.slice(1).map(() => cell(""))] })),
            ],
          })
        );
        children.push(new Paragraph({ spacing: { after: 180 }, children: [] }));
        break;
      }
    }
  };
  doc.body.forEach(add);

  const file = new Document({
    creator: "PlainTerms",
    title: doc.title,
    styles: { default: { document: { run: { font: "Georgia", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: DOC_FOOTER, size: 16, color: "6B6B6B" })] })] }) },
        children,
      },
    ],
  });
  return Packer.toBlob(file);
}
