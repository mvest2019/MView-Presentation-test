"use client";

import { useMemo, useState } from "react";

import {
  defaultLeasePageSize,
  defaultLeaseSort,
  selectLeases,
  type LeaseSortKey,
} from "../../_lib/lease-sorting";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseGrid } from "./lease-grid";
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
  const [sort, setSort] = useState<LeaseSortKey>(defaultLeaseSort);
  const [pageSize, setPageSize] = useState<number>(defaultLeasePageSize);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<LeaseView>("list");

  const visible = useMemo(
    () => selectLeases(leases, { sort, query, pageSize }),
    [leases, sort, query, pageSize],
  );

  const searching = query.trim().length > 0;

  return (
    <div>
      <LeaseToolbar
        sort={sort}
        onSortChange={setSort}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
        shown={visible.length}
        total={leases.length}
      />

      {view === "grid" ? (
        <LeaseGrid leases={visible} />
      ) : (
        /* The totals row is the portfolio's, not the filtered set's — see the
           note in `LeaseTable`. */
        <LeaseTable leases={visible} showTotals={!searching} />
      )}

      <ReportStackNotice />

      {/* The table's provenance, attached to the table rather than to the tab
          strip — see the note in `sources-card.tsx`. */}
      <SourcesCard />
    </div>
  );
}
