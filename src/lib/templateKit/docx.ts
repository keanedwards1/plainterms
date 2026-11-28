import { BRAND_TEXT, fill, infoRows, isSignatureImage, signKey, type Piece } from "@/lib/templateKit/fill";
import type { Block, Branding, SignatureMark, Signatures, TemplateDoc, TemplateField, TemplateValues } from "@/lib/templateKit/types";

/** An empty inline blank prints as a line to write on, sized to the kind of answer. */
const BLANK_CHARS: Record<TemplateField["type"], number> = { text: 24, long: 60, date: 18, money: 14, email: 26, phone: 18, number: 8 };
export function blankLine(piece: Extract<Piece, { kind: "blank" }>): string {
  return "_".repeat(BLANK_CHARS[piece.field.type]);
}

function base64Bytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (typeof atob === "function") return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

/** Width and height of a PNG, read from its header. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * Builds the Word file in the browser: US Letter, 0.75in margins, 11pt Times New Roman. Answers go in
 * as plain text runs (the docx library escapes them), so nothing typed can become markup in the file.
 * Loaded on demand.
 */
export async function templateDocx(
  doc: TemplateDoc,
  values: TemplateValues,
  signatures: Signatures = {},
  brand: Branding = { show: true }
): Promise<Blob> {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Footer, Table, TableRow, TableCell, WidthType, BorderStyle, PageNumber, TabStopType } = d;

  const INCH = 1440;
  const LINE = 252; // 1.05 line spacing
  const TEXT_WIDTH = 7 * INCH;
  /** Underscores that fill about `twips` of width in 11pt Times (an underscore is about half an em; sized short so the line never wraps in other fonts). */
  const underscores = (twips: number) => "_".repeat(Math.max(4, Math.floor((twips / 20 / 6) * 0.92)));

  type Run = InstanceType<typeof TextRun>;
  const textOf = (text: string) =>
    fill(text, doc, values)
      .map((p) => (p.kind === "text" ? p.text : p.value))
      .join("");
  const runs = (text: string, opts: { bold?: boolean; size?: number } = {}) => {
    const out: Run[] = [];
    for (const piece of fill(text, doc, values)) {
      const chunk = piece.kind === "text" ? piece.text : piece.value || blankLine(piece);
      chunk.split("\n").forEach((line, i) => out.push(new TextRun({ text: line, bold: opts.bold, size: opts.size, break: i > 0 ? 1 : undefined })));
    }
    return out;
  };
  /** Three full-width lines to write a longer answer by hand. Plain underscores show the same in every word processor. */
  const writingLines = () => [0, 1, 2].map(() => new Paragraph({ spacing: { before: 160, after: 0 }, children: [new TextRun(underscores(TEXT_WIDTH))] }));

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  const paragraph = (text: string) => {
    // A paragraph that is a single long blank, left empty, becomes writing lines.
    const pieces = fill(text, doc, values);
    if (pieces.length === 1 && pieces[0].kind === "blank" && pieces[0].field.type === "long" && !pieces[0].value) {
      children.push(...writingLines(), new Paragraph({ spacing: { after: 100 }, children: [] }));
      return;
    }
    children.push(new Paragraph({ spacing: { after: 100, line: LINE }, children: runs(text) }));
  };

  const infoTable = (rows: { label: string; text: string }[]) => {
    const labelW = Math.min(2.9 * INCH, Math.max(...rows.map((r) => r.label.length)) * 115 + 300);
    for (const row of rows) {
      const value = textOf(row.text).replace(/\n/g, ", ");
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 0 },
          tabStops: [{ type: TabStopType.LEFT, position: labelW }],
          children: value
            ? [new TextRun(`${row.label}:\t`), new TextRun({ text: value, underline: {} })]
            : [new TextRun(`${row.label}:\t${underscores(TEXT_WIDTH - labelW)}`)],
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  };

  const signatureImage = (mark: SignatureMark | undefined) => {
    if (!mark || !isSignatureImage(mark.image)) return [] as InstanceType<typeof ImageRun>[];
    const bytes = base64Bytes(mark.image);
    const { width, height } = pngSize(bytes);
    const h = 40;
    const w = Math.min(200, Math.round((width / height) * h));
    return [new ImageRun({ type: "png", data: bytes, transformation: { width: w, height: Math.round((height / width) * w) } })];
  };

  const add = (block: Block, index: number) => {
    switch (block.t) {
      case "title":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "1B1F1D", space: 4 } },
            spacing: { after: 240 },
            children: runs(block.text, { bold: true, size: 30 }),
          })
        );
        break;
      case "h":
        children.push(new Paragraph({ spacing: { before: 180, after: 40, line: LINE }, keepNext: true, children: runs(block.text, { bold: true }) }));
        break;
      case "p": {
        const rows = infoRows(block.text);
        if (rows) infoTable(rows);
        else paragraph(block.text);
        break;
      }
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
        // Two signers side by side, laid out with tab stops so it looks the same in every word processor.
        const gap = 500;
        const colW = Math.round((TEXT_WIDTH - gap) / 2);
        const R = colW + gap;
        const sigEnd = Math.round(colW * 0.66);
        const dateStart = Math.round(colW * 0.72);
        const tabs = [
          { type: TabStopType.LEFT, position: dateStart },
          { type: TabStopType.LEFT, position: R },
          { type: TabStopType.LEFT, position: R + dateStart },
        ];
        const sigLine = `${underscores(sigEnd)}\t${underscores(colW - dateStart)}`;
        const small = (text: string) => new TextRun({ text, size: 15, color: "6B6B6B" });
        for (let i = 0; i < block.parties.length; i += 2) {
          const left = block.parties[i];
          const right = block.parties[i + 1];
          const pair = Boolean(right);
          const markL = signatures[signKey(index, i)];
          const markR = right ? signatures[signKey(index, i + 1)] : undefined;
          const nameOf = (party?: { name?: string }) => (party?.name ? textOf(party.name) : "");
          children.push(
            new Paragraph({
              spacing: { before: 280, after: 0 },
              keepNext: true,
              tabStops: [{ type: TabStopType.LEFT, position: R }],
              children: [
                new TextRun({ text: left.role.toUpperCase(), bold: true, size: 19, characterSpacing: 12 }),
                ...(right ? [new TextRun({ text: `\t${right.role.toUpperCase()}`, bold: true, size: 19, characterSpacing: 12 })] : []),
              ],
            }),
            // Signatures and dates sit just above their lines.
            new Paragraph({
              spacing: { before: markL || markR ? 120 : 420, after: 0 },
              keepNext: true,
              tabStops: [
                { type: TabStopType.LEFT, position: dateStart },
                { type: TabStopType.LEFT, position: R },
                { type: TabStopType.LEFT, position: R + dateStart },
              ],
              children: [
                ...signatureImage(markL),
                new TextRun(`\t${markL?.signedOn ?? ""}`),
                ...(right ? [new TextRun("\t"), ...signatureImage(markR), new TextRun(`\t${markR?.signedOn ?? ""}`)] : []),
              ],
            }),
            new Paragraph({ spacing: { before: 0, after: 0 }, keepNext: true, tabStops: tabs, children: [new TextRun(pair ? `${sigLine}\t${sigLine}` : sigLine)] }),
            new Paragraph({
              spacing: { before: 20, after: 0 },
              keepNext: true,
              tabStops: [
                { type: TabStopType.LEFT, position: dateStart },
                { type: TabStopType.LEFT, position: R },
                { type: TabStopType.LEFT, position: R + dateStart },
              ],
              children: [small(pair ? "Signature\tDate\tSignature\tDate" : "Signature\tDate")],
            }),
            new Paragraph({
              spacing: { before: 300, after: 0 },
              keepNext: true,
              tabStops: [{ type: TabStopType.LEFT, position: R }],
              children: [new TextRun(nameOf(left)), ...(right ? [new TextRun(`\t${nameOf(right)}`)] : [])],
            }),
            new Paragraph({
              spacing: { before: 0, after: 0 },
              keepNext: true,
              tabStops: [{ type: TabStopType.LEFT, position: R }],
              children: [new TextRun(pair ? `${underscores(colW)}\t${underscores(colW)}` : underscores(colW))],
            }),
            new Paragraph({ spacing: { before: 20, after: 80 }, tabStops: [{ type: TabStopType.LEFT, position: R }], children: [small(pair ? "Printed name\tPrinted name" : "Printed name")] })
          );
        }
        break;
      }
      case "grid": {
        const firstW = Math.round(TEXT_WIDTH * 0.32);
        const restW = Math.round((TEXT_WIDTH - firstW) / (block.columns.length - 1));
        const widths = block.columns.map((_, i) => (i === 0 ? firstW : restW));
        const cell = (text: string, i: number, bold = false) =>
          new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            margins: { top: 30, bottom: 30, left: 80, right: 80 },
            shading: bold ? { fill: "F2F2EF" } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text, bold, size: 19 })] })],
          });
        children.push(
          new Table({
            width: { size: TEXT_WIDTH, type: WidthType.DXA },
            columnWidths: widths,
            rows: [
              new TableRow({ tableHeader: true, children: block.columns.map((c, i) => cell(c, i, true)) }),
              ...block.rows.map((r) => new TableRow({ cantSplit: true, height: { value: 360, rule: "atLeast" }, children: [cell(r, 0), ...block.columns.slice(1).map((_, i) => cell("", i + 1))] })),
            ],
          })
        );
        children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
        break;
      }
    }
  };
  doc.body.forEach(add);

  // Footer: the PlainTerms mark on free plans, and page numbers.
  const logo = brand.show && brand.logo && isSignatureImage(brand.logo) ? brand.logo : null;
  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
        children: [
          ...(logo ? [new ImageRun({ type: "png", data: base64Bytes(logo), transformation: { width: 12, height: 12 } }), new TextRun({ text: " ", size: 15 })] : []),
          ...(brand.show ? [new TextRun({ text: BRAND_TEXT, size: 15, color: "6B6B6B" })] : []),
          new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 15, color: "6B6B6B" }),
        ],
      }),
    ],
  });

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
        footers: { default: footer },
        children,
      },
    ],
  });
  return Packer.toBlob(file);
}
