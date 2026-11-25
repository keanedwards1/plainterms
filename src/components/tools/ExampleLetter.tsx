// The worked example for "Explain a letter": an HOA fence notice, explained.
const OPTIONS = [
  { title: "Ask for a variance", body: "Best if your neighbors are happy with the fence. We draft the request for you." },
  { title: "Show it was approved", body: "If the board signed off when it went up, send that approval." },
  { title: "Lower it", body: "Then send dated photos so the file is closed." },
];

const WORDS = [
  { term: "Variance", meaning: "Permission to break one rule in one case." },
  { term: "CC&Rs", meaning: "The rules every owner agreed to when buying." },
  { term: "Cure period", meaning: "The 30 days you have to fix it before fines." },
];

export default function ExampleLetter() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="flex items-center gap-6 rounded-[18px] bg-(--pt-ink) p-6 text-white">
        <p className="font-heading text-7xl font-semibold leading-none tracking-[-0.05em]">
          9<span className="mt-1 block text-center font-sans text-xs font-medium tracking-normal opacity-80">days</span>
        </p>
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-white/70">Reply by</p>
          <p className="font-heading text-3xl font-semibold tracking-[-0.035em]">Friday, December 12</p>
          <p className="mt-1 text-white/75">After that, fines of $100 a week can start.</p>
        </div>
      </section>
      <section className="pt-panel p-6">
        <h2 className="text-xl">What it says</h2>
        <p className="mt-3 text-lg leading-relaxed">
          Your back fence is 7 feet tall and the rules allow 6. The board wants it lowered, or a written request to keep it, within
          30 days.
        </p>
      </section>
      <section className="pt-panel p-6">
        <h2 className="text-xl">Your options</h2>
        <ol className="mt-4 grid gap-2.5">
          {OPTIONS.map((option, i) => (
            <li key={option.title} className="relative rounded-2xl bg-(--pt-surface-soft) py-3.5 pl-14 pr-4">
              <span className="absolute left-4 top-3.5 grid h-6 w-6 place-items-center rounded-full bg-(--pt-leaf) text-xs font-semibold">{i + 1}</span>
              <b className="font-medium">{option.title}</b>
              <p className="text-[0.9375rem] text-(--pt-muted)">{option.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="pt-panel p-6">
        <h2 className="text-xl">Words in this letter</h2>
        <dl className="mt-2">
          {WORDS.map((word) => (
            <div key={word.term} className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-(--pt-line) py-3 text-[0.9375rem] last:border-0">
              <dt className="font-medium">{word.term}</dt>
              <dd className="text-(--pt-muted)">{word.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
