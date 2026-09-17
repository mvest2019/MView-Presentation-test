"use client";

import { TableHeaderCell } from "../../../../_components/ui/table";
import type { LeaseSort, LeaseSortColumn } from "../../_lib/lease-sorting";

/**
 * A COLUMN HEADING YOU CAN SORT BY.
 *
 * ── THERE IS NO ARROW ON THE HEADINGS ──
 *
 * Each one used to carry a glyph — faint up-down on the columns that could
 * sort, green arrow on the one that was — and both are gone on request. The
 * eleven headings are now eleven words.
 *
 * WHAT STILL SAYS WHICH COLUMN IS SORTING: the "Sort by" select above the
 * table, which spells the order out in words ("Production value — high to
 * low") and updates when a heading is clicked, and `aria-sort` on the cell for
 * a screen reader. The heading itself no longer marks it.
 *
 * WHAT SAYS A HEADING CAN BE CLICKED: the pointer and the green on hover. That
 * is the affordance the faint glyph was carrying, so it stays — with neither,
 * eleven headings that reorder the table look exactly like eleven that do not.
 *
 * ── FIRST CLICK PICKS THE USEFUL DIRECTION, NOT ALWAYS ASCENDING ──
 *
 * A reader clicking MVestimate wants the biggest lease, not the smallest;
 * clicking the lease name wants A to Z. So a numeric column opens descending
 * and a text column ascending, and clicking again reverses it. Defaulting
 * everything to ascending makes the money columns need two clicks every time.
 *
 * ── A REAL `<button>` INSIDE THE `<th>` ──
 *
 * Focusable, activates on Enter and Space, and `aria-sort` on the cell is what
 * tells a screen reader which column is ordering the table and which way — none
 * of which a click handler on the `<th>` would give.
 */

/** Columns where the reader means "biggest first" on a first click. */
const DESCENDING_FIRST: ReadonlySet<LeaseSortColumn> = new Set([
  "mvestimate",
  "county-value",
  "wells",
  "interest",
  "gas",
  "oil",
  "posted",
]);

export function SortableHeader({
  column,
  sort,
  onSortChange,
  numeric = false,
  className = "",
  children,
}: {
  column: LeaseSortColumn;
  sort: LeaseSort;
  onSortChange: (next: LeaseSort) => void;
  numeric?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sort.column === column;
  const direction = active
    ? sort.direction
    : DESCENDING_FIRST.has(column)
      ? "desc"
      : "asc";

  function toggle(): void {
    onSortChange({
      column,
      /* Same column: flip it. New column: open on the direction that answers
         the question the reader is most likely asking — see the note above. */
      direction: active
        ? sort.direction === "asc"
          ? "desc"
          : "asc"
        : direction,
    });
  }

  return (
    <TableHeaderCell
      numeric={numeric}
      className={className}
      aria-sort={
        active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={toggle}
        className="inline-flex cursor-pointer border-0 bg-transparent p-0 text-left text-[11px] font-bold tracking-[0.06em] text-mv-ink uppercase transition-colors hover:text-mv-green-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        {children}
      </button>
    </TableHeaderCell>
  );
}
