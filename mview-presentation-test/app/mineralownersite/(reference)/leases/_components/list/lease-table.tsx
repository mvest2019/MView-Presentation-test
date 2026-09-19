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
                lines and left the number columns half empty.

                A LOWER FLOOR ON A PHONE, because this column is FROZEN. It does
                not scroll away, so whatever it takes is taken from the window
                onto the other ten columns for good: at 270px on a 375px screen
                the table had 77px left to scroll in — a slot too narrow to read
                one figure in, which is what makes the scrolling feel broken
                rather than merely long.

                PINNED, NOT FLOORED, AND THAT IS THE PART A `min-w` GOT WRONG.
                The table is `table-layout: auto` at a 1240px minimum, so the
                browser distributes the surplus by content — and this column has
                the most content by a distance, so it took far more than the
                floor it was given and the window never actually widened. Three
                widths together are what pin it: `w` proposes, `min-w` stops the
                browser going under, `max-w` stops it going over.

                170px leaves about 177px of window — more than twice what 270px
                left — and still fits "BETTY KENNEDY UNIT A" on one line: the
                cell's own padding takes 28 of it, and the name measures about
                142px at this size. The full 270px floor returns at `sm`, where
                the screen can afford it and auto layout can have its way. */}
            <SortableHeader
              column="name"
              sort={sort}
              onSortChange={onSortChange}
              className="w-[170px] max-w-[170px] min-w-[170px] sm:w-auto sm:max-w-none sm:min-w-[270px]"
            >
              Lease (no.)
            </SortableHeader>
            <SortableHeader
              numeric
              column="mvestimate"
              sort={sort}
              onSortChange={onSortChange}
            >
              MVestimate
            </SortableHeader>
            <SortableHeader
              numeric
              column="county-value"
              sort={sort}
              onSortChange={onSortChange}
            >
              County appraised
            </SortableHeader>
            <SortableHeader
              column="county"
              sort={sort}
              onSortChange={onSortChange}
            >
              County
            </SortableHeader>
            <SortableHeader
              column="operator"
              sort={sort}
              onSortChange={onSortChange}
            >
              Operator
            </SortableHeader>
            <SortableHeader
              column="reservoir"
              sort={sort}
              onSortChange={onSortChange}
            >
              Reservoir
            </SortableHeader>
            <SortableHeader
              column="wells"
              sort={sort}
              onSortChange={onSortChange}
            >
              Wells
            </SortableHeader>
            <SortableHeader
              column="interest"
              sort={sort}
              onSortChange={onSortChange}
            >
              Decimal interest
            </SortableHeader>
            <SortableHeader
              numeric
              column="gas"
              sort={sort}
              onSortChange={onSortChange}
            >
              Gas (MCF)
            </SortableHeader>
            <SortableHeader
              numeric
              column="oil"
              sort={sort}
              onSortChange={onSortChange}
            >
              Oil (BBL)
            </SortableHeader>
            <SortableHeader
              column="posted"
              sort={sort}
              onSortChange={onSortChange}
            >
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
