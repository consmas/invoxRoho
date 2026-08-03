"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const audienceChips = [
  "Anchor Buyers",
  "Suppliers",
  "Funders",
  "Relationship Managers",
  "Compliance Officers",
  "Credit & Risk Teams",
  "Treasury Teams",
  "Auditors",
];

const steps = [
  [
    "Buyer approves the invoice",
    "The anchor confirms the invoice is valid and payable, triggering everything that follows.",
  ],
  [
    "An offer generates instantly",
    "Pricing, fees, and net proceeds are calculated and shown to the supplier when approval lands.",
  ],
  [
    "Supplier accepts, funds move",
    "A participating funder settles the net proceeds, often within hours of acceptance.",
  ],
  [
    "Buyer settles at maturity",
    "The original due date does not change. The buyer pays once, on schedule, to the funder.",
  ],
];

const trustItems = [
  [
    "Maker-checker approvals",
    "No single user can move money alone. Every payment, disbursement, and KYC decision requires a second sign-off.",
  ],
  [
    "KYC/KYB & sanctions screening",
    "Every counterparty is screened before onboarding completes. A match blocks activation until compliance clears it.",
  ],
  [
    "Immutable audit trail",
    "Every state change, including who, what, and when, is recorded permanently and available to auditors.",
  ],
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receipt, setReceipt] = useState({
    amount: 100000,
    discount: 1972.6,
    fee: 100,
    days: 2,
    speed: "2 days",
    status: "Financed",
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amount = 100000;
    const discount = 1972.6;
    const fee = 100;

    if (reduceMotion) return;

    let frame = 0;
    let animationFrame = 0;
    const totalFrames = 54;
    const tick = () => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const subProgress = progress > 0.5 ? Math.min((progress - 0.5) / 0.5, 1) : 0;
      setReceipt({
        amount: amount * eased,
        discount: discount * subProgress,
        fee: fee * subProgress,
        days: Math.round(60 - 58 * subProgress),
        speed: progress === 1 ? "2 days" : "60 days",
        status: progress === 1 ? "Financed" : "Calculating",
      });
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const net = receipt.amount - receipt.discount - receipt.fee;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1C1B18]">
      <header
        className={`sticky top-0 z-50 border-b px-6 backdrop-blur transition ${
          scrolled
            ? "border-[#E7E3DA] bg-[#FAF9F6]/90 shadow-sm"
            : "border-transparent bg-[#FAF9F6]/80"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-medium tracking-wide text-[#0A101F]">
            <LogoMark />
            INVOX
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#4A473F] md:flex">
            <a href="#how-it-works" className="hover:text-[#0A101F]">How it works</a>
            <a href="#audiences" className="hover:text-[#0A101F]">Who it&apos;s for</a>
            <a href="#trust" className="hover:text-[#0A101F]">Security</a>
            <a href="#region" className="hover:text-[#0A101F]">Availability</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg border border-[#E7E3DA] px-4 py-2 text-sm font-semibold text-[#0A101F] hover:border-[#0A101F] hover:bg-white sm:inline-flex"
            >
              Sign in
            </Link>
            <a
              href="#cta"
              className="rounded-lg bg-[#9C7A3F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#8a6b37]"
            >
              Request access
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0A101F] px-6 py-20 text-center text-white sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(198,164,103,0.16),transparent_45%),radial-gradient(circle_at_82%_78%,rgba(43,63,107,0.45),transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A467]">
            Supply Chain Finance · Release 1 — Reverse Factoring
          </p>
          <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
            Approved payables, financed in days — not quarters.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
            INVOX lets anchor buyers extend payment terms while suppliers get paid early, funded by banks and DFIs, with maker-checker approvals and a full audit trail on every transaction.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#cta" className="rounded-lg bg-[#9C7A3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8a6b37]">
              Request access
            </a>
            <a href="#how-it-works" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              See how it works
            </a>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-16 max-w-md rounded-2xl border border-[#E7E3DA] bg-white p-7 text-left text-[#1C1B18] shadow-2xl">
          <div className="mb-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[#847F72]">
            <span>Invoice ASD-4471</span>
            <span className="rounded-full bg-[#E9F5EF] px-3 py-1 text-[#0D7A57]">
              {receipt.status}
            </span>
          </div>
          <ReceiptLine label="Invoice amount" value={formatMoney(receipt.amount)} />
          <ReceiptLine label={`Discount (24% p.a., ${receipt.days} days)`} value={`– ${formatMoney(receipt.discount)}`} />
          <ReceiptLine label="Platform fee" value={`– ${formatMoney(receipt.fee)}`} />
          <div className="my-4 h-px bg-gradient-to-r from-[#9C7A3F]/70 via-[#C6A467]/30 to-transparent" />
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-medium text-[#0A101F]">Net proceeds</span>
            <span className="font-serif text-3xl font-medium italic tabular-nums text-[#0D7A57]">
              {formatMoney(net)}
            </span>
          </div>
          <div className="mt-5 flex justify-between gap-4 border-t border-[#E7E3DA] pt-4 text-xs text-[#847F72]">
            <span>Paid to supplier in <strong className="text-[#0A101F]">{receipt.speed}</strong></span>
            <span>Buyer settles at maturity</span>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E7E3DA] bg-white py-14 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-2xl font-medium text-[#0A101F]">Built for every side of the transaction</h2>
          <p className="mt-1 text-sm text-[#847F72]">One programme, aligned incentives for everyone who touches an invoice</p>
        </div>
        <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-[landingMarquee_32s_linear_infinite] gap-3">
            {[...audienceChips, ...audienceChips].map((chip, index) => (
              <span key={`${chip}-${index}`} className="rounded-full border border-[#E7E3DA] bg-[#FAF9F6] px-5 py-2 text-sm font-medium text-[#4A473F]">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 text-center md:grid-cols-3">
          <Stat value="< 1 sec" label="to generate a priced early-payment offer once an invoice is approved" />
          <Stat value="2 days" label="typical time from supplier acceptance to funds landing" />
          <Stat value="100%" label="of financial actions require a second, independent sign-off" />
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-medium leading-tight text-[#0A101F] sm:text-4xl">
              Two sides. One system. No guesswork about who does what.
            </h2>
          </div>
          <div className="grid overflow-hidden rounded-2xl border border-[#E7E3DA] bg-white shadow-sm md:grid-cols-2">
            <Responsibility title="The relationship and the terms" tag="The buyer owns" items={["Payment terms", "Supplier relationships", "Invoice approval", "Programme design"]} />
            <Responsibility title="The cash flow and the controls" tag="INVOX secures" items={["Early payment pricing", "Funding allocation", "Compliance screening", "The audit trail"]} />
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-6">
          <NarrativeCard dark tag="The problem" title="Sixty days on paper. Ninety in practice.">
            Standard payment terms already stretch supplier cash flow thin. When a buyer needs more room, that pressure lands on the supplier first, and often on the relationship next.
          </NarrativeCard>
          <NarrativeCard tag="The reframe" title="This is not a loan. It is an asset you already have.">
            An approved invoice is already money owed to the supplier, just not yet due. INVOX lets a funder buy that certainty at a discount today.
          </NarrativeCard>
          <NarrativeCard dark tag="The outcome" title="Once trust is established, the friction disappears.">
            Every approval, price, and payment follows the same rules every time, so financing an invoice becomes as routine as approving one.
          </NarrativeCard>
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="The reverse factoring loop" title="From approval to payment, in one continuous flow.">
            Every stage is visible to both sides. No one is left waiting on a phone call to know where an invoice stands.
          </SectionHead>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map(([title, body], index) => (
              <div key={title} className="relative">
                <div className="mb-5 flex size-9 items-center justify-center rounded-full bg-[#0A101F] font-serif text-[#C6A467]">
                  {index + 1}
                </div>
                {index < steps.length - 1 ? <div className="absolute left-9 top-4 hidden h-px w-full bg-[#E7E3DA] md:block" /> : null}
                <h3 className="font-semibold text-[#0A101F]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#847F72]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="audiences" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Built for three sides of one transaction" title="Who INVOX is for" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <AudienceCard title="Anchor buyers">
              Strengthen supplier relationships while extending your own payment terms. INVOX plugs into your existing approvals process.
            </AudienceCard>
            <AudienceCard title="Suppliers">
              Turn buyer-approved invoices into cash in days, at a fraction of overdraft cost. Every offer is optional.
            </AudienceCard>
            <AudienceCard title="Funders">
              Deploy capital into short-duration, self-liquidating trade assets backed by buyer-approved invoices.
            </AudienceCard>
          </div>
        </div>
      </section>

      <section id="trust" className="bg-[#0A101F] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#C6A467]">Built for institutions</p>
            <h2 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
              Every object in INVOX answers who, how much, what stage, and who signed off.
            </h2>
          </div>
          <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
            <TrustDiagram />
            <ul>
              {trustItems.map(([title, body]) => (
                <li key={title} className="flex gap-4 border-t border-white/10 py-5 first:border-0 first:pt-0">
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-[#C6A467]/50 text-[#C6A467]">✓</span>
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/60">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="region" className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <SectionHead eyebrow="Built for the market we serve" title="Designed around West African trade, from day one." />
          <div className="space-y-4 text-[15px] leading-7 text-[#4A473F]">
            <p>Invoices are priced and settled in GHS by default, with onboarding checks built around locally available registries and ID formats.</p>
            <p>Disbursements and collections run over local banking rails, not through a foreign intermediary that adds days and fees back into a process built to remove them.</p>
          </div>
        </div>
      </section>

      <section id="cta" className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#E7E3DA] bg-white px-6 py-14 text-center shadow-lg sm:px-14">
          <h2 className="font-serif text-3xl font-medium text-[#0A101F]">Ready to shorten your payables cycle?</h2>
          <p className="mt-3 text-sm text-[#847F72]">INVOX is currently onboarding anchor corporates and funding partners for Release 1.</p>
          {submitted ? (
            <div className="mt-8 flex items-center justify-center gap-2 font-medium text-[#0D7A57]">
              <span className="flex size-5 items-center justify-center rounded-full border border-current">✓</span>
              Thanks. We&apos;ll follow up within two business days.
            </div>
          ) : (
            <form
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              <input
                type="email"
                required
                placeholder="you@company.com"
                aria-label="Work email"
                className="h-12 flex-1 rounded-lg border border-[#E7E3DA] bg-[#FAF9F6] px-4 text-sm outline-none focus:border-[#1B2A4A] focus:ring-4 focus:ring-[#1B2A4A]/10"
              />
              <button className="h-12 rounded-lg bg-[#9C7A3F] px-6 text-sm font-semibold text-white hover:bg-[#8a6b37]">
                Request access
              </button>
            </form>
          )}
          <p className="mt-5 text-xs text-[#A39D8D]">
            For anchor corporates, funders, and suppliers invited by an anchor already on the platform.
          </p>
        </div>
      </section>

      <footer className="bg-[#0A101F] px-6 py-11 text-white/50">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-2 font-serif text-lg text-white">
              <LogoMark light />
              INVOX
            </div>
            <nav className="flex flex-wrap gap-6 text-sm">
              <a href="#how-it-works" className="hover:text-white">How it works</a>
              <a href="#audiences" className="hover:text-white">Who it&apos;s for</a>
              <a href="#trust" className="hover:text-white">Security</a>
              <a href="#region" className="hover:text-white">Availability</a>
            </nav>
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-white/35">
            <span>© 2026 INVOX · Supply Chain Finance Platform · Release 1 — Reverse Factoring</span>
            <span>Accra, Ghana</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes landingMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[landingMarquee_32s_linear_infinite\\] {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-[#847F72]">{label}</span>
      <span className="font-medium tabular-nums text-[#1C1B18]">{value}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-5xl font-medium leading-none text-[#0A101F]">{value}</p>
      <p className="mx-auto mt-3 max-w-56 text-sm leading-6 text-[#847F72]">{label}</p>
    </div>
  );
}

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9C7A3F]">{eyebrow}</p>
      <h2 className="font-serif text-3xl font-medium leading-tight text-[#0A101F] sm:text-4xl">{title}</h2>
      {children ? <p className="mt-3 text-[15px] leading-7 text-[#847F72]">{children}</p> : null}
    </div>
  );
}

function Responsibility({ tag, title, items }: { tag: string; title: string; items: string[] }) {
  return (
    <div className="p-8 md:border-l md:first:border-l-0 md:p-12">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#9C7A3F]">{tag}</p>
      <h3 className="mb-5 font-serif text-2xl font-medium text-[#0A101F]">{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item} className="border-t border-[#E7E3DA] py-3 text-sm text-[#4A473F] first:border-0">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NarrativeCard({ tag, title, children, dark = false }: { tag: string; title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`rounded-[22px] p-8 shadow-xl sm:p-14 ${dark ? "bg-[#0A101F] text-white" : "border border-[#E7E3DA] bg-white text-[#1C1B18]"}`}>
      <p className={`mb-4 text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-[#C6A467]" : "text-[#9C7A3F]"}`}>{tag}</p>
      <h3 className="max-w-3xl font-serif text-3xl font-medium leading-tight">{title}</h3>
      <p className={`mt-4 max-w-2xl text-[15px] leading-7 ${dark ? "text-white/65" : "text-[#4A473F]"}`}>{children}</p>
    </div>
  );
}

function AudienceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E7E3DA] bg-white p-8 shadow-sm">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-[#F2E9D8] text-[#9C7A3F]">
        <LogoMark />
      </div>
      <h3 className="font-serif text-xl font-medium text-[#0A101F]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#4A473F]">{children}</p>
    </div>
  );
}

