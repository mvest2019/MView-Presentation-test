"use client";

import {
  SearchField,
  SelectField,
} from "../../../../_components/ui/form-controls";
import { SegmentedControl } from "../../../../_components/ui/segmented-control";
import {
  leasePageSizes,
  leaseSortOptions,
  type LeaseSortKey,
} from "../../_lib/lease-sorting";

/** Which layout the list is drawn in. */
export type LeaseView = "list" | "grid";

/**
 * SORT, PAGE SIZE, SEARCH AND LAYOUT — the four controls above the list.
 *
 * IT OWNS NO STATE. Every value is passed in and every change is handed back up
 * to `LeaseListPanel`, because the table, the grid and the totals row all read
 * the same selection — a toolbar holding its own state would be the second place
 * that selection lives.
 *
 * TWO ROWS, AND THE SPLIT IS BY WHAT THEY DO. The top row changes the ORDER and
 * the SHAPE of the list; the bottom row changes WHICH LEASES are in it, and the
 * count beside the box is the answer to what was typed. Putting the search on
 * its own line is also what keeps it wide enough to read a lease name back.
 *
 * THE COUNT IS `aria-live` so a screen-reader user who types into the box is
 * told how many leases are left, which is the only feedback a filter gives.
 */
export function LeaseToolbar({
  sort,
  onSortChange,
  pageSize,
  onPageSizeChange,
  query,
  onQueryChange,
  view,
  onViewChange,
  shown,
  total,
}: {
  sort: LeaseSortKey;
  onSortChange: (next: LeaseSortKey) => void;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  query: string;
  onQueryChange: (next: string) => void;
  view: LeaseView;
  onViewChange: (next: LeaseView) => void;
  shown: number;
  total: number;
}) {
  const searching = query.trim().length > 0;

  return (
    <div className="mb-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <SelectField
          label="Sort:"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as LeaseSortKey)}
        >
          {leaseSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Show:"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {leasePageSizes.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </SelectField>

        <SegmentedControl
          label="Lease layout"
          tone="green"
          className="ml-auto"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "list", label: "☰ List" },
            { value: "grid", label: "▦ Grid" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          label="Search your leases"
          placeholder="Search — lease, number, county, operator or reservoir…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <span
          aria-live="polite"
          className="text-[12px] tabular-nums text-mv-muted"
        >
          {searching ? `${shown} of ${total} leases` : `${total} leases`}
        </span>
      </div>
    </div>
  );
}
