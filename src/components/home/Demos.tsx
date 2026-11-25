import { DEMOS } from "@/components/home/homeArt";
import "./demos.css";

/** Four looping demos of what each tool hands back. */
export default function Demos() {
  return (
    <div className="pt-demos">
      <div className="demos">
        {DEMOS.map((demo) => (
          <article key={demo.key} className="dcard">
            <div className="dcard__head">
              <h3>{demo.title}</h3>
              <p>{demo.line}</p>
            </div>
            {/* Static, trusted markup generated from our own mockup source. */}
            <div dangerouslySetInnerHTML={{ __html: demo.html }} />
          </article>
        ))}
      </div>
    </div>
  );
}
