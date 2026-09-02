import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { formatDollars, formatLeaseTitle } from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE SAME LEASES AS CARDS — four fields each, at a glance.
 *
 * ONE LIST, TWO VIEWS. The prototype built its grid by reading the table's live
 * DOM back out and stringifying it into `innerHTML`, precisely so the two could
 * not disagree. Here they take the same array as a prop, which achieves the same
 * thing without a serialisation step — and means the grid renders identically on
 * the server, where there is no DOM to read.
 *
 * FOUR FIELDS, CHOSEN BY WHAT A CARD IS FOR: which lease, whether it is earning,
 * where it is, what it is worth. The sixteen-column table is for reconciling
 * against a filing; a card is for scanning ten leases and spotting the one worth
 * opening, and adding API numbers to it would defeat the reason someone switched
 * views.
 *
 * THE WHOLE CARD IS THE LINK, which the table row could not be — a `<tr>` cannot
 * contain an `<a>` around every cell, but a card can be one. So here the entire
 * surface is keyboard-reachable and middle-clickable, with no click handler.
 */
export function LeaseGrid({ leases }: { leases: LeaseRecord[] }) {
  if (leases.length === 0) {
    return (
      <p className="mb-3.5 rounded-mv border border-mv-line bg-mv-card p-6 text-center text-[13px] text-mv-muted">
        No lease on this record matches that search. Try a lease name, a lease
        number, a county or an operator.
      </p>
    );
  }

  return (
    <ul className="mb-3.5 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      {leases.map((lease) => {
        const earning = lease.mvestimate > 0;
        return (
          <li key={lease.number}>
            <Link
              href={leaseReportPath(lease.number)}
              className="block h-full rounded-mv border border-mv-line bg-mv-card p-[22px] text-mv-ink no-underline shadow-mv transition-shadow hover:shadow-[0_4px_16px_rgba(4,35,26,.12)]"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[13px]">
                  {formatLeaseTitle(lease.name, lease.number)}
                </strong>
                <Badge tone={earning ? "mint" : "slate"} size="xs">
                  {earning ? "Producing" : "Paused"}
                </Badge>
              </span>

              <span className="mt-0.5 block text-[10px] text-mv-muted">
                {lease.county} County · {lease.operator}
              </span>

              {/*
                ⚠ NO `cl-lock` HERE, AND IT IS A KNOWN HOLE IN THE DESIGN.
                This is the same MVestimate the table's money column blurs for a
                claimed-but-never-trialed account, so a reader who switches to
                Grid sees the figure the gate is withholding. The prototype has
                the same hole for a mechanical reason: its grid was built by
                stringifying `innerHTML` in `v33LeaseGridBuild`, which never
                emitted the class, and its gate is column-scoped CSS that cannot
                reach a card.

                Left matching the design rather than silently closed, because the
                fix changes what a state SHOWS and that is a product call — the
                same call as the Essentials list below, which leaks the identical
                figure. One `portalGate.lockedValue` on this span closes it.
              */}
              <span
                className="mt-1.5 block text-xl font-extrabold tabular-nums"
              >
                {earning ? formatDollars(lease.mvestimate) : "—"}
              </span>

              {/* An em dash rather than "$0", and the caption changes with it:
                  the card has no room for the county-value fallback the table
                  shows, so it says which number is missing instead of printing
                  a zero that would read as a valuation. */}
              <span className="block text-[10px] text-mv-muted">
                {earning
                  ? "MVestimate · six-year owner share"
                  : "no forward projection — open for the county value"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
