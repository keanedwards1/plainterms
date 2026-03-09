import type { Metadata } from "next";
import Link from "next/link";

const PROCESS_CARDS = [
  {
    title: "Pay Securely",
    body: "Complete secure checkout to begin contract processing.",
    icon: "wallet",
  },
  {
    title: "Contract Analyzed",
    body: "PlainTerms parses clauses and scores contractual risk.",
    icon: "refresh",
  },
  {
    title: "Plain-English Summary",
    body: "Get clear explanations of terms, obligations, and red flags.",
    icon: "summary",
  },
  {
    title: "Download & Review",
    body: "Use your report for negotiations before signature.",
    icon: "download",
  },
] as const;

const VALUE_CARDS = [
  {
    title: "Risk Visibility",
    body: "Spot high, medium, and low severity issues quickly.",
  },
  {
    title: "Clause Clarity",
    body: "Understand what each clause means in practical language.",
  },
  {
    title: "Negotiation Ready",
    body: "Use questions and talking points for your next revision round.",
  },
] as const;

const PLAN_PREVIEW = [
  {
    name: "Scan",
    price: "$39",
    body: "Quick risk read before signing pressure.",
    featured: false,
  },
  {
    name: "Report",
    price: "$69",
    body: "Most selected for full contract visibility.",
    featured: true,
  },
  {
    name: "Protect",
    price: "$99",
    body: "Deeper fallback strategy for complex terms.",
    featured: false,
  },
] as const;

const TESTIMONIALS = [
  {
    quote: "PlainTerms made contract language finally understandable.",
    role: "Creator Manager",
  },
  {
    quote: "The red-flag view gave me leverage before signing.",
    role: "Independent Creator",
  },
  {
    quote: "Clean layout and clear next steps. Huge time saver.",
    role: "Startup Founder",
  },
] as const;

const FAQ_PREVIEW = [
  {
    q: "How fast is the report?",
    a: "Most contracts are processed in under 5 minutes after payment confirmation.",
  },
  {
    q: "What file formats are supported?",
    a: "PDF and DOCX are supported in the current workflow.",
  },
  {
    q: "Is this legal advice?",
    a: "No. PlainTerms is informational guidance and not a replacement for legal counsel.",
  },
] as const;

type IconKind = (typeof PROCESS_CARDS)[number]["icon"];

function ProcessIcon({ kind }: { kind: IconKind }) {
  if (kind === "wallet") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#4c72a5]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2.5" y="6" width="19" height="12" rx="2.2" />
        <path d="M16.5 12h4" />
        <circle cx="15.2" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "refresh") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#4c72a5]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 12a8 8 0 1 1-2.2-5.6" />
        <path d="M20 4v5h-5" />
      </svg>
    );
  }

  if (kind === "summary") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#4c72a5]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="13" height="18" rx="2" />
        <path d="M7 8h5" />
        <path d="M7 12h5" />
        <circle cx="17.5" cy="16.5" r="3.2" />
        <path d="m19.7 18.7 2 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#4c72a5]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "PlainTerms - Contract Analysis for Creators",
  description:
    "Upload any brand deal, management agreement, or licensing contract. Get a plain-English risk report with negotiation tips in minutes.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PlainTerms - Contract Analysis for Creators",
    description:
      "Upload any brand deal, management agreement, or licensing contract. Get a plain-English risk report with negotiation tips in minutes.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlainTerms - Contract Analysis for Creators",
    description:
      "Upload any brand deal, management agreement, or licensing contract. Get a plain-English risk report with negotiation tips in minutes.",
  },
};