function LogoMark({ light = false }: { light?: boolean }) {
  const stroke = light ? "#C6A467" : "#9C7A3F";
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="5" width="26" height="18" rx="4" stroke={stroke} strokeWidth="1.4" />
      <path d="M6.5 11H21.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.5 15.5H15" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <circle cx="19" cy="15.5" r="2.4" stroke={stroke} strokeWidth="1.3" />
    </svg>
  );
}

function TrustDiagram() {
  return (
    <div className="flex justify-center">
      <svg width="220" height="220" viewBox="0 0 220 220" fill="none" aria-hidden="true">
        <circle cx="110" cy="110" r="90" stroke="rgba(198,164,103,0.25)" strokeWidth="1" />
        {[["110", "42", "7"], ["178", "110", "7"], ["110", "178", "7"], ["42", "110", "7"]].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#0A101F" stroke="#C6A467" strokeWidth="1.4" />
        ))}
        {[["152", "68"], ["152", "152"], ["68", "152"], ["68", "68"]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#0A101F" stroke="rgba(198,164,103,0.5)" strokeWidth="1.2" />
        ))}
        <path d="M110 49v122M42 110h136M65 65l90 90M155 65l-90 90" stroke="rgba(198,164,103,0.3)" strokeWidth="1" />
        <circle cx="110" cy="110" r="13" fill="#9C7A3F" />
      </svg>
    </div>
  );
}

function formatMoney(value: number) {
  return `GHS ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
