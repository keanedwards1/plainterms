import type { ReactNode } from "react";
import { BRAND_TEXT, LINE_INCHES, fill, infoRows, rowField, signKey, type Piece } from "@/lib/templateKit/fill";
import { LogoMark } from "@/components/shell/Logo";
import type { Block, Signatures, TemplateDoc, TemplateValues } from "@/lib/templateKit/types";

type Blank = Extract<Piece, { kind: "blank" }>;
export type RenderBlank = (blank: Blank, key: string, where: "inline" | "line") => ReactNode;
/** What goes on a signature line in the editor (a "Sign" button, or the signature with a way to remove it). */
export type RenderSignature = (key: string, role: string) => ReactNode;

/**
 * A blank as it prints. Inline: the answer, or a line to write on (three lines for longer answers).
 * On a ruled line (form rows, printed names): just the answer, since the line is already drawn.
 */
const staticBlank: RenderBlank = (piece, key, where) => {
  if (piece.value) {
    return (
      <span key={key} className="pt-tdoc-fill">
        {piece.value}
      </span>
    );
  }
  if (where === "line") return null;
  if (piece.field.type === "long") {
    return (
      <span key={key} className="pt-tdoc-lines" aria-label={piece.field.label}>
        <i />
        <i />
        <i />
      </span>
    );
  }
  return <span key={key} className={`pt-tdoc-blank pt-tdoc-blank-${piece.field.type}`} aria-label={piece.field.label} />;
};

type Ctx = { doc: TemplateDoc; values: TemplateValues; blank: RenderBlank };

/** Template text with answers in place. Answers are React text or form values, never markup. */
function Text({ text, at, ctx, where = "inline" }: { text: string; at: string; ctx: Ctx; where?: "inline" | "line" }) {
  return (
    <>
      {fill(text, ctx.doc, ctx.values).map((piece, i) =>
        piece.kind === "text" ? <span key={i}>{piece.text}</span> : ctx.blank(piece, `${at}.${i}`, where)
      )}
    </>
  );
}

function BlockView({
  block,
  index,
  ctx,
  signatures,
  renderSignature,
}: {
  block: Block;
  index: number;
  ctx: Ctx;
  signatures: Signatures;
  renderSignature?: RenderSignature;
}) {
  const at = String(index);
  switch (block.t) {
    case "title":
      return (
        <header className="pt-tdoc-head">
          <h2 className="pt-tdoc-title">
            <Text text={block.text} at={at} ctx={ctx} />
          </h2>
        </header>
      );
    case "h":
      return (
        <h3 className="pt-tdoc-h">
          <Text text={block.text} at={at} ctx={ctx} />
        </h3>
      );
    case "p": {
      const rows = infoRows(block.text);
      if (rows) {
        return (
          <dl className="pt-tdoc-info">
            {rows.map((row, i) => {
              // Short lines for dates, amounts and numbers; full width for names and addresses.
              const field = rowField(ctx.doc, row);
              const inches = field ? LINE_INCHES[field.type] : null;
              return (
                <div key={i}>
                  <dt>{row.label}:</dt>
                  <dd style={inches ? { maxWidth: `${inches}in` } : undefined}>
                    <Text text={row.text} at={`${at}.${i}`} ctx={ctx} where="line" />
                  </dd>
                </div>
              );
            })}
          </dl>
        );
      }
      return (
        <p>
          <Text text={block.text} at={at} ctx={ctx} />
        </p>
      );
    }
    case "ol":
    case "ul": {
      const List = block.t;
      return (
        <List className={block.t === "ol" ? "pt-tdoc-ol" : "pt-tdoc-ul"}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Text text={item} at={`${at}.${i}`} ctx={ctx} />
            </li>
          ))}
        </List>
      );
    }
    case "sign":
      return (
        <div className="pt-tdoc-sign">
          {block.parties.map((party, i) => {
            const key = signKey(index, i);
            const mark = signatures[key];
            return (
              <div key={i} className="pt-tdoc-signer">
                <p className="pt-tdoc-role">{party.role}</p>
                <div className="pt-tdoc-sigrow">
                  <div className="pt-tdoc-sigcell pt-tdoc-sigcell-grow">
                    <div className="pt-tdoc-sigspace pt-tdoc-sigspace-tall">
                      {renderSignature ? (
                        renderSignature(key, party.role)
                      ) : mark ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mark.image} alt={`${party.role} signature`} className="pt-tdoc-sigimg" />
                      ) : null}
                    </div>
                    <span className="pt-tdoc-cap">Signature</span>
                  </div>
                  <div className="pt-tdoc-sigcell pt-tdoc-sigcell-date">
                    <div className="pt-tdoc-sigspace pt-tdoc-sigspace-tall">{mark ? <span className="pt-tdoc-fill">{mark.signedOn}</span> : null}</div>
                    <span className="pt-tdoc-cap">Date</span>
                  </div>
                </div>
                <div className="pt-tdoc-sigcell">
                  <div className="pt-tdoc-sigspace">{party.name ? <Text text={party.name} at={`${at}.${i}`} ctx={ctx} where="line" /> : null}</div>
                  <span className="pt-tdoc-cap">Printed name</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    case "grid":
      return (
        <table className="pt-tdoc-grid">
          <thead>
            <tr>
              {block.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={r}>
                <th scope="row">{r}</th>
                {block.columns.slice(1).map((c) => (
                  <td key={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

/**
 * The document. With `renderBlank` and `renderSignature`, blanks and signature lines become whatever
 * the editor draws; without them, the document as it prints.
 */
export default function TemplateDocument({
  doc,
  values,
  signatures = {},
  renderBlank = staticBlank,
  renderSignature,
  branded = true,
  className = "",
}: {
  doc: TemplateDoc;
  values: TemplateValues;
  signatures?: Signatures;
  renderBlank?: RenderBlank;
  renderSignature?: RenderSignature;
  /** Shows the small PlainTerms mark at the end (free plans). */
  branded?: boolean;
  className?: string;
}) {
  const ctx: Ctx = { doc, values, blank: renderBlank };
  return (
    <article className={`pt-tdoc ${className}`} aria-label={doc.title} data-clarity-mask="true">
      {doc.body.map((block, i) => (
        <BlockView key={i} block={block} index={i} ctx={ctx} signatures={signatures} renderSignature={renderSignature} />
      ))}
      {branded ? (
        <p className="pt-tdoc-brand">
          <LogoMark className="h-[1.1em] w-[1.1em] text-(--pt-accent)" />
          {BRAND_TEXT}
        </p>
      ) : null}
    </article>
  );
}
