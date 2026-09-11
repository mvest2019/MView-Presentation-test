import Link from "next/link";

import { Badge } from "../../../../_components/ui/badge";
import { TableCell, TableRow } from "../../../../_components/ui/table";
import {
  formatAcres,
  formatCount,
  formatDecimalInterest,
  formatLeaseTitle,
} from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseCountyValueCell, LeaseEstimateCell } from "./lease-value-cell";

/**
 * ONE LEASE, ELEVEN COLUMNS.
 *
 * THE ROW IS NOT A LINK AND THE NAME IS. A `<tr onclick>` gives a mouse user a
 * target and gives a keyboard user nothing — no focus, no Enter, nothing in the
 * tab order and no destination in the status bar. So the identity cell holds a
 * real `<a>`, the chevron at the far end holds a second one for a reader who has
 * scrolled the table sideways past the name, and both go to the same report.
 *
 * THE IDENTITY CELL WRAPS ON PURPOSE. Name, lease number and status chip sit on
 * one flex line; for the two unnumbered units the name is short enough that the
 * chip stays beside it, and for the numbered ones it drops to the next line. The
 * design shows both states and neither needs a variant — it is one wrapping row.
 *
 * THE SECOND LINE IS THE LEASE'S AGE. Acreage and the month of the first filing
 * say how much ground the interest covers and how long it has been producing,
 * which is the context that makes the money column readable.
 */
export function LeaseTableRow({ lease }: { lease: LeaseRecord }) {
  const href = leaseReportPath(lease.slug);

  return (
    <TableRow interactive>
      <TableCell>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={href}
            className="text-[13px] font-bold text-mv-ink no-underline hover:text-mv-green-deep"
          >
            {formatLeaseTitle(lease.name, lease.number)}
          </Link>
          <Badge tone="mint" size="xs">
            {lease.status}
          </Badge>
        </span>
        <span className="mt-1 block text-[10.5px] text-mv-muted">
          {formatAcres(lease.acres)} acres · first posting {lease.firstPosting}
        </span>
      </TableCell>

      <TableCell numeric>
        <LeaseEstimateCell lease={lease} />
      </TableCell>

      <TableCell numeric>
        <LeaseCountyValueCell lease={lease} />
      </TableCell>

      <TableCell>{lease.county}</TableCell>
      <TableCell>{lease.operator}</TableCell>
      <TableCell>{lease.reservoir}</TableCell>
      <TableCell>{lease.wells}</TableCell>

      {/* Not `numeric`: it is an identifier printed two ways, not a quantity to
          be compared down the column, and right-aligning it pushed the
          percentage away from the decimal it restates. */}
      <TableCell className="tabular-nums whitespace-nowrap">
        {formatDecimalInterest(lease.decimalInterest)}
      </TableCell>

      <TableCell numeric>{formatCount(lease.production.gasMcf)}</TableCell>
      <TableCell numeric>{formatCount(lease.production.oilBbl)}</TableCell>

      <TableCell className="whitespace-nowrap">
        {lease.lastPosted.month}
        {/* The volume on that filing, under the month it was filed for — the
            two only mean anything together. */}
        <span className="mt-0.5 block text-right text-[10.5px] text-mv-muted tabular-nums">
          {formatCount(lease.lastPosted.gasMcf)} MCF
        </span>
      </TableCell>

      <TableCell className="text-right">
        <Link
          href={href}
          aria-label={`Open the report for ${formatLeaseTitle(lease.name, lease.number)}`}
          className="text-[15px] text-mv-muted no-underline hover:text-mv-green-deep"
        >
          <span aria-hidden="true">›</span>
        </Link>
      </TableCell>
    </TableRow>
  );
}
