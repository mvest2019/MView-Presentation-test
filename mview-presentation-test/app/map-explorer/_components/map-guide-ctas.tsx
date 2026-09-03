"use client";

import { Check, Layers, Minus, Tag, Wallet } from "lucide-react";

import { Band, Panel, Row } from "@/app/_components/cta-band";

/*
 * The three asks on the feature guide.
 *
 * Spread through the page rather than stacked at the end, and each placed
 * where the question it answers has just occurred to someone: the free account
 * once the map and the table have been shown; what it costs after the well
 * records, which are the part that looks expensive; the plans at the end, when
 * the only question left is which one.
 *
 * Each carries something on the right that can be checked rather than only
 * asserted — what the free account holds, what is paid for and what is not,
 * and the two plans side by side. A band with a claim and no evidence is an
 * advertisement; a band with the list beside it is an answer.
 *
 * The copy is held to what the product says about itself in its own FAQ: a
 * free account that is the whole platform rather than a trial, one claimed
 * lease inside it, multiple leases and further services as a paid add-on to
 * that same account. No price is quoted here — the page being linked to is
 * the one that sets them.
 */

/** The shell every band shares: the ask on the left, the evidence on the right. */
function Band({
  tone,
  icon: Icon,
  eyebrow,
  title,
  body,
  primary,
  secondary,
  children,
}: {
  /** `deep` for the band that closes the page, `plain` for the two mid-page. */
  tone: "plain" | "deep";
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  /** One paragraph, or several. */
  body: string | string[];
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  children: React.ReactNode;
}) {
  const deep = tone === "deep";

  return (
    <section
      className={`overflow-hidden rounded-2xl ${
        deep
          ? "bg-gradient-to-br from-[#eaf7ef] via-[#f3fbf6] to-[#e6f5ec] ring-1 ring-[#cfe8da]"
          : "bg-white ring-1 ring-mv-line"
      }`}
    >
      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-12 lg:p-10">
        <div className="min-w-0 lg:self-center">
          <span className="inline-flex items-center gap-[7px] rounded-full border border-mv-mint-edge bg-mv-mint px-[11px] py-[5px] text-[10px] font-extrabold uppercase tracking-[.11em] text-mv-green-deep">
            <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
            {eyebrow}
          </span>

          <h2 className="mt-4 text-[23px] font-extrabold leading-[1.12] tracking-[-0.02em] text-mv-ink lg:text-[30px]">
            {title}
          </h2>
          {(Array.isArray(body) ? body : [body]).map((paragraph, at) => (
            <p
              key={paragraph}
              className={`max-w-[58ch] text-[13px] leading-relaxed text-mv-slate lg:text-[14px] ${
                at === 0 ? "mt-3" : "mt-2"
              }`}
            >
              {paragraph}
            </p>
          ))}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={primary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-mv-green-deep px-[20px] py-[12px] text-[13.5px] font-semibold text-white shadow-mv transition-[filter] hover:brightness-105"
            >
              {primary.label}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>

            <Link
              href={secondary.href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-[18px] py-[11px] text-[13.5px] font-semibold text-mv-green-deep ring-1 ring-mv-line transition-shadow hover:ring-mv-green-deep"
            >
              {secondary.label}
            </Link>
          </div>
        </div>

        <div className="min-w-0 lg:self-center">{children}</div>
      </div>
    </section>
  );
}

/** A titled panel of rows, divided rather than boxed one by one. */
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-mv-line">
      <p className="border-b border-mv-line bg-mv-card-tint px-4 py-[10px] text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex items-start gap-[10px] border-b border-mv-line-soft px-4 py-[11px] last:border-b-0">
      <span
        aria-hidden="true"
        className="mt-[1px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full bg-mv-mint text-mv-green-deep"
      >
        <Check size={10} strokeWidth={3} />
      </span>
      <span className="min-w-0 text-[12.5px] leading-snug text-mv-slate">
        {label}
        {note && <span className="text-mv-muted"> — {note}</span>}
      </span>
    </div>
  );
}

