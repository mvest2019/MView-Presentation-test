"use client";

import { SearchField, SelectField } from "../../../_components/ui/form-controls";
import { SegmentedControl } from "../../../_components/ui/segmented-control";
import {
  leaseSortOptions,
  type LeaseSortKey,
} from "../../_lib/lease-sorting";

/**
 * SORT · SEARCH · LIST-OR-GRID — the three controls above the lease list.
 *
 * FULLY CONTROLLED, AND IT OWNS NO STATE. Every value comes down as a prop and
 * every change goes up as a callback, so `LeaseListPanel` holds one piece of
 * state for the whole panel and this component is a pure function of it. That is
 * what lets the result count be honest: it is `shown` and `total` computed from
 * the same list the table renders, not a number this component tallies itself.
 *
 * THE COUNT LINE IS AN `aria-live` REGION, which the prototype's was not. Typing
 * in the search box changes the table below silently for a screen-reader user —
 * they have no way to know whether "bee" matched four leases or none without
 * navigating into the table and counting. `polite` announces "Showing 4 of 10
 * leases" after they stop typing, which is the same information the sighted
 * reader gets from the line being there.
 */

export type LeaseView = "list" | "grid";

export function LeaseToolbar({
  sort,
  onSortChange,
  query,
  onQueryChange,
  view,
  onViewChange,
  shown,
  total,
}: {
  sort: LeaseSortKey;
  onSortChange: (next: LeaseSortKey) => void;
  query: string;
  onQueryChange: (next: string) => void;
  view: LeaseView;
  onViewChange: (next: LeaseView) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="mb-2.5 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <SelectField
          label="Sort:"
          value={sort}
          onChange={(event) =>
            onSortChange(event.target.value as LeaseSortKey)
          }
        >
          {leaseSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <SegmentedControl
          label="Lease layout"
          className="ml-auto"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "list", label: "☰ List" },
            { value: "grid", label: "▦ Grid" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchField
          label="Search your leases"
          placeholder="Search your leases — name, number, county, or operator…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <span
          aria-live="polite"
          className="text-[10px] tabular-nums text-mv-muted"
        >
          {query.trim()
            ? `Showing ${shown} of ${total} leases`
            : `Showing all ${total} leases`}
        </span>
        <span
          className="text-[10px] text-mv-muted"
          title="Pages appear automatically once a record holds more than 25 leases"
        >
          · pagination joins at 25+ leases
        </span>
      </div>
    </div>
  );
}
