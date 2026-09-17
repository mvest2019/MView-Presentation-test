"use client";

import { useMemo, useState } from "react";

import {
  emptyLeaseFilters,
  leaseFilterOptionsFor,
  type LeaseFilters,
} from "../../_lib/lease-filters";
import {
  defaultLeasePageSize,
  defaultLeaseSort,
  selectLeases,
  type LeaseSort,
} from "../../_lib/lease-sorting";
import type { LeaseRecord } from "../../_lib/lease-types";
import { Card } from "../../../../_components/ui/card";
import { LeaseGrid } from "./lease-grid";
import { LeasePagination } from "./lease-pagination";
import { LeaseTable } from "./lease-table";
import { LeaseToolbar, type LeaseView } from "./lease-toolbar";
import { ReportStackNotice } from "./report-stack-notice";
import { SourcesCard } from "./sources-card";

/**
 * THE MY LEASES TAB — the toolbar, the list in whichever layout is chosen, and
 * the footnote under it.
 *
 * THE ONE PLACE THE SELECTION LIVES. Sort, page size, search and layout are four
 * pieces of state and they are all here, because the table and the grid draw the
 * same selection and the totals row depends on whether a search is running. The
 * toolbar below is a pure control surface — see its note.
 *
 * `useMemo` IS NOT PREMATURE HERE: `selectLeases` sorts, filters and slices on
 * every render, and this component re-renders on every keystroke in the search
 * box. Recomputing it when the layout toggles would be work for nothing.
 *
 * WHY THE FOOTNOTE AND THE PROVENANCE CARD SIT OUTSIDE BOTH LAYOUTS. They
 * describe what opening a lease gets you and where each figure came from, which
 * is true of a card as much as of a row — inside `LeaseTable` they would vanish
 * the moment a reader switched to Grid.
 */
export function LeaseListPanel({ leases }: { leases: LeaseRecord[] }) {
  const [sort, setSort] = useState<LeaseSort>(defaultLeaseSort);
  const [pageSize, setPageSize] = useState<number>(defaultLeasePageSize);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<LeaseView>("list");
  const [filters, setFilters] = useState<LeaseFilters>(emptyLeaseFilters);
  /* Open by default: the design shows the row, and a reader who can see the
     dropdowns knows the list can be narrowed without discovering a button. */
  const [page, setPage] = useState(1);

  /* THE DROPDOWNS DESCRIBE THE SET THEY FILTER, so they are derived from the
     same `leases` the table draws rather than from a fixture. Memoised because
     it walks every lease five times and this component re-renders on every
     keystroke in the search box. */
  const options = useMemo(() => leaseFilterOptionsFor(leases), [leases]);

  const matched = useMemo(
    () => selectLeases(leases, { sort, filters, query }),
    [leases, sort, filters, query],
  );

  /*
   * THE PAGE IS CLAMPED RATHER THAN CORRECTED IN AN EFFECT.
   *
   * Narrowing the list can leave the reader on a page that no longer exists —
   * page 2 of a filter that now matches three leases. Clamping on render shows
   * the last real page immediately; fixing it in an effect would paint an empty
   * table for one frame first, and every change handler below already resets to
   * page one, so this only catches the cases they cannot.
   */
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = matched.slice((safePage - 1) * pageSize, safePage * pageSize);

  /* Every control that changes WHAT is in the list sends the reader back to the
     first page: staying on page 3 of a freshly filtered list is how somebody
     concludes a filter returned nothing. */
  function reset<T>(apply: (next: T) => void): (next: T) => void {
    return (next) => {
      setPage(1);
      apply(next);
    };
  }

  return (
    <div>
      {/* ONE CARD FROM THE SEARCH BOX TO THE PAGER. The controls and the rows
          they govern are one object and share one border — see the note in
          `lease-toolbar.tsx`. The grid is the exception: cards inside a card
          reads as a box of boxes, so it breaks out below. */}
      <Card padded={false} className="overflow-hidden">
        <LeaseToolbar
          sort={sort}
          onSortChange={reset(setSort)}
          pageSize={pageSize}
          onPageSizeChange={reset(setPageSize)}
          query={query}
          onQueryChange={reset(setQuery)}
          view={view}
          onViewChange={setView}
          filters={filters}
          onFiltersChange={reset(setFilters)}
          options={options}
        />

        {view === "list" && (
          <>
            <LeaseTable
              leases={visible}
              sort={sort}
              onSortChange={reset(setSort)}
            />
            <LeasePagination
              page={safePage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={matched.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {view === "grid" && (
        <>
          <div className="mt-3.5">
            <LeaseGrid leases={visible} />
          </div>
          {/* THE CARD IS THE PAGER'S, so it only exists when the pager does.
              `LeasePagination` returns nothing on a single page, and this
              wrapper went on rendering around it — an empty bordered box under
              the cards with nothing in it. A component that can render nothing
              cannot be wrapped unconditionally. */}
          {pageCount > 1 && (
            <Card padded={false} className="mt-3.5 overflow-hidden">
              <LeasePagination
                divided={false}
                page={safePage}
                pageCount={pageCount}
                pageSize={pageSize}
                total={matched.length}
                onPageChange={setPage}
              />
            </Card>
          )}
        </>
      )}

      <ReportStackNotice />

      {/* The table's provenance, attached to the table rather than to the tab
          strip — see the note in `sources-card.tsx`. */}
      <SourcesCard />
    </div>
  );
}
