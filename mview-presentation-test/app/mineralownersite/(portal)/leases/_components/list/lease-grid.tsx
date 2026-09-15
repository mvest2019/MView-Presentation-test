import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "../../../../_components/ui/badge";
import {
  formatCompactDollars,
  formatCompactVolume,
  formatDecimalInterest,
} from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE SAME TEN LEASES AS CARDS — the toolbar's other layout.
 *
 * ── WHAT A CARD KEEPS, AND WHY IT IS NOT THE SAME FIVE FACTS AS THE ROW ──
 *
 * A card cannot hold eleven columns without becoming a table with a border, so
 * it keeps the six the design names — county, operator, reservoir, wells,
 * interest, gas filed — under the one figure the reader came for. The list
 * keeps the rest. Grid is for recognising a lease; List is for comparing them.
 *
 * The acreage, the first-posting month, the county roll and its agreement
 * marker are on the row and on the report, not here: four more lines of small
 * grey type is what turned this card back into a cramped table last time.
 *
 * ── THE FIGURE IS LABELLED, WHICH ON A CARD IT HAS TO BE ──
 *
 * A row inherits its meaning from the column heading above it. A card has no
 * heading, so "$1.36M" alone is a number with no unit and no period — hence
 * "Estimated revenue" directly under it.
 *
 * ── THE WHOLE CARD IS ONE LINK AND "VIEW DETAILS" IS NOT A SECOND ONE ──
 *
 * The card is the target: there is no row to scroll sideways and no second
 * destination to offer. So the footer is a `<span>` that LOOKS like the control
 * it is — an anchor nested inside an anchor is invalid, and two links to one
 * report would make a keyboard reader tab through the record twice.
 */
export function LeaseGrid({ leases }: { leases: LeaseRecord[] }) {
  if (leases.length === 0) {
    return (
      <p className="rounded-mv border border-mv-line bg-mv-card p-6 text-center text-[13px] text-mv-muted">
        No lease on this record matches that search. Try a lease name, a lease
        number, a county, an operator or a reservoir.
      </p>
    );
  }

  return (
    <ul className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {leases.map((lease) => (
        <li key={lease.slug}>
          <Link
            href={leaseReportPath(lease.slug)}
            className="group flex h-full flex-col rounded-mv border border-mv-line bg-mv-card p-[18px] text-mv-ink no-underline shadow-mv transition-shadow hover:shadow-[0_4px_16px_rgba(4,35,26,.12)]"
          >
            <span className="flex items-start justify-between gap-2">
              <strong className="text-[13px] tracking-[0.01em]">
                {lease.name}
              </strong>
              <Badge tone="mint" size="xs" className="flex-none">
                <span
                  aria-hidden="true"
                  className="h-[5px] w-[5px] rounded-full bg-mv-green-deep"
                />
                {lease.status}
              </Badge>
            </span>

            {/* Two of the ten units carry no lease number on the filings, and
                the design prints the name alone rather than inventing one — but
                the LINE stays, empty, because dropping it lifts those two cards
                a row's worth out of line with the eight beside them and every
                figure in the row stops sharing a baseline. */}
            <span className="mt-[3px] block min-h-[15px] text-[10.5px] text-mv-muted">
              {lease.number ? `Lease ${lease.number}` : ""}
            </span>

            <span className="mt-2.5 block text-[26px] leading-none font-extrabold text-mv-green-deep tabular-nums">
              {formatCompactDollars(lease.mvestimate)}
            </span>
            <span className="mt-[5px] block text-[10.5px] text-mv-muted">
              Estimated revenue
            </span>

            {/* PAIRS IN ROW ORDER, NOT COLUMN ORDER. "Hurd Enterprises, Ltd"
                wraps to two lines in a card this wide, and two stacked columns
                would then have Reservoir sitting a line above Wells. In one
                grid the row grows and both stay level.

                The rule between them is drawn rather than bordered for the
                same reason a per-cell border was wrong: it would break at
                every row gap. */}
            <span className="relative mt-3.5 grid grid-cols-2 gap-x-7 gap-y-2.5 border-t border-mv-portal-hairline pt-3">
              <span
                aria-hidden="true"
                className="absolute inset-y-2 left-1/2 w-px bg-mv-portal-hairline"
              />
              <Fact label="County" value={lease.county} />
              <Fact label="Operator" value={lease.operator} />
              <Fact label="Reservoir" value={lease.reservoir} />
              <Fact label="Wells" value={lease.wells} />
              <Fact
                label="Interest"
                value={formatDecimalInterest(lease.decimalInterest)}
              />
              <Fact
                label="Gas Filed"
                value={`${formatCompactVolume(lease.production.gasMcf)} MCF`}
              />
            </span>

            {/* `mt-auto` pins this to the bottom however tall the card's
                neighbours make it, so the footers line up across a row. */}
            <span className="mt-auto flex items-center justify-between gap-2 border-t border-mv-portal-hairline pt-3 text-[12px] font-bold text-mv-green-deep">
              View Details
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One label-over-value pair. Muted caption, ink figure — the card's unit. */
function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <span className="block">
      <span className="block text-[10px] text-mv-muted">{label}</span>
      <span className="mt-[1px] block text-[11.5px] font-semibold tabular-nums">
        {value}
      </span>
    </span>
  );
}
