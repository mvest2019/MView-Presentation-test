import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import type { LeaseSort } from "../../_lib/lease-sorting";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseTableRow } from "./lease-table-row";
import { SortableHeader } from "./sortable-header";

/**
 * THE WIDE TABLE — eleven columns and a totals row.
 *
 * IT SCROLLS INSIDE ITS OWN BOX, never the page: `TableScroll` plus a stated
 * minimum width is what keeps a phone from collapsing the columns into
 * unreadable slivers. The identity column is frozen because it is the first
 * thing to leave the viewport, and a reader scrolled out to the production
 * columns is otherwise looking at volumes with nothing to attach them to.
 *
 * THERE IS NO TOTALS ROW. It used to close the table with "Total — 10 leases"
 * and the two money columns summed, and it is gone on request. Nothing is lost:
 * the value band at the top of the page carries the same two totals, against
 * the whole record rather than the current page, which is the honest scope for
 * them — a footer summing one page of a paged table is the version that misleads.
 *
 * EVERY HEADING SORTS THE TABLE, and the indicator on each one is what says so
 * — see `sortable-header.tsx`. The heading and the "Sort by" select above drive
 * the same `{column, direction}`, so the two can never disagree about how the
 * rows are ordered.
 *
 * EVERY TIER SHOWS EVERY COLUMN. Four of them were briefly gated by density and
 * that is reverted: the table is the page, and a reader who changes how densely
 * they read should not find columns missing from it. Density still governs what
 * sits AROUND the table — see the page's own note.
 */
export function LeaseTable({
  leases,
  sort,
  onSortChange,
}: {
  leases: LeaseRecord[];
  sort: LeaseSort;
  onSortChange: (next: LeaseSort) => void;
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
    <TableScroll bare>
      <Table minWidth={1240} freezeFirstColumn>
        <TableHead>
          <TableRow className="bg-mv-portal-wash">
            {/* THE IDENTITY COLUMN IS GIVEN A FLOOR. Without one the browser
                hands the widest column the least space — every other cell is a
                short number or a single word, so the table's own layout
                algorithm squeezed "MCCABE ETAL GU · Lease 290271" into four
                lines and left the number columns half empty. */}
            <SortableHeader
              column="name"
              sort={sort}
              onSortChange={onSortChange}
              className="min-w-[270px]"
            >
              Lease (no.)
            </SortableHeader>
            <SortableHeader numeric column="mvestimate" sort={sort} onSortChange={onSortChange}>
              MVestimate
            </SortableHeader>
            <SortableHeader numeric column="county-value" sort={sort} onSortChange={onSortChange}>
              County appraised
            </SortableHeader>
            <SortableHeader column="county" sort={sort} onSortChange={onSortChange}>
              County
            </SortableHeader>
            <SortableHeader column="operator" sort={sort} onSortChange={onSortChange}>
              Operator
            </SortableHeader>
            <SortableHeader column="reservoir" sort={sort} onSortChange={onSortChange}>
              Reservoir
            </SortableHeader>
            <SortableHeader column="wells" sort={sort} onSortChange={onSortChange}>
              Wells
            </SortableHeader>
            <SortableHeader column="interest" sort={sort} onSortChange={onSortChange}>
              Decimal interest
            </SortableHeader>
            <SortableHeader numeric column="gas" sort={sort} onSortChange={onSortChange}>
              Gas (MCF)
            </SortableHeader>
            <SortableHeader numeric column="oil" sort={sort} onSortChange={onSortChange}>
              Oil (BBL)
            </SortableHeader>
            <SortableHeader column="posted" sort={sort} onSortChange={onSortChange}>
              Last posted
            </SortableHeader>
          </TableRow>
        </TableHead>

        <TableBody>
          {leases.map((lease) => (
            <LeaseTableRow key={lease.slug} lease={lease} />
          ))}

        </TableBody>
      </Table>
    </TableScroll>
  );
}