/** After the table: the map has been shown, so the ask is to come in. */
export function RegisterCta() {
  return (
    <Band
      tone="plain"
      icon={Layers}
      eyebrow="Free account"
      title="Start Free — No Trial Required"
      body={[
        "Create a free account to explore Mineral View's map, table, filters, well records, and available export tools.",
        "Claim a lease you own to keep track of its activity and access the information connected to your mineral interests—all in one place.",
      ]}
      primary={{ href: "/register", label: "Create Your Free Account" }}
      secondary={{ href: "/login", label: "Sign In" }}
    >
      <Panel title="Included with your free account">
        <Row
          label="Full Map & Table Access"
          note="Explore available zoom levels and filters"
        />
        <Row label="One Claimed Lease" note="Track activity related to your lease" />
        <Row
          label="Well Records & Summaries"
          note="Review detailed well information in a clear format"
        />
        <Row
          label="CSV & PDF Exports"
          note="Export filtered data and available records"
        />
      </Panel>
    </Band>
  );
}

/** After the well records — the part that looks like it must be paid for. */
export function PricingCta() {
  return (
    <Band
      tone="plain"
      icon={Wallet}
      eyebrow="Pricing"
      title="Simple Pricing, Built Around What You Need"
      body={[
        "Mineral View gives mineral owners access to core tools and data through the free account, including the map, table, one claimed lease, and available export features.",
        "When you need to manage additional leases or access more advanced services, Premium expands the same account with added capabilities—without changing how you use the platform.",
      ]}
      primary={{ href: "/pricing", label: "View Pricing" }}
      secondary={{ href: "/faq", label: "Pricing Questions" }}
    >
      <div className="grid gap-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-mv-line">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep">
            Free
          </p>
          <p className="mt-[7px] text-[12.5px] leading-snug text-mv-slate">
            Access the full map and table, claim one lease, and use the
            available export tools included with your account.
          </p>
        </div>

        <div className="rounded-xl bg-mv-card-tint p-4 ring-1 ring-mv-line">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-muted">
            Premium
          </p>
          <p className="mt-[7px] text-[12.5px] leading-snug text-mv-slate">
            Expand your account with additional claimed leases and advanced
            services designed for larger or more complex mineral holdings.
          </p>
        </div>
      </div>
    </Band>
  );
}

/** Last: everything has been seen, and the only question left is which one. */
export function PlansCta() {
  /* The comparison the button promises, made before it is pressed. */
  const rows: { label: string; free: string | true; premium: string | true }[] =
    [
      { label: "Full Map & Table Access", free: true, premium: true },
      { label: "Well Records & Exports", free: true, premium: true },
      { label: "Claimed Leases", free: "One", premium: "Multiple" },
      { label: "Additional Premium Services", free: "—", premium: true },
    ];

  return (
    <Band
      tone="deep"
      icon={Tag}
      eyebrow="Plans"
      title="Choose the Plan That Matches Your Requirements"
      body="Start with the Free plan for access to the full map, table, well records, exports, and one claimed lease. Upgrade to Premium when you need to manage multiple leases or access additional services—all within the same account."
      primary={{ href: "/pricing#plans", label: "View Plans" }}
      secondary={{ href: "/register", label: "Start Free" }}
    >
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-mv-line">
        <div className="grid grid-cols-[minmax(0,1fr)_58px_72px] border-b border-mv-line bg-mv-card-tint px-4 py-[10px] text-[10px] font-extrabold uppercase tracking-[.1em] text-mv-muted">
          <span />
          <span className="text-center text-mv-green-deep">Free</span>
          <span className="text-center">Premium</span>
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_58px_72px] items-center border-b border-mv-line-soft px-4 py-[11px] last:border-b-0"
          >
            <span className="min-w-0 text-[12.5px] leading-snug text-mv-slate">
              {row.label}
            </span>
            <Cell value={row.free} />
            <Cell value={row.premium} />
          </div>
        ))}
      </div>
    </Band>
  );
}

/** A tick, a dash, or a word — whichever the row is actually saying. */
function Cell({ value }: { value: string | true }) {
  if (value === true) {
    return (
      <span className="flex justify-center">
        <span
          aria-label="included"
          className="grid h-[19px] w-[19px] place-items-center rounded-full bg-mv-mint text-mv-green-deep"
        >
          <Check size={11} strokeWidth={3} aria-hidden="true" />
        </span>
      </span>
    );
  }

  if (value === "—") {
    return (
      <span className="flex justify-center text-mv-line-strong">
        <Minus size={14} strokeWidth={2.5} aria-label="not included" />
      </span>
    );
  }

  return (
    <span className="text-center text-[11.5px] font-semibold text-mv-slate">
      {value}
    </span>
  );
}
