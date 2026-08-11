"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useId, useRef, useState } from "react";

import { Button, selectedControlClass } from "@/app/_components/button";
import {
  fieldGroupLabelClass,
  panelTitleClass,
  tinyClass,
} from "@/app/_components/typography";
import {
  ALL_PLAYS,
  QUICK_FILTERS,
  QUICK_FILTER_KEYS,
  type OperatorFilters,
  type OperatorResultPage,
  type OperatorRow as OperatorRowData,
  type OperatorSortKey,
  type OperatorStatusFilter,
  type QuickFilterKey,
} from "@/lib/operator-search";
import type { OperatorColumns } from "@/lib/operator-types";
import { TEXAS_COUNTIES } from "@/lib/texas-counties";

import {
  useOperatorDirectory,
  type AppliedFilter,
} from "./use-operator-directory";

/**
 * The Operator Listing page — the prototype's `.workspace`: the filter zone and
 * the results table share one card, one border and one shadow.
 *
 * WHY ONE FILE. Every section below (quick filters, the find bar, applied tags,
 * the toolbar, the table, the pager, the pill) is used by this page and nothing
 * else, and each is a slice of markup rather than an independent unit. Splitting
 * them across files meant eleven modules whose only caller was each other, so
 * following a class or a prop meant opening four of them. They are module-local
 * components here: still small, still individually testable, but read top to
 * bottom in the order they render.
 *
 * What deliberately stayed out:
 *   · `use-operator-directory.ts` — the data layer and the API seam. No markup.
 *   · `_components/county-directory.tsx` — a distinct section with its own data.
 *   · `@/app/_components/button` and `typography` — site-wide, used by /blog too.
 *
 * If a section here ever earns a second caller, promote it to
 * `app/_components/` rather than back into a private sibling file.
 *
 * CLIENT BOUNDARY. This file is the page's only client component. The route
 * shell in `page.tsx` — breadcrumb, h1, feature cards, county section, the
 * closing notice — stays server-rendered.
 *
 * SPACING. The prototype stacked a `.fgroup` margin, an 18px `.findbar` margin
 * and a 16px title margin, leaving a dead band between the quick filters and the
 * search row. The gaps here are 12px and 12px.
 */

export function OperatorPage({
  /**
   * Play Type options from `GET /api/v1/operators/playtypes`, fetched by the
   * server component in `page.tsx`. An empty array means the API was unreachable;
   * the dropdown then offers its default option only, and nothing else on the
   * page is affected.
   */
  playTypes,
  /** The `guestUserID` cookie value, read server-side in `page.tsx`. */
  visitorId,
}: {
  playTypes: string[];
  visitorId: string;
}) {
  const {
    filters,
    searchInput,
    page,
    pageSize,
    columns,
    appliedFilters,
    isLoading,
    hasError,
    hasLoadedOnce,
    setSearch,
    setPlay,
    setStatus,
    setCounty,
    toggleQuick,
    toggleSort,
    goToPage,
    setColumns,
    clearFilters,
    retry,
    exportCsv,
  } = useOperatorDirectory({ playTypes, visitorId });

  return (
    <section
      aria-label="Operators directory"
      className="mt-5 overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv"
    >
      {/* ---- filter zone ---- */}
      <div className="relative bg-[linear-gradient(180deg,#f3faf6_0%,#ffffff_82%)] p-6 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,var(--color-mv-green),var(--color-mv-green-deep))] before:content-[''] max-[767px]:p-4">
        <h2 className={`${panelTitleClass} mb-3 text-mv-ink`}>
          Operators directory
        </h2>

        <QuickFilters selected={filters.quick} onToggle={toggleQuick} />

        <div className="mt-3">
          <FindBar
            search={searchInput}
            play={filters.play}
            playTypes={playTypes}
            status={filters.status}
            county={filters.county}
            onSearch={setSearch}
            onPlay={setPlay}
            onStatus={setStatus}
            onCounty={setCounty}
          />
        </div>

        <AppliedTags filters={appliedFilters} onClearAll={clearFilters} />
      </div>

      <div className="h-px bg-mv-line-soft" />

      {/* ---- results zone ---- */}
      <div className="px-6 pb-[22px] pt-4 max-[767px]:px-4">
        {/* Results summary and controls share one row on desktop and stack on
            mobile. The count appears here only — the pager below carries the
            controls, so the same number is never printed twice. */}
        <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
          <p
            aria-live="polite"
            className={`${tinyClass} m-0 min-w-0 text-mv-muted`}
          >
            {/* `hasError` is tested first on purpose: the previous page's totals
                are still in state when a request fails, and printing them beside
                an error would present stale numbers as the current result. */}
            {hasError ? (
              "Results unavailable"
            ) : isLoading && !hasLoadedOnce ? (
              "Loading operators…"
            ) : page.total > 0 ? (
              <>
                <strong className="font-bold text-mv-ink">
                  Showing {page.from + 1}–
                  {Math.min(page.from + pageSize, page.total)} of {page.total}{" "}
                  operator{page.total === 1 ? "" : "s"}
                </strong>{" "}
                · ranked by reported production
              </>
            ) : (
              "0 operators match the current filters"
            )}
          </p>

          <TableControls
            columns={columns}
            onColumnsChange={setColumns}
            onExport={exportCsv}
          />
        </div>

        <ResultsTable
          page={page}
          columns={columns}
          sortKey={filters.sortKey}
          sortDir={filters.sortDir}
          isLoading={isLoading}
          hasError={hasError}
          hasLoadedOnce={hasLoadedOnce}
          onSort={toggleSort}
          onClearFilters={clearFilters}
          onRetry={retry}
        />

        {!hasError && <Pager page={page} onPage={goToPage} />}
      </div>
    </section>
  );
}

