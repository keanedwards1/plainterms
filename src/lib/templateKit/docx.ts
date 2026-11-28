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
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Table, TableRow, TableCell, WidthType, BorderStyle } = d;
  // US Letter with 0.75in margins (twips), 11pt Times New Roman, tight spacing: 1 page usually, 2 at most.
  const INCH = 1440;
  const LINE = 252; // 1.05 line spacing
  const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };

  const runs = (text: string, opts: { bold?: boolean } = {}) => {
    const out: InstanceType<typeof TextRun>[] = [];
    for (const piece of fill(text, doc, values)) {
      const chunk = piece.kind === "text" ? piece.text : piece.value || blankLine(piece);
      chunk.split("\n").forEach((line, i) => out.push(new TextRun({ text: line, bold: opts.bold, break: i > 0 ? 1 : undefined })));
    }
    return out;
  };

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const signerCell = (party: { role: string; name?: string }) =>
    new TableCell({
      borders: NO_BORDERS,
      margins: { right: 360 },
      children: [
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: party.role, bold: true })] }),
        new Paragraph({ spacing: { after: 160 }, children: [new TextRun(`Signature: ${"_".repeat(26)}`)] }),
        new Paragraph({ spacing: { after: 160 }, children: [new TextRun("Name: "), ...(party.name ? runs(party.name) : [new TextRun("_".repeat(28))])] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun(`Date: ${"_".repeat(29)}`)] }),
      ],
    });

  const add = (block: Block) => {
    switch (block.t) {
      case "title":
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: block.text, bold: true, size: 28 })] }));
        break;
      case "h":
        children.push(new Paragraph({ spacing: { before: 160, after: 40, line: LINE }, keepNext: true, children: runs(block.text, { bold: true }) }));
        break;
      case "p":
        children.push(new Paragraph({ spacing: { after: 100, line: LINE }, children: runs(block.text) }));
        break;
      case "ol":
      case "ul":
        block.items.forEach((item, i) =>
          children.push(
            new Paragraph({
              spacing: { after: 60, line: LINE },
              indent: { left: 360, hanging: 260 },
              children: [new TextRun(block.t === "ol" ? `${i + 1}.\t` : "•\t"), ...runs(item)],
            })
          )
        );
        break;
      case "sign": {
        // Two signers side by side, like the printed page.
        const rows: InstanceType<typeof TableRow>[] = [];
        for (let i = 0; i < block.parties.length; i += 2) {
          const pair = block.parties.slice(i, i + 2);
          rows.push(
            new TableRow({
              cantSplit: true,
              children: [signerCell(pair[0]), pair[1] ? signerCell(pair[1]) : new TableCell({ borders: NO_BORDERS, children: [new Paragraph("")] })],
            })
          );
        }
        children.push(new Paragraph({ spacing: { before: 200 }, keepNext: true, children: [] }));
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows }));
        break;
      }
      case "grid": {
        const cell = (text: string, bold = false) =>
          new TableCell({ margins: { top: 20, bottom: 20, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text, bold, size: 19 })] })] });
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ tableHeader: true, children: block.columns.map((c) => cell(c, true)) }),
              ...block.rows.map((r) => new TableRow({ cantSplit: true, height: { value: 300, rule: "atLeast" }, children: [cell(r), ...block.columns.slice(1).map(() => cell(""))] })),
            ],
          })
        );
        children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
        break;
      }
    }
  };
  doc.body.forEach(add);

  const file = new Document({
    creator: "PlainTerms",
    title: doc.title,
    styles: { default: { document: { run: { font: "Times New Roman", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 8.5 * INCH, height: 11 * INCH },
            margin: { top: 0.75 * INCH, bottom: 0.75 * INCH, left: 0.75 * INCH, right: 0.75 * INCH, footer: 0.4 * INCH },
          },
        },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: DOC_FOOTER, size: 16, color: "6B6B6B" })] })] }) },
        children,
      },
    ],
  });
  return Packer.toBlob(file);
}
