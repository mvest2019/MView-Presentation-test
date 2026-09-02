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

/* `Band`, `Panel` and `Row` moved to `app/_components/cta-band.tsx` when the
   Operator Directory needed the same ask. Pure move — no markup changed. */

/** After the table: the map has been shown, so the ask is to come in. */
export function RegisterCta() {
  return (
    <Band
      tone="plain"
      icon={Layers}
      eyebrow="Free account"
      title="Start free — it is the whole platform, not a trial"
      body="The map, the table, every filter, the record behind any well you open and the exports that come off it are all in the free account. Claim the lease you own and its activity follows you from then on."
      primary={{ href: "/register", label: "Create your free account" }}
      secondary={{ href: "/login", label: "Sign in" }}
    >
      <Panel title="In the free account">
        <Row label="The full map and table" note="every zoom, every filter" />
        <Row label="One claimed lease" note="with its activity reports" />
        <Row label="Well records and written summaries" />
        <Row label="CSV and PDF exports" note="filters and all" />
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
      title="What it costs, in plain terms"
      body="Most of what a mineral owner needs to value what they own sits in the free version, and it is meant to stay there. Premium is an add-on to the same account — further services for holdings that need them — not a separate product you are moved onto once you are invested."
      primary={{ href: "/pricing", label: "See pricing" }}
      secondary={{ href: "/faq", label: "Pricing questions" }}
    >
      <div className="grid gap-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-mv-line">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep">
            Free
          </p>
          <p className="mt-[7px] text-[12.5px] leading-snug text-mv-slate">
            The whole map and table, one claimed lease, and everything you can
            export from them.
          </p>
        </div>

        <div className="rounded-xl bg-mv-card-tint p-4 ring-1 ring-mv-line">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-muted">
            Premium
          </p>
          <p className="mt-[7px] text-[12.5px] leading-snug text-mv-slate">
            An add-on to that account: more claimed leases and the further
            services built on top of them.
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
      { label: "The full map and table", free: true, premium: true },
      { label: "Well records and exports", free: true, premium: true },
      { label: "Claimed leases", free: "One", premium: "Multiple" },
      { label: "Further premium services", free: "—", premium: true },
    ];

  return (
    <Band
      tone="deep"
      icon={Tag}
      eyebrow="Plans"
      title="Put the plans side by side and take the one that fits"
      body="Free covers a single claimed lease and the whole of the map you have just been reading about. Premium adds more claimed leases and the services built on them, on the same account. Most people never need to move."
      primary={{ href: "/pricing#plans", label: "Plans" }}
      secondary={{ href: "/register", label: "Start free instead" }}
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
