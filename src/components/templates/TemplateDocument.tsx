import { fill } from "@/lib/templateKit/fill";
import { DOC_FOOTER } from "@/lib/templateKit/docx";
import type { Block, TemplateDoc, TemplateValues } from "@/lib/templateKit/types";

/** Template text with answers in place. Answers are React text, never markup. */
function Text({ text, doc, values }: { text: string; doc: TemplateDoc; values: TemplateValues }) {
  return (
    <>
      {fill(text, doc, values).map((piece, i) =>
        piece.kind === "text" ? (
          <span key={i}>{piece.text}</span>
        ) : piece.value ? (
          <span key={i} className="pt-tdoc-fill">
            {piece.value}
          </span>
        ) : (
          <span key={i} className={piece.field.type === "long" ? "pt-tdoc-blank pt-tdoc-blank-long" : "pt-tdoc-blank"}>
            {piece.field.label}
          </span>
        )
      )}
    </>
  );
}

function BlockView({ block, doc, values }: { block: Block; doc: TemplateDoc; values: TemplateValues }) {
  switch (block.t) {
    case "title":
      return <h2 className="pt-tdoc-title">{block.text}</h2>;
    case "h":
      return (
        <h3 className="pt-tdoc-h">
          <Text text={block.text} doc={doc} values={values} />
        </h3>
      );
    case "p":
      return (
        <p>
          <Text text={block.text} doc={doc} values={values} />
        </p>
      );
    case "ol":
    case "ul": {
      const List = block.t === "ol" ? "ol" : "ul";
      return (
        <List className={block.t === "ol" ? "pt-tdoc-ol" : "pt-tdoc-ul"}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Text text={item} doc={doc} values={values} />
            </li>
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
              <span>Signature</span>
              {party.name ? (
                <span>
                  Name: <Text text={party.name} doc={doc} values={values} />
                </span>
              ) : (
                <span>Name</span>
              )}
              <span>Date</span>
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

/** The document as it will print: the on-screen preview and the "Save as PDF" page. */
export default function TemplateDocument({ doc, values }: { doc: TemplateDoc; values: TemplateValues }) {
  return (
    <article className="pt-tdoc" aria-label={`${doc.title} preview`} data-clarity-mask="true">
      {doc.body.map((block, i) => (
        <BlockView key={i} block={block} doc={doc} values={values} />
      ))}
      <p className="pt-tdoc-foot">{DOC_FOOTER}</p>
    </article>
  );
}
