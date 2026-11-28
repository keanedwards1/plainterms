import type { ReactNode } from "react";
import { fill, type Piece } from "@/lib/templateKit/fill";
import { DOC_FOOTER } from "@/lib/templateKit/docx";
import type { Block, TemplateDoc, TemplateValues } from "@/lib/templateKit/types";

type Blank = Extract<Piece, { kind: "blank" }>;
export type RenderBlank = (blank: Blank, key: string) => ReactNode;

/** A blank as it prints: the answer, or a line to write on. */
const staticBlank: RenderBlank = (piece, key) =>
  piece.value ? (
    <span key={key} className="pt-tdoc-fill">
      {piece.value}
    </span>
  ) : (
    <span key={key} className={piece.field.type === "long" ? "pt-tdoc-blank pt-tdoc-blank-long" : "pt-tdoc-blank"} aria-label={piece.field.label} />
  );

/** Template text with answers in place. Answers are React text or form values, never markup. */
function Text({ text, doc, values, blank, at }: { text: string; doc: TemplateDoc; values: TemplateValues; blank: RenderBlank; at: string }) {
  return (
    <>
      {fill(text, doc, values).map((piece, i) =>
        piece.kind === "text" ? <span key={i}>{piece.text}</span> : blank(piece, `${at}.${i}`)
      )}
    </>
  );
}

function BlockView({ block, doc, values, blank, at }: { block: Block; doc: TemplateDoc; values: TemplateValues; blank: RenderBlank; at: string }) {
  const T = (text: string, key: string) => <Text text={text} doc={doc} values={values} blank={blank} at={key} />;
  switch (block.t) {
    case "title":
      return <h2 className="pt-tdoc-title">{block.text}</h2>;
    case "h":
      return <h3 className="pt-tdoc-h">{T(block.text, at)}</h3>;
    case "p":
      return <p>{T(block.text, at)}</p>;
    case "ol":
    case "ul": {
      const List = block.t;
      return (
        <List className={block.t === "ol" ? "pt-tdoc-ol" : "pt-tdoc-ul"}>
          {block.items.map((item, i) => (
            <li key={i}>{T(item, `${at}.${i}`)}</li>
          ))}
        </List>
      );
    }
    case "sign":
      return (
        <div className="pt-tdoc-sign">
          {block.parties.map((party, i) => (
            <div key={i} className="pt-tdoc-signer">
              <b>{party.role}</b>
              <span className="pt-tdoc-sigline">Signature</span>
              {party.name ? <span className="pt-tdoc-signame">Name: {T(party.name, `${at}.${i}`)}</span> : <span className="pt-tdoc-sigline">Name</span>}
              <span className="pt-tdoc-sigline">Date</span>
            </div>
          ))}
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
 * The document. With `renderBlank`, blanks become whatever the caller draws (the editor's fields);
 * without it, the document as it prints.
 */
export default function TemplateDocument({
  doc,
  values,
  renderBlank = staticBlank,
  className = "",
}: {
  doc: TemplateDoc;
  values: TemplateValues;
  renderBlank?: RenderBlank;
  className?: string;
}) {
  return (
    <article className={`pt-tdoc ${className}`} aria-label={doc.title} data-clarity-mask="true">
      {doc.body.map((block, i) => (
        <BlockView key={i} block={block} doc={doc} values={values} blank={renderBlank} at={String(i)} />
      ))}
      <p className="pt-tdoc-foot">{DOC_FOOTER}</p>
    </article>
  );
}
