import Link from "next/link";

import { Badge } from "../../../../_components/ui/badge";
import { countyGap } from "../../_lib/county-gap";
import {
  formatAcres,
  formatCompactDollars,
  formatCount,
  formatDollars,
  formatLeaseTitle,
} from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE SAME TEN LEASES AS CARDS — the toolbar's other layout.
 *
 * WHAT IT DROPS AND WHY. A card cannot hold eleven columns without becoming a
 * table with a border, so it keeps the five facts that identify a lease and say
 * what it is worth — name, operator, both money figures with the agreement
 * marker, and the last filing — and leaves the decimal interest, the reservoir
 * and the lifetime volumes to the list. Grid is for recognising a lease; List is
 * for comparing them.
 *
 * THE WHOLE CARD IS ONE LINK, which is what a card affords: there is no row to
 * scroll sideways and no second destination to offer, so the entire surface goes
 * to the report rather than a chevron in a corner.
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
    <ul className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
      {leases.map((lease) => {
        const gap = countyGap(lease);

        return (
          <li key={lease.slug}>
            <Link
              href={leaseReportPath(lease.slug)}
              className="block h-full rounded-mv border border-mv-line bg-mv-card p-[18px] text-mv-ink no-underline shadow-mv transition-shadow hover:shadow-[0_4px_16px_rgba(4,35,26,.12)]"
            >
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="text-[13px]">
                  {formatLeaseTitle(lease.name, lease.number)}
                </strong>
                <Badge tone="mint" size="xs">
                  {lease.status}
                </Badge>
              </span>

              <span className="mt-1 block text-[10.5px] text-mv-muted">
                {lease.county} · {lease.operator} · {formatAcres(lease.acres)}{" "}
                acres
              </span>

              <span className="mt-3 block text-[22px] leading-tight font-extrabold tabular-nums">
                {formatCompactDollars(lease.mvestimate)}
              </span>
              <span className="block text-[10.5px] text-mv-muted">
                MVestimate — earning · projection
              </span>

              <span className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-mv-muted">
                County {formatDollars(lease.countyAppraised)}
                {gap.kind === "agree" && (
                  <Badge tone="mint" size="xs">
                    These agree ✓
                  </Badge>
                )}
                {gap.kind === "worth-a-look" && (
                  <Badge tone="flag" size="xs">
                    <span className="tracking-[0.04em] uppercase">
                      Worth a look ·
                    </span>{" "}
                    {gap.ratio}x
                  </Badge>
                )}
              </span>

              <span className="mt-2.5 block border-t border-mv-portal-hairline pt-2 text-[10.5px] text-mv-muted">
                Last posted {lease.lastPosted.month} ·{" "}
                {formatCount(lease.lastPosted.gasMcf)} MCF
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
