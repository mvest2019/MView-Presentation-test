"use client";

import { ALL_PLAYS } from "@/lib/operator-types";

import { OperatorAppliedTags } from "./operator-applied-tags";
import { OperatorFindBar } from "./operator-find-bar";
import { OperatorPager } from "./operator-pager";
import { OperatorQuickFilters } from "./operator-quick-filters";
import { OperatorTable } from "./operator-table";
import { OperatorTableControls } from "./operator-table-controls";
import { useOperatorDirectory } from "./use-operator-directory";

/**
 * The unified Operators directory — the prototype's `.workspace`: the filter
 * zone and the table share one card, one border and one shadow.
 *
 * This is the page's only client component. Everything around it on the route
 * stays server-rendered; the interactive state lives here and nowhere else.
 *
 * SPACING — the §7 fix, second half. The prototype stacked a `.fgroup` margin,
 * an 18px `.findbar` margin and a 16px title margin, which left a visible dead
 * band between the quick filters and the search row. The gaps below are 12px
 * (title) and 12px (quick filters to findbar), tightening the block without
 * touching the gradient panel, its teal top rule, or any control's design.
 */

export function OperatorDirectory() {
  const {
    query,
    page,
    columns,
    appliedFilters,
    isNumericSearch,
    setSearch,
    setPlay,
    setStatus,
    setCounty,
    toggleQuick,
    toggleSort,
    setPage,
    setPageSize,
    setColumns,
    clearFilters,
    exportCsv,
  } = useOperatorDirectory();

  const scope =
    query.play === ALL_PLAYS
      ? "all plays — statewide (de-duplicated)"
      : query.play;

  return (
    <section
      aria-label="Operators directory"
      className="mt-5 overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv"
    >
      {/* ---- filter zone ---- */}
      <div className="relative bg-[linear-gradient(180deg,#f3faf6_0%,#ffffff_82%)] p-6 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,var(--color-mv-green),var(--color-mv-green-deep))] before:content-[''] max-[767px]:p-4">
        <div className="mb-3">
          <h2 className="m-0 text-[19px] font-semibold tracking-[-.01em] text-mv-ink">
            Operators directory
          </h2>
          <p className="mt-[3px] text-[13.5px] text-mv-muted">
            Find an operator, then narrow by play, activity, or size.
          </p>
        </div>

        <OperatorQuickFilters
          active={query.quick}
          counts={page.quickCounts}
          onToggle={toggleQuick}
        />

        <div className="mt-3">
          <OperatorFindBar
            search={query.search}
            play={query.play}
            status={query.status}
            county={query.county}
            statusCounts={page.statusCounts}
            onSearch={setSearch}
            onPlay={setPlay}
            onStatus={setStatus}
            onCounty={setCounty}
          />
        </div>

        <OperatorAppliedTags
          filters={appliedFilters}
          onClearAll={clearFilters}
        />
      </div>

      <div className="h-px bg-[#eef1f4]" />

      {/* ---- results zone ---- */}
      <div className="px-6 pb-[22px] pt-4 max-[767px]:px-4">
        {/* Results summary and controls share one row on desktop and stack on
            mobile. The count appears here only — the pager below carries the
            controls, so the same number is never printed twice. */}
        <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
          <p
            aria-live="polite"
            className="m-0 min-w-0 text-[12.5px] text-mv-muted"
          >
            {page.total > 0 ? (
              <>
                <strong className="font-bold text-mv-ink">
                  Showing {page.from + 1}–
                  {Math.min(page.from + page.pageSize, page.total)} of{" "}
                  {page.total} operator{page.total === 1 ? "" : "s"}
                </strong>{" "}
                · {scope} — ranked by reported production (BOE)
              </>
            ) : (
              "0 operators match the current filters"
            )}
          </p>

          <OperatorTableControls
            columns={columns}
            onColumnsChange={setColumns}
            onExport={exportCsv}
          />
        </div>

        <OperatorTable
          page={page}
          columns={columns}
          sortKey={query.sortKey}
          sortDir={query.sortDir}
          isNumericSearch={isNumericSearch}
          onSort={toggleSort}
          onClearFilters={clearFilters}
        />

        <OperatorPager
          page={page}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>
    </section>
  );
}