export default function HomePage() {
  return (
    <main className="relative overflow-hidden pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[860px] bg-gradient-to-b from-[#dbe8fb] via-[#e7f0fc] to-[#eaf2fc]" />
      <div className="pointer-events-none absolute -left-28 top-8 h-64 w-64 rounded-full bg-[#95b6e8]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-36 h-80 w-80 rounded-full bg-[#b4caeb]/30 blur-3xl" />

      <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <h1
            className="text-[2.6rem] leading-[0.98] text-[#2b4670] sm:text-[3.25rem] lg:text-[3.8rem]"
            style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 700 }}
          >
            Understand Contracts in Plain English.
          </h1>
          <p
            className="mx-auto mt-5 max-w-3xl text-[1.1rem] leading-7 text-[#446088] sm:text-[1.25rem]"
            style={{ fontFamily: "var(--font-body), sans-serif" }}
          >
            Upload contracts and get clear, practical explanations without the legalese.
          </p>
        </div>

        <article className="mx-auto mt-9 w-full max-w-[860px] rounded-2xl border border-[#cadbf0] bg-[#f9fbff] px-6 py-6 sm:px-8 sm:py-7 shadow-[0_24px_36px_-32px_rgba(45,86,143,0.55)]">
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#c7d7ee] bg-white text-[#4f74a8]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 18V6" />
                <path d="m7.5 10.5 4.5-4.5 4.5 4.5" />
              </svg>
            </span>
            <h2 className="text-[1.8rem] text-[#273f65] sm:text-[2rem]" style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 700 }}>
              Upload a Contract PDF to Analyze
            </h2>
          </div>

          <Link
            href="/analyze"
            className="mt-5 block rounded-xl border-2 border-dashed border-[#bfd2ed] bg-[#f3f8ff] px-5 py-5 text-center text-[1rem] text-[#58749c] transition hover:border-[#9bbbe4] hover:bg-[#eef5ff]"
          >
            Drop a PDF or click to upload
          </Link>

          <div className="mt-6 flex justify-center">
            <Link
              href="/analyze"
              className="rounded-lg border border-[#3d7453] bg-gradient-to-b from-[#4a9667] to-[#3f855d] px-8 py-3 text-[1.2rem] font-semibold text-white shadow-[0_12px_18px_-14px_rgba(51,99,71,0.55)] transition hover:brightness-105"
              style={{ fontFamily: "var(--font-body), sans-serif" }}
            >
              Upload PDF
            </Link>
          </div>

          <p className="mt-3 text-center text-[0.95rem] text-[#4f6a8f]">Supported formats: PDF, DOCX</p>

          <div className="mt-5 border-t border-[#d3e0f2] pt-4 text-center">
            <p className="inline-flex items-center gap-2 text-[1rem] text-[#2f7752]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#79b392] bg-[#e6f6eb]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m5 13 4 4 10-10" />
                </svg>
              </span>
              100% secure & confidential analysis
            </p>
          </div>
        </article>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PROCESS_CARDS.map((card) => (
            <Link
              key={card.title}
              href="/how-it-works"
              className="block rounded-xl border border-[#c9daef] bg-[#f9fbff] px-5 py-4 shadow-[0_10px_18px_-16px_rgba(43,84,138,0.5)] transition hover:border-[#9fbde7] hover:bg-[#f3f8ff]"
            >
              <div className="flex items-start gap-3">
                <ProcessIcon kind={card.icon} />
                <h3 className="text-[1.35rem] leading-7 text-[#2a446e]" style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 700 }}>
                  {card.title}
                </h3>
              </div>
              <p className="mt-3 text-[0.96rem] leading-7 text-[#4f6b90]">{card.body}</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {VALUE_CARDS.map((card) => (
            <article key={card.title} className="rounded-xl border border-[#c9daef] bg-[#f9fbff] p-5">
              <h3 className="text-xl font-semibold text-[#2a446e]">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#4f6b90]">{card.body}</p>
            </article>
          ))}
        </section>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-2 sm:px-8 lg:px-12">
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-[#c9daef] bg-[#f9fbff] px-6 py-5 text-center shadow-[0_10px_18px_-16px_rgba(43,84,138,0.5)]">
            <p className="text-[1.85rem] text-[#263f66]" style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 700 }}>
              Powered by AWS
            </p>
            <p className="mt-2 text-[0.98rem] text-[#506b90]">Lambda + API Gateway</p>
          </article>
          <article className="rounded-xl border border-[#c9daef] bg-[#f9fbff] px-6 py-5 text-center shadow-[0_10px_18px_-16px_rgba(43,84,138,0.5)]">
            <p className="text-[1.85rem] text-[#263f66]" style={{ fontFamily: "var(--font-body), sans-serif", fontWeight: 700 }}>
              Deployed on Vercel
            </p>
            <p className="mt-2 text-[0.98rem] text-[#506b90]">Next.js powered</p>
          </article>
        </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/analyze"
              className="rounded-lg border border-[#3d7453] bg-gradient-to-b from-[#4a9667] to-[#3f855d] px-10 py-3 text-[1.35rem] font-semibold text-white shadow-[0_12px_18px_-14px_rgba(51,99,71,0.55)] transition hover:brightness-105"
              style={{ fontFamily: "var(--font-body), sans-serif" }}
            >
              Get Started Now
            </Link>
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-6xl px-5 sm:px-8 lg:px-12">
        <h2 className="text-center text-[2.3rem] text-[#2a446e]" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
          Trusted by Professionals Everywhere
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article key={item.quote} className="rounded-xl border border-[#c9daef] bg-[#f9fbff] p-4">
              <p className="text-sm tracking-wider text-[#d8a135]">★★★★★</p>
              <p className="mt-2 text-sm leading-7 text-[#4f6b90]">“{item.quote}”</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#5a7599]">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-6xl px-5 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-[#c9daef] bg-[#f9fbff] p-6 shadow-[0_10px_18px_-16px_rgba(43,84,138,0.5)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="pt-kicker">Simple Pricing</p>
              <h2 className="mt-3 text-[2.2rem] text-[#2a446e]" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
                Pick your depth. Pay once.
              </h2>
            </div>
            <Link href="/pricing" className="pt-btn-secondary rounded-lg px-5 py-2.5 text-sm font-semibold">
              View Full Pricing
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {PLAN_PREVIEW.map((plan) => (
              <article key={plan.name} className={`rounded-xl border p-4 ${plan.featured ? "border-[var(--pt-accent)] bg-[#edf4ff]" : "border-[#c9daef] bg-white"}`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#5a7599]">{plan.name}</p>
                <p className="mt-2 text-5xl text-[#2a446e]" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
                  {plan.price}
                </p>
                <p className="mt-2 text-sm text-[#4f6b90]">{plan.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-6xl px-5 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-[#c9daef] bg-[#f9fbff] p-6 shadow-[0_10px_18px_-16px_rgba(43,84,138,0.5)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[2.1rem] text-[#2a446e]" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
              FAQ
            </h2>
            <Link href="/faq" className="pt-btn-secondary rounded-lg px-5 py-2.5 text-sm font-semibold">
              View All FAQ
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {FAQ_PREVIEW.map((item) => (
              <details key={item.q} className="rounded-xl border border-[#c9daef] bg-white p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-[#2a446e]">{item.q}</summary>
                <p className="mt-2 text-sm leading-7 text-[#4f6b90]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between border-t border-[#c9daef] px-5 py-7 text-sm text-[#5f7ca2] sm:px-8 lg:px-12">
        <p>PlainTerms is informational only and not legal advice.</p>
        <div className="flex gap-5">
          <Link href="/how-it-works" className="hover:text-[#2a446f]">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-[#2a446f]">
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-[#2a446f]">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:text-[#2a446f]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#2a446f]">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
