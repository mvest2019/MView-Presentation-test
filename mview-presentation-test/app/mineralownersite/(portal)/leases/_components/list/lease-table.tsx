import { EstimateBadge } from "../../../../_components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import {
  formatCompactDollars,
  formatCount,
} from "../../_lib/lease-format";
import { portfolioSummary } from "../../_lib/lease-totals";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseTableRow } from "./lease-table-row";

/**
 * THE WIDE TABLE — eleven columns and a totals row.
 *
 * IT SCROLLS INSIDE ITS OWN BOX, never the page: `TableScroll` plus a stated
 * minimum width is what keeps a phone from collapsing the columns into
 * unreadable slivers. The identity column is frozen because it is the first
 * thing to leave the viewport, and a reader scrolled out to the production
 * columns is otherwise looking at volumes with nothing to attach them to.
 *
 * THE TOTALS ROW IS SUPPRESSED WHILE SEARCHING. A "Total — 10 leases" line under
 * three matching rows is wrong twice over: the count is not the number of rows
 * and the sums are not the sums of what is on screen. Rather than re-total the
 * filtered set — which would print a portfolio value that is not the
 * portfolio's — the row is simply absent until the full list is back.
 *
 * THE ESTIMATE CHIP SITS IN THE TOTALS ROW because that is the one place both
 * money columns are added up, and a total is exactly where a projection is most
 * likely to be mistaken for a bank balance.
 */
export function LeaseTable({
  leases,
  showTotals,
}: {
  leases: LeaseRecord[];
  showTotals: boolean;
}) {
  if (leases.length === 0) {
    return (
      <p className="rounded-mv border border-mv-line bg-mv-card p-6 text-center text-[13px] text-mv-muted">
        No lease on this record matches that search. Try a lease name, a lease
        number, a county, an operator or a reservoir.
      </p>
    );
  }

  return (
    <TableScroll>
      <Table minWidth={1280} freezeFirstColumn>
        <TableHead>
          <TableRow className="bg-mv-portal-wash">
            {/* THE IDENTITY COLUMN IS GIVEN A FLOOR. Without one the browser
                hands the widest column the least space — every other cell is a
                short number or a single word, so the table's own layout
                algorithm squeezed "MCCABE ETAL GU · Lease 290271" into four
                lines and left the number columns half empty. */}
            <TableHeaderCell className="min-w-[270px]">
              Lease (no.)
            </TableHeaderCell>
            <TableHeaderCell numeric>MVestimate</TableHeaderCell>
            <TableHeaderCell numeric>County appraised</TableHeaderCell>
            <TableHeaderCell>County</TableHeaderCell>
            <TableHeaderCell>Operator</TableHeaderCell>
            <TableHeaderCell>Reservoir</TableHeaderCell>
            <TableHeaderCell>Wells</TableHeaderCell>
            <TableHeaderCell>Decimal interest</TableHeaderCell>
            <TableHeaderCell numeric>Gas (MCF)</TableHeaderCell>
            <TableHeaderCell numeric>Oil (BBL)</TableHeaderCell>
            <TableHeaderCell>Last posted</TableHeaderCell>
            <TableHeaderCell>
              {/* Visually hidden rather than empty: the column holds a link and
                  a bare `›` announces as nothing. Safe inside `TableScroll` —
                  see the note there about `sr-only` being absolutely
                  positioned. */}
              <span className="sr-only">Open the lease report</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {leases.map((lease) => (
            <LeaseTableRow key={lease.slug} lease={lease} />
          ))}

          {showTotals && (
            <TableRow tone="total">
              <TableCell>Total — {portfolioSummary.leaseCount} leases</TableCell>
              <TableCell numeric>
                {formatCompactDollars(portfolioSummary.mvestimate)}
              </TableCell>
              <TableCell numeric>
                {formatCompactDollars(portfolioSummary.countyAppraised)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <EstimateBadge />
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell>{portfolioSummary.wells}</TableCell>
              <TableCell />
              <TableCell numeric>
                {formatCount(portfolioSummary.gasMcf)}
              </TableCell>
              <TableCell numeric>
                {formatCount(portfolioSummary.oilBbl)}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableScroll>
  );
}
