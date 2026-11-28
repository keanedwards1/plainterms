import { BRAND_TEXT, LINE_INCHES, bracketed, clauseTitle, fill, infoRows, isSignatureImage, rowField, runIn, signKey, type Piece } from "@/lib/templateKit/fill";
import type { Branding, Signatures, TemplateDoc, TemplateField, TemplateValues } from "@/lib/templateKit/types";

// US Letter in points, 0.75in margins, 11pt Times.
const PAGE_W = 612;
const PAGE_H = 792;
const M = 54;
const RIGHT = PAGE_W - M;
const WIDTH = RIGHT - M;
const BOTTOM = PAGE_H - M - 14; // room for the footer
const SIZE = 11;
const LINE = 14.5;
const INK = 20;
const SOFT = 95;

/** Width of an empty blank, by the kind of answer it takes. */
const BLANK_PT: Record<TemplateField["type"], number> = { text: 150, long: WIDTH, date: 110, money: 90, email: 160, phone: 120, number: 50 };

type Tok = { kind: "word"; text: string; bold: boolean } | { kind: "space" } | { kind: "br" } | { kind: "blank"; width: number } | { kind: "lines" };

/**
 * Builds the PDF in the browser with jsPDF's built-in Times font. Answers are drawn as plain text,
 * so nothing typed can become anything but text. Loaded on demand.
 */
