import type { Metadata } from "next";
import ToolHeader, { ExampleLabel } from "@/components/tools/ToolHeader";

export const metadata: Metadata = {
  title: "Ask a question",
  description: "Ask anything about your contract or lease and get an answer that points to the clause it came from.",
};

const THREAD = [
  { who: "you", text: "Can my landlord keep my deposit for normal wear and tear?" },
  {
    who: "pt",
    text: "No. Your lease says the deposit covers damage beyond normal wear and tear, and California law says the same. Faded paint and small nail holes count as normal wear.",
    cite: "Lease, section 6: Security deposit",
  },
  { who: "you", text: "How long do they have to send it back?" },
  {
    who: "pt",
    text: "21 days after you move out, with an itemized list of anything they kept.",
    cite: "Lease, section 6 and California Civil Code 1950.5",
  },
];

export default function AskPage() {
  return (
    <main className="pt-page-pad">
      <div className="pt-container-wide">
        <ToolHeader
          icon="ask"
          label="Ask a question"
          title="Ask your document anything"
          line="Answers in plain English that point to the exact clause, so you can check them yourself."
          soon
        />
        <ExampleLabel>Example: a lease</ExampleLabel>
        <div className="mx-auto grid max-w-3xl gap-3">
          {THREAD.map((msg, i) =>
            msg.who === "you" ? (
              <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-(--pt-ink) px-4 py-3 text-white">
                {msg.text}
              </p>
            ) : (
              <div key={i} className="max-w-[85%] rounded-2xl rounded-bl-sm border border-(--pt-line) bg-white px-4 py-3">
                <p>{msg.text}</p>
                <p className="mt-2 inline-flex rounded-md bg-(--pt-butter)/60 px-2 py-1 font-mono text-xs">{msg.cite}</p>
              </div>
            ),
          )}
          <div className="pt-framed mt-4 flex items-center gap-3 bg-white py-2 pl-4 pr-2">
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <input id="ask-input" disabled placeholder="Ask about your document" className="min-w-0 flex-1 bg-transparent text-[1.0625rem] outline-none disabled:cursor-not-allowed" />
            <button type="button" disabled className="pt-btn pt-btn-solid h-11 rounded-[3px] px-5">
              Ask
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