/* ==========================================================================
   Quick filters

   LAYOUT NOTE. The prototype put `flex:1 1 auto` on the chip group inside a
   `.qrow` flex row, which told the chips to absorb every spare pixel. Anything
   sharing the row got shoved to the far edge and wrapped the moment things
   tightened, leaving a wide empty band under the pills. There is no grow here:
   the pills are one `flex-wrap` group that packs from the left, wraps only when
   the viewport genuinely runs out of room, and keeps the same `gap-[10px]`
   rhythm on both axes.

   MULTI-SELECT. Each pill is an independent boolean now, because the search
   endpoint accepts all four at once and expects `false` for the unselected ones.
   The pills previously behaved as a single choice; the visuals are unchanged —
   only how many can be on at the same time.

   The trailing match counts are gone: they were computed from the local fixture,
   and the search endpoint returns one `total_count` for the query rather than a
   count per filter. Sourcing them would mean four extra requests per render.
   ========================================================================== */

function QuickFilters({
  selected,
  onToggle,
}: {
  selected: OperatorFilters["quick"];
  onToggle: (key: QuickFilterKey) => void;
}) {
  return (
    <div>
      <h3 className={`${fieldGroupLabelClass} mb-[10px]`}>Quick filters</h3>

      <div
        role="group"
        aria-label="Quick filters"
        className="flex flex-wrap items-center gap-[10px]"
      >
        {QUICK_FILTER_KEYS.map((key) => (
          <FilterPill
            key={key}
            active={selected[key]}
            onClick={() => onToggle(key)}
          >
            {QUICK_FILTERS[key]}
          </FilterPill>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Search · Play type · Status · County

   The design draws the select chevron with an inline SVG data-URI background.
   Here it is a `lucide-react` icon absolutely positioned and `pointer-events-
   none` over a native `<select>` with `appearance-none`, which renders the same
   and keeps a 200-character data URI out of the class string. The control is
   still a real `<select>`, so keyboard and mobile pickers behave.

   Responsive: `flex-wrap` with the search box on `flex-1 min-w-[240px]` holds
   one row down to roughly 900px, then the selects wrap in pairs. Below 767px
   every control goes full width so nothing is squeezed under a usable size.
   ========================================================================== */

/** The mint-edged control border and lift — the design's `--mint-line`. */
const CONTROL_TINT = "border-mv-mint-line shadow-[0_1px_2px_rgba(13,14,23,.04)]";

const SELECT_CLASS =
  "w-full cursor-pointer appearance-none rounded-[10px] border bg-white py-2 pl-[14px] pr-9 text-sm font-medium text-mv-ink outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]";

/* The Play Type and Status options no longer carry trailing counts. Those came
   from the local fixture, and the search endpoint reports a single `total_count`
   for the whole query rather than a count per option value. */

function FindBar({
  search,
  play,
  playTypes,
  status,
  county,
  onSearch,
  onPlay,
  onStatus,
  onCounty,
}: {
  search: string;
  play: string;
  playTypes: string[];
  status: OperatorStatusFilter;
  county: string;
  onSearch: (value: string) => void;
  onPlay: (value: string) => void;
  onStatus: (value: OperatorStatusFilter) => void;
  onCounty: (value: string) => void;
}) {
  const searchId = useId();

  return (
    <div
      role="group"
      aria-label="Search operators, filter by play, status and county"
      className="flex flex-wrap items-center gap-3"
    >
      <div className="relative min-w-[240px] flex-1 max-[767px]:min-w-full">
        <label htmlFor={searchId} className="sr-only">
          Search operators by name or operator number
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-[15px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mv-green-deep"
          strokeWidth={1.9}
        />
        <input
          id={searchId}
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search by Operator Name or Operator Number…"
          className={`w-full rounded-xl border bg-white py-[13px] pl-11 pr-[14px] text-[15px] text-mv-ink outline-none transition-colors placeholder:text-mv-placeholder hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] ${CONTROL_TINT}`}
        />
      </div>

      {/* Options come from the API; the default option is always present, so the
          filter stays usable even when the request failed and `playTypes` is
          empty. `disabled` in that case would trap a visitor who had already
          picked a play, so the control stays live. */}
      <SelectControl
        label="Choose a play type"
        value={play}
        onChange={onPlay}
        className="min-w-[180px] max-[767px]:min-w-full"
      >
        <option value={ALL_PLAYS}>Select Play type</option>
        {playTypes.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </SelectControl>

      {/* `""` is the API's "all statuses" value, which is what this default
          option has always meant — verified: active + inactive totals sum to it. */}
      <SelectControl
        label="Filter by status"
        value={status}
        onChange={(value) => onStatus(value as OperatorStatusFilter)}
        className="min-w-[180px] max-[767px]:min-w-full"
      >
        <option value="">Select status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </SelectControl>

      <SelectControl
        label="Choose a county"
        value={county}
        onChange={onCounty}
        className="min-w-[180px] max-[767px]:min-w-full"
      >
        <option value="">Counties</option>
        {TEXAS_COUNTIES.map((name) => (
          <option key={name} value={name}>
            {name} County
          </option>
        ))}
      </SelectControl>
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${SELECT_CLASS} ${CONTROL_TINT} min-h-[44px]`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-[13px] top-1/2 h-[7px] w-[11px] -translate-y-1/2 text-mv-muted"
        strokeWidth={1.8}
      />
    </div>
  );
}

/* ==========================================================================
   Applied filter tags (`#opTagRow` / `.ftag`)

   `useOperatorDirectory` builds the list, because only it knows how to undo each
   filter. The row is hidden when nothing is applied, so the panel never carries
   an empty strip.
   ========================================================================== */

function AppliedTags({
  filters,
  onClearAll,
}: {
  filters: AppliedFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-mv-line-soft pt-4">
      <span className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-mv-muted">
        Applied:
      </span>

      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-[6px] rounded-full border border-mv-mint-line bg-mv-tint py-[5px] pl-3 pr-2 text-[12.5px] font-semibold text-mv-green-deep"
        >
          {filter.label}
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remove filter ${filter.label}`}
            className="inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(47,138,102,.14)] text-mv-green-deep hover:bg-[rgba(47,138,102,.28)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep"
          >
            <X aria-hidden="true" className="h-[11px] w-[11px]" strokeWidth={3} />
          </button>
        </span>
      ))}

      <FilterPill active={false} onClick={onClearAll} className="!py-[7px]">
        Clear all ✕
      </FilterPill>
    </div>
  );
}

/* ==========================================================================
   Results toolbar — the "Columns ▾" popover (`.pop`) and "Export CSV ↓"

   Dismissal mirrors `SiteHeader`'s Learn dropdown — outside pointerdown and
   Escape — rather than the prototype's single document-level click listener, so
   the two dropdowns on the site behave the same way and keyboard users can get
   out. Focus returns to the trigger on Escape.

   The Operator Name column is checked and disabled: the table is meaningless
   without it, which is the design's `.pop label.lock`.
   ========================================================================== */

const COLUMN_LABELS: { key: keyof OperatorColumns; label: string }[] = [
  { key: "oil", label: "Oil Produced" },
  { key: "gas", label: "Gas Produced" },
  { key: "cty", label: "Counties" },
  { key: "status", label: "Status" },
];

function TableControls({
  columns,
  onColumnsChange,
  onExport,
}: {
  columns: OperatorColumns;
  onColumnsChange: (columns: OperatorColumns) => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <div ref={wrapRef} className="relative inline-block">
        <Button
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((value) => !value)}
          className="max-[767px]:text-sm"
        >
          Columns
          <span aria-hidden="true" className="text-[11px]">
            ▾
          </span>
        </Button>

        {open && (
          // Anchored right on desktop; flipped to the left edge under 480px so a
          // 220px panel cannot push the page wider than the viewport.
          <div
            aria-label="Manage columns"
            className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[220px] rounded-xl border border-mv-line bg-white px-[14px] py-3 shadow-[0_12px_30px_rgba(13,14,23,.14)] max-[480px]:left-0 max-[480px]:right-auto"
          >
            <label className="flex cursor-not-allowed items-center gap-[9px] py-[6px] text-[13.5px] font-medium text-mv-muted">
              <input
                type="checkbox"
                checked
                disabled
                className="h-4 w-4 accent-mv-green-deep"
              />
              Operator Name (operator no.)
            </label>

            {COLUMN_LABELS.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-[9px] py-[6px] text-[13.5px] font-medium"
              >
                <input
                  type="checkbox"
                  checked={columns[key]}
                  onChange={(event) =>
                    onColumnsChange({ ...columns, [key]: event.target.checked })
                  }
                  className="h-4 w-4 cursor-pointer accent-mv-green-deep"
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      <Button onClick={onExport} className="max-[767px]:text-sm">
        Export CSV
        <span aria-hidden="true">↓</span>
      </Button>
    </div>
  );
}

/* ==========================================================================
   The results table — the prototype's "Recent wells & permits" treatment:
   dark `mv-table-head` header, hairline row rules, teal operator links, pill
   status badges.

   RESPONSIVE: the horizontal scroll lives on the wrapper immediately around the
   `<table>`, and the table keeps the design's `min-w-[760px]`. So the columns
   never crush on a phone, the scroll is contained inside the card's rounded
   clip, and the page body itself never scrolls sideways.

   ACCESSIBILITY: the prototype makes the whole `<tr>` a click target via a
   document listener and `cursor:pointer`. That is not reachable by keyboard and
   not announced as a link, so here the operator name is a real `<Link>` and the
   row keeps only the hover tint as an affordance. Sortable headers are buttons
   carrying `aria-sort` on their `<th>`, and the arrow is decorative.
   ========================================================================== */

type SortableColumn = {
  key: OperatorSortKey;
  label: string;
  /** Which optional column toggle governs this one. */
  column: keyof OperatorColumns;
};

/**
 * The three columns the API can sort by, all wired to `sort.propertyName`.
 *
 * The "illustrative" sub-labels are gone — these figures are now reported data,
 * and so is Status. The unit sub-labels went with them because the API returns
 * each value pre-formatted with its own unit ("57,323.230 (MBBL)"), so the unit
 * is in the cell rather than the header.
 *
 * Operator Name is deliberately not in this list: `operator_name`,
 * `cleaned_operator_name` and `status` all return byte-identical results to a
 * bogus field name, so the endpoint does not sort by name. Its header stays a
 * plain label rather than a button that would do nothing.
 */
const SORTABLE: SortableColumn[] = [
  { key: "oil", label: "Oil Produced", column: "oil" },
  { key: "gas", label: "Gas Produced", column: "gas" },
  { key: "cty", label: "Counties", column: "cty" },
];

/**
 * The header text, with the column's unit appended for the two production
 * columns. Units come from the response, so the header reflects what the API
 * actually sent rather than a hard-coded guess.
 */
function columnLabel(
  col: SortableColumn,
  units: OperatorResultPage["units"],
): string {
  if (col.key === "oil" && units.oil) return `${col.label} (${units.oil})`;
  if (col.key === "gas" && units.gas) return `${col.label} (${units.gas})`;
  return col.label;
}

const TH_CLASS =
  "whitespace-nowrap px-[18px] py-[15px] text-[13px] font-semibold text-white";


function ResultsTable({
  page,
  columns,
  sortKey,
  sortDir,
  isLoading,
  hasError,
  hasLoadedOnce,
  onSort,
  onClearFilters,
  onRetry,
}: {
  page: OperatorResultPage;
  columns: OperatorColumns;
  sortKey: OperatorSortKey;
  sortDir: "asc" | "desc";
  isLoading: boolean;
  hasError: boolean;
  /** Suppresses the empty state until a response has actually arrived. */
  hasLoadedOnce: boolean;
  onSort: (key: OperatorSortKey) => void;
  onClearFilters: () => void;
  /** Re-issues the same request; the filter dedupe would otherwise skip it. */
  onRetry: () => void;
}) {
  const visibleSortable = SORTABLE.filter((col) => columns[col.column]);
  // `#` + name + the visible optional columns, for the empty row's colspan.
  const columnCount = 2 + visibleSortable.length + (columns.status ? 1 : 0);

  function ariaSort(key: OperatorSortKey) {
    if (sortKey !== key) return "none" as const;
    return sortDir === "asc"
      ? ("ascending" as const)
      : ("descending" as const);
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-mv-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <caption className="sr-only">
            Texas oil and gas operators, ranked by reported production.
          </caption>

          <thead>
            <tr className="bg-mv-table-head">
              <th
                scope="col"
                className={`${TH_CLASS} w-[58px] min-w-[58px] text-left`}
              >
                #
              </th>

              {/* Plain label, not a button: the API cannot sort by name. */}
              <th scope="col" className={`${TH_CLASS} text-left`}>
                Operator Name (operator no.)
              </th>

              {visibleSortable.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort(col.key)}
                  className={`${TH_CLASS} text-right`}
                >
                  <SortButton
                    // The unit lives here rather than on every row: it never
                    // varies down the column, so repeating it 10 times only
                    // crowded the figures.
                    label={columnLabel(col, page.units)}
                    active={sortKey === col.key}
                    dir={sortDir}
                    onClick={() => onSort(col.key)}
                  />
                </th>
              ))}

              {columns.status && (
                <th scope="col" className={`${TH_CLASS} text-left`}>
                  Status
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {hasError ? (
              <tr>
                <td colSpan={columnCount} className="whitespace-normal bg-white">
                  <ErrorState onRetry={onRetry} />
                </td>
              </tr>
            ) : isLoading ? (
              // Skeleton rows rather than an emptied body: the card keeps its
              // height, so nothing shifts, and stale rows are never presented as
              // if they were the new results.
              <SkeletonRows
                rows={Math.max(page.rows.length, 5)}
                columns={columns}
                sortableCount={visibleSortable.length}
              />
            ) : page.rows.length === 0 && hasLoadedOnce ? (
              <tr>
                <td colSpan={columnCount} className="whitespace-normal bg-white">
                  <EmptyState onClearFilters={onClearFilters} />
                </td>
              </tr>
            ) : (
              page.rows.map((row, index) => (
                <OperatorRow
                  key={row.key}
                  row={row}
                  rank={page.from + index + 1}
                  columns={columns}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Memoised: `Operator` objects come from the fixture and keep the same identity
 * across queries, and `columns` only changes when a checkbox is toggled. So a
 * re-render caused by typing reconciles the rows that actually changed and skips
 * the rest.
 */
const OperatorRow = memo(function OperatorRow({
  row,
  rank,
  columns,
}: {
  row: OperatorRowData;
  rank: number;
  columns: OperatorColumns;
}) {
  const cellClass =
    "whitespace-nowrap border-b border-mv-line-soft bg-white px-[18px] py-4 text-[14.5px] text-mv-ink group-last:border-b-0 group-hover:bg-mv-row-hover";
  const numericCell = `${cellClass} text-right tabular-nums`;

  return (
    <tr className="group transition-colors hover:bg-mv-row-hover">
      <td className={`${cellClass} text-[12.5px] tabular-nums text-mv-muted`}>
        {rank}
      </td>

      <td className={cellClass}>
        {/* A gated row has no slug, so its name is plain text rather than a link
            to nowhere. Everything else about the cell is unchanged. */}
        {row.href ? (
          <Link
            href={row.href}
            className="font-bold text-mv-green-deep no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          >
            {row.name}
          </Link>
        ) : (
          <strong className="font-bold text-mv-muted">{row.name}</strong>
        )}
        <span className="mt-[2px] block text-xs font-normal text-mv-muted">
          No. {row.operatorNumber}
        </span>
      </td>

      {columns.oil && <td className={numericCell}>{row.oil}</td>}

      {columns.gas && <td className={numericCell}>{row.gas}</td>}

      {columns.cty && <td className={numericCell}>{row.counties}</td>}

      {columns.status && (
        <td className={cellClass}>
          {row.masked ? (
            <span className="text-mv-muted">{row.status}</span>
          ) : (
            <span
              className={`inline-block whitespace-nowrap rounded-full px-3 py-[5px] text-[12.5px] font-semibold leading-none ${
                row.status === "active"
                  ? "bg-mv-tint text-mv-green-deep"
                  : "bg-mv-line-soft text-mv-muted"
              }`}
            >
              {row.status === "active" ? "Active" : "Inactive"}
            </span>
          )}
        </td>
      )}
    </tr>
  );
});

/**
 * A sortable column header.
 *
 * Every sortable column carries an icon, not just the sorted one: an unsorted
 * column shows a dimmed `⇅` so it reads as sortable before it is clicked, and the
 * sorted column shows its direction at full strength. Clicking the sorted column
 * flips it; clicking another switches to it descending.
 *
 * The icon is `aria-hidden` because the `<th>` already carries `aria-sort`, which
 * is what a screen reader announces. `title` names the next action rather than the
 * current state, so the tooltip is useful on a column that is already sorted.
 */
function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  const nextDir = active && dir === "desc" ? "ascending" : "descending";

  // `lucide-react` rather than the `▲`/`▼`/`⇅` characters this used before: glyph
  // arrows inherit the font's own metrics, so they sat off the text baseline and
  // rendered at inconsistent weights across platforms. These are the same icon set
  // the selects and search field already use, so they match the rest of the page.
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Sort by ${label} ${nextDir}`}
      className="group/sort inline-flex cursor-pointer items-center gap-[5px] border-0 bg-transparent p-0 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className="group-hover/sort:underline group-hover/sort:underline-offset-[3px]">
        {label}
      </span>
      <Icon
        aria-hidden="true"
        strokeWidth={2.5}
        className={`h-[13px] w-[13px] shrink-0 ${
          active ? "text-white" : "text-white/50 group-hover/sort:text-white/80"
        }`}
      />
    </button>
  );
}

/**
 * Loading rows — the prototype's `.skel` shimmer, which is this table's approved
 * loading treatment. Drawn as real `<tr>`s at the same cell padding as data rows
 * so the card holds its height and the layout does not move when results land.
 */
function SkeletonRows({
  rows,
  columns,
  sortableCount,
}: {
  rows: number;
  columns: OperatorColumns;
  sortableCount: number;
}) {
  const cellClass =
    "whitespace-nowrap border-b border-mv-line-soft bg-white px-[18px] py-4 text-[14.5px] group-last:border-b-0";
  const bar =
    "inline-block h-3 animate-pulse rounded-md bg-mv-line-soft align-middle";

  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index} className="group" aria-hidden="true">
          <td className={cellClass}>
            <span className={`${bar} w-5`} />
          </td>
          <td className={cellClass}>
            <span className={`${bar} w-[180px]`} />
            <span className={`${bar} mt-[6px] block w-[110px] !h-2`} />
          </td>
          {Array.from({ length: sortableCount }, (_, cell) => (
            <td key={cell} className={`${cellClass} text-right`}>
              <span className={`${bar} w-14`} />
            </td>
          ))}
          {columns.status && (
            <td className={cellClass}>
              <span className={`${bar} w-16`} />
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

/** Shown only after a completed request returned zero records. */
function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="px-5 py-[34px] text-center">
      <div aria-hidden="true" className="mb-2 text-[28px]">
        🔍
      </div>
      <p className="mb-[6px] text-sm font-bold">No results available</p>
      <p className="mx-auto mb-[14px] max-w-[460px] text-[12.5px] text-mv-muted">
        No operators match these filters. Try removing one of the applied filters
        above, or widening the search.
      </p>
      <FilterPill active={false} onClick={onClearFilters}>
        Clear all filters ✕
      </FilterPill>
    </div>
  );
}

/**
 * Request failed. Says what the visitor can do and nothing about why — the
 * technical detail is logged server-side by the action.
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-5 py-[34px] text-center">
      <div aria-hidden="true" className="mb-2 text-[28px]">
        ⚠
      </div>
      <p className="mb-[6px] text-sm font-bold">
        We couldn&apos;t load operators just now
      </p>
      <p className="mx-auto mb-[14px] max-w-[460px] text-[12.5px] text-mv-muted">
        The operator directory is temporarily unavailable. Your filters are still
        here — try again in a moment.
      </p>
      <FilterPill active={false} onClick={onRetry}>
        Try again
      </FilterPill>
    </div>
  );
}

/* ==========================================================================
   Pagination (`.pager`) — the record count on the left, page buttons on the
   right, both wrapping on narrow screens.

   The page window is the prototype's: first, last, and the pages either side of
   the current one, with `…` for the gaps. The left slot held a rows-per-page
   select in the prototype and now reports the total; `page.total` is the count
   for the filters currently applied, the same number a paginated API response
   would carry. Page size remains part of `OperatorQuery`, so a rows-per-page
   control can return without reshaping anything.

   Hidden entirely when there are no results — the empty state already says zero.
   ========================================================================== */

function Pager({
  page,
  onPage,
}: {
  page: OperatorResultPage;
  onPage: (page: number) => void;
}) {
  if (page.total === 0) return null;

  const { page: current, pageCount } = page;

  const windowed: number[] = [];
  for (let index = 1; index <= pageCount; index += 1) {
    if (index === 1 || index === pageCount || Math.abs(index - current) <= 1) {
      windowed.push(index);
    }
  }

  return (
    <nav
      aria-label="Directory pages"
      className="flex flex-wrap items-center justify-between gap-3 px-[2px] pb-[2px] pt-4"
    >
      <p className="m-0 text-[12.5px] text-mv-muted">
        Total records:{" "}
        <b className="font-bold tabular-nums text-mv-ink">{page.total}</b>
      </p>

      <span className="flex flex-wrap items-center gap-[5px]">
        <PageButton
          onClick={() => onPage(current - 1)}
          disabled={current === 1}
          label="Previous page"
        >
          ← Previous
        </PageButton>

        {windowed.map((value, index) => (
          <span key={value} className="flex items-center gap-[5px]">
            {index > 0 && value - windowed[index - 1] > 1 && (
              <span aria-hidden="true" className="px-[2px] text-mv-muted">
                …
              </span>
            )}
            <PageButton
              onClick={() => onPage(value)}
              current={value === current}
              label={`Page ${value}`}
            >
              {value}
            </PageButton>
          </span>
        ))}

        <PageButton
          onClick={() => onPage(current + 1)}
          disabled={current === pageCount}
          label="Next page"
        >
          Next →
        </PageButton>
      </span>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled = false,
  current = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`min-w-[34px] cursor-pointer rounded-[9px] border px-[10px] py-[6px] text-[13.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-not-allowed disabled:opacity-40 ${
        current
          ? selectedControlClass
          : "border-mv-line bg-white text-mv-ink enabled:hover:bg-mv-hover"
      }`}
    >
      {children}
    </button>
  );
}

/* ==========================================================================
   The rounded filter pill (`.fp`) with its optional count badge (`.fp .cnt`).

   The selected state uses `bg-mv-tint`, not `bg-mv-mint`: the mint token is
   `#e6fff5`, a visibly cooler mint, while the prototype's selected pill is the
   warmer `#e6f6ee` green tint.

   Used by the quick filters, the applied-tags row and the empty state. If a
   second page ever needs it, promote it to `app/_components/`.
   ========================================================================== */

function FilterPill({
  children,
  active,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group inline-flex cursor-pointer items-center rounded-full border px-4 py-[9px] text-[13.5px] shadow-[0_1px_1px_rgba(13,14,23,.03)] transition-[background,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        active
          ? "border-mv-green bg-mv-tint font-bold text-mv-green-deep shadow-[0_5px_14px_rgba(47,138,102,.16)]"
          : "border-mv-line bg-white font-medium text-mv-ink hover:-translate-y-px hover:border-mv-green hover:text-mv-green-deep hover:shadow-[0_5px_12px_rgba(47,138,102,.12)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