export async function templatePdf(
  doc: TemplateDoc,
  values: TemplateValues,
  signatures: Signatures = {},
  brand: Branding = { show: true }
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter", compress: true });
  pdf.setProperties({ title: doc.title, creator: "PlainTerms" });
  pdf.setTextColor(INK);
  pdf.setDrawColor(INK);
  let y = M;

  const font = (bold = false, size = SIZE) => {
    pdf.setFont("times", bold ? "bold" : "normal");
    pdf.setFontSize(size);
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      pdf.addPage();
      y = M;
    }
  };

  const tokens = (text: string, bold = false): Tok[] => {
    const out: Tok[] = [];
    const words = (s: string) => {
      for (const part of s.split(/(\n| +)/)) {
        if (!part) continue;
        if (part === "\n") out.push({ kind: "br" });
        else if (/^ +$/.test(part)) out.push({ kind: "space" });
        else out.push({ kind: "word", text: part, bold });
      }
    };
    for (const piece of fill(text, doc, values) as Piece[]) {
      if (piece.kind === "text") words(piece.text);
      else if (piece.value) words(piece.value);
      else if (doc.blanks === "brackets") words(bracketed(piece.field));
      else if (piece.field.type === "long") out.push({ kind: "lines" });
      else out.push({ kind: "blank", width: BLANK_PT[piece.field.type] });
    }
    return out;
  };

  /** Lays out words and blanks across lines, wrapping at the right edge. */
  const flow = (toks: Tok[], x0: number, width: number, size = SIZE) => {
    type Placed = { tok: Tok; x: number; w: number };
    let line: Placed[] = [];
    let x = 0;
    const widthOf = (t: Tok) => {
      if (t.kind === "word") {
        font(t.bold, size);
        return pdf.getTextWidth(t.text);
      }
      if (t.kind === "space") {
        font(false, size);
        return pdf.getTextWidth(" ");
      }
      if (t.kind === "blank") return t.width;
      return 0;
    };
    const flush = () => {
      ensure(LINE);
      const base = y + size * 0.82;
      for (const p of line) {
        if (p.tok.kind === "word") {
          font(p.tok.bold, size);
          pdf.text(p.tok.text, x0 + p.x, base);
        } else if (p.tok.kind === "blank") {
          pdf.setLineWidth(0.6);
          pdf.line(x0 + p.x + 1, base + 2, x0 + p.x + p.w - 1, base + 2);
        }
      }
      y += (LINE * size) / SIZE;
      line = [];
      x = 0;
    };
    for (const t of toks) {
      if (t.kind === "br") {
        flush();
        continue;
      }
      if (t.kind === "lines") {
        if (line.length) flush();
        for (let i = 0; i < 3; i++) {
          ensure(17);
          y += 17;
          pdf.setLineWidth(0.6);
          pdf.line(x0, y, x0 + width, y);
        }
        y += 6;
        continue;
      }
      if (t.kind === "space" && x === 0) continue;
      let w = widthOf(t);
      if (t.kind === "word" && w > width) {
        // A very long word (a link, say): break it across lines.
        if (x > 0) flush();
        let rest = t.text;
        while (rest) {
          font(t.bold, size);
          let n = rest.length;
          while (n > 1 && pdf.getTextWidth(rest.slice(0, n)) > width) n--;
          const part = rest.slice(0, n);
          const pw = pdf.getTextWidth(part);
          line.push({ tok: { ...t, text: part }, x: 0, w: pw });
          rest = rest.slice(n);
          if (rest) flush();
          else x = pw;
        }
        continue;
      }
      if (x + w > width && t.kind !== "space") {
        while (line.length && line[line.length - 1].tok.kind === "space") line.pop();
        flush();
        w = widthOf(t);
      }
      line.push({ tok: t, x, w });
      x += w;
    }
    if (line.length) flush();
  };

  const caption = (text: string, x: number, at: number) => {
    font(false, 8);
    pdf.setTextColor(SOFT);
    pdf.text(text, x, at);
    pdf.setTextColor(INK);
  };

  doc.body.forEach((block, index) => {
    switch (block.t) {
      case "title": {
        const text = fill(block.text, doc, values)
          .map((p) => (p.kind === "text" ? p.text : p.value || "_____"))
          .join("");
        font(true, 15);
        const lines = pdf.splitTextToSize(text, WIDTH) as string[];
        ensure(lines.length * 19 + 22);
        for (const l of lines) {
          pdf.text(l, PAGE_W / 2, y + 13, { align: "center" });
          y += 19;
        }
        y += 2;
        pdf.setLineWidth(1);
        pdf.line(M, y, RIGHT, y);
        y += 12;
        break;
      }
      case "h":
        ensure(LINE * 2 + 9);
        y += 8;
        flow(tokens(block.text, true), M, WIDTH);
        y += 2;
        break;
      case "p": {
        const rows = infoRows(block.text);
        if (rows) {
          font(false);
          const labelW = Math.min(210, Math.max(...rows.map((r) => pdf.getTextWidth(`${r.label}:`))) + 12);
          for (const row of rows) {
            ensure(19);
            const base = y + 13;
            font(false);
            pdf.text(`${row.label}:`, M, base);
            pdf.setLineWidth(0.6);
            const inches = LINE_INCHES[rowField(doc, row)?.type ?? "text"];
            pdf.line(M + labelW, base + 2.5, inches ? Math.min(RIGHT, M + labelW + inches * 72) : RIGHT, base + 2.5);
            const value = fill(row.text, doc, values)
              .map((p) => (p.kind === "text" ? p.text : p.value))
              .join("")
              .replace(/\n/g, ", ");
            if (value) pdf.text(pdf.splitTextToSize(value, WIDTH - labelW - 6)[0] ?? "", M + labelW + 4, base);
            y += 19;
          }
          y += 7;
        } else {
          flow(tokens(block.text), M, WIDTH);
          y += 6;
        }
        break;
      }
      case "ol":
      case "ul":
        block.items.forEach((item, i) => {
          ensure(LINE);
          font(false);
          pdf.text(block.t === "ol" ? `${i + 1}.` : "•", M + 4, y + SIZE * 0.82);
          const lead = runIn(item);
          flow(lead ? [...tokens(lead.title, true), { kind: "space" }, { kind: "space" }, ...tokens(lead.rest)] : tokens(item), M + 20, WIDTH - 20);
          y += 3;
        });
        y += 4;
        break;
      case "clause": {
        const body = tokens(block.text);
        ensure(LINE * 2);
        y += 3;
        if (body.length === 1 && body[0].kind === "lines") {
          flow(tokens(clauseTitle(block.title, true), true), M, WIDTH);
          flow(body, M, WIDTH);
        } else {
          flow([...tokens(clauseTitle(block.title), true), { kind: "space" }, { kind: "space" }, ...body], M, WIDTH);
        }
        y += 5;
        break;
      }
      case "letter":
        flow(tokens(block.from), M, WIDTH);
        y += 10;
        flow(tokens(block.date), M, WIDTH);
        y += 10;
        flow(tokens(block.to), M, WIDTH);
        y += 10;
        flow([{ kind: "word", text: "Re:", bold: true }, { kind: "space" }, ...tokens(block.re, true)], M, WIDTH);
        y += 12;
        break;
      case "boxes": {
        pdf.setLineWidth(0.6);
        for (const row of block.rows) {
          const cellW = WIDTH / row.length;
          font(false, SIZE);
          const texts = row.map((cell) => {
            const value = fill(cell.value, doc, values)
              .map((p) => (p.kind === "text" ? p.text : p.value))
              .join("")
              .trim();
            return value ? ((pdf.splitTextToSize(value, cellW - 12) as string[]).slice(0, 3)) : [];
          });
          const h = Math.max(34, 20 + Math.max(0, ...texts.map((t) => t.length)) * 13);
          ensure(h);
          row.forEach((cell, c) => {
            const x = M + c * cellW;
            pdf.rect(x, y, cellW, h);
            font(true, 7);
            pdf.setTextColor(SOFT);
            pdf.text(cell.label.toUpperCase(), x + 6, y + 10, { charSpace: 0.4 });
            pdf.setTextColor(INK);
            font(false, SIZE);
            texts[c].forEach((line, i) => pdf.text(line, x + 6, y + 24 + i * 13));
          });
          y += h;
        }
        y += 12;
        break;
      }
      case "amounts": {
        const valueW = 150;
        for (const row of block.rows) {
          ensure(22);
          const base = y + 14;
          if (row.total) {
            pdf.setLineWidth(0.6);
            pdf.line(RIGHT - valueW, y + 1, RIGHT, y + 1);
          }
          font(Boolean(row.total), SIZE);
          pdf.text(row.label, M, base);
          const value = fill(row.value, doc, values)
            .map((p) => (p.kind === "text" ? p.text : p.value))
            .join("")
            .trim();
          if (value) pdf.text(value, RIGHT - 4, base, { align: "right" });
          else {
            font(false, SIZE);
            pdf.text("$", RIGHT - valueW + 4, base);
          }
          pdf.setLineWidth(row.total ? 1.2 : 0.6);
          pdf.line(RIGHT - valueW, base + 3, RIGHT, base + 3);
          y += 22;
        }
        y += 8;
        break;
      }
      case "grid": {
        const firstW = WIDTH * 0.32;
        const restW = (WIDTH - firstW) / (block.columns.length - 1);
        const colX = (c: number) => (c === 0 ? M : M + firstW + (c - 1) * restW);
        const colW = (c: number) => (c === 0 ? firstW : restW);
        const header = () => {
          pdf.setFillColor(242, 242, 239);
          pdf.rect(M, y, WIDTH, 17, "F");
          block.columns.forEach((c, i) => {
            font(true, 9.5);
            pdf.text(c, colX(i) + 5, y + 12);
            pdf.setLineWidth(0.5);
            pdf.rect(colX(i), y, colW(i), 17);
          });
          y += 17;
        };
        ensure(17 * 3);
        header();
        for (const row of block.rows) {
          if (y + 19 > BOTTOM) {
            pdf.addPage();
            y = M;
            header();
          }
          block.columns.forEach((_, i) => {
            pdf.setLineWidth(0.5);
            pdf.rect(colX(i), y, colW(i), 19);
          });
          font(false, 9.5);
          pdf.text(row, M + 5, y + 13);
          y += 19;
        }
        y += 10;
        break;
      }
      case "sign": {
        const gap = 28;
        const colW = (WIDTH - gap) / 2;
        y += 6;
        for (let i = 0; i < block.parties.length; i += 2) {
          ensure(96);
          const top = y;
          block.parties.slice(i, i + 2).forEach((party, j) => {
            const x = M + j * (colW + gap);
            const sigW = colW * 0.66;
            const dateX = x + colW * 0.72;
            font(true, 9.5);
            pdf.text(party.role.toUpperCase(), x, top + 10, { charSpace: 0.6 });
            const mark = signatures[signKey(index, i + j)];
            if (mark && isSignatureImage(mark.image)) {
              const props = pdf.getImageProperties(mark.image);
              const h = Math.min(32, (props.height / props.width) * sigW);
              const w = (props.width / props.height) * h;
              pdf.addImage(mark.image, "PNG", x + 2, top + 41 - h, Math.min(w, sigW - 4), h);
              font(false);
              pdf.text(mark.signedOn, dateX, top + 38);
            }
            pdf.setLineWidth(0.7);
            pdf.line(x, top + 42, x + sigW, top + 42);
            pdf.line(dateX, top + 42, x + colW, top + 42);
            caption("Signature", x, top + 51);
            caption("Date", dateX, top + 51);
            const name = party.name
              ? fill(party.name, doc, values)
                  .map((p) => (p.kind === "text" ? p.text : p.value))
                  .join("")
              : "";
            if (name) {
              font(false);
              pdf.text(pdf.splitTextToSize(name, colW)[0] ?? "", x, top + 73);
            }
            pdf.line(x, top + 77, x + colW, top + 77);
            caption("Printed name", x, top + 86);
          });
          y = top + 96;
        }
        break;
      }
    }
  });

  // Footer on every page: page numbers, and the PlainTerms mark on free plans.
  const pages = pdf.getNumberOfPages();
  const logo = brand.logo && isSignatureImage(brand.logo) ? brand.logo : null;
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    const at = PAGE_H - M + 22;
    if (brand.show) {
      let x = M;
      if (logo) {
        pdf.addImage(logo, "PNG", x, at - 8, 10, 10);
        x += 14;
      }
      caption(BRAND_TEXT, x, at);
    }
    font(false, 8);
    pdf.setTextColor(SOFT);
    pdf.text(`Page ${p} of ${pages}`, RIGHT, at, { align: "right" });
    pdf.setTextColor(INK);
  }

  return pdf.output("blob");
}
