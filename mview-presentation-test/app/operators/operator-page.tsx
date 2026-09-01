"use client";

import { ChevronDown, ChevronUp, Lock, Search, X } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/app/_components/button";
import { Pager as SharedPager } from "@/app/_components/pager";
import { CONTROL_TINT } from "@/app/_components/control-styles";
import { SelectControl } from "@/app/_components/select-control";
import { OperatorLogo } from "@/app/_components/operator-logo";
import {
  fieldGroupLabelClass,
  tinyClass,
} from "@/app/_components/typography";
import {
  ALL_PLAYS,
  isLockedValue,
  PAGE_SIZE,
  QUICK_FILTERS,
  QUICK_FILTER_KEYS,
  SORT_CAPTIONS,
  type OperatorFilters,
  type OperatorResultPage,
  type OperatorRow as OperatorRowData,
  type OperatorSortKey,
  type OperatorStatusFilter,
  type QuickFilterKey,
} from "@/lib/operator-search";
import type { OperatorColumns } from "@/lib/operator-types";

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
 *   · `@/app/_components/button` and `typography` — site-wide, used by /blogs too.
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
  /** County names from `GET /api/v1/operators/counties`, fetched in `page.tsx`. */
  counties,
  /** The `guestUserID` cookie value, read server-side in `page.tsx`. */
  visitorId,
  /**
   * Whether a session exists, read server-side in `page.tsx`.
   *
   * Passed straight through to `useOperatorDirectory` for the CSV export and used
   * nowhere else here. The table's own locks come from the response, not from
   * this — see the note on the prop there.
   */
}: {
  playTypes: string[];
  counties: string[];
  visitorId: string;
}) {
  const {
    filters,
    searchInput,
    page,
    pageSize,
    columns,
    appliedFilters,
    canClearFilters,
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
    isExporting,
  } = useOperatorDirectory({ playTypes, visitorId });

  return (
    <section
      aria-label="Operators directory"
      className="mt-5 overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv"
    >
      {/* ---- filter zone ---- */}
      <div className="relative bg-[linear-gradient(180deg,#f3faf6_0%,#ffffff_82%)] p-6 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,var(--color-mv-green),var(--color-mv-green-deep))] before:content-[''] max-[767px]:p-4">
        <QuickFilters selected={filters.quick} onToggle={toggleQuick} />

        <div className="mt-3">
          <FindBar
            search={searchInput}
            play={filters.play}
            playTypes={playTypes}
            counties={counties}
            status={filters.status}
            county={filters.county}
            onSearch={setSearch}
            onPlay={setPlay}
            onStatus={setStatus}
            onCounty={setCounty}
          />
        </div>

        <AppliedTags
          filters={appliedFilters}
          canClearAll={canClearFilters}
          onClearAll={clearFilters}
        />
      </div>

      <div className="h-px bg-mv-line-soft" />

      {/* ---- results zone ---- */}
      {/* DEFECT 118 — `pt-4` under the filter zone's own padding left a visible
          empty band above "Showing …". */}
      <div className="px-6 pb-[22px] pt-3 max-[767px]:px-4">
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
                {/* DEFECT 122 — this said "ranked by reported production" whatever
                    the table was actually ordered by, so it was wrong the moment a
                    column header was clicked and wrong again once the default
                    became counties. It now names the live sort. */}
                · {SORT_CAPTIONS[filters.sortKey]}
              </>
            ) : (
              "0 operators match the current filters"
            )}
          </p>

          <TableControls
            columns={columns}
            onColumnsChange={setColumns}
            onExport={exportCsv}
            isExporting={isExporting}
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

/* `SelectControl` itself now lives in `app/_components/select-control.tsx`, shared
   with the operator detail page and the production comparison so all three pages
   carry the same dropdown rather than three that merely resemble each other. */

/* The Play Type and Status options no longer carry trailing counts. Those came
   from the local fixture, and the search endpoint reports a single `total_count`
   for the whole query rather than a count per option value. */

function FindBar({
  search,
  play,
  playTypes,
  counties,
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
  counties: string[];
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
          /* DEFECT 120 — `py-[13px]` at 15px text made this 48px against the
             selects' 44px, so the filter row sat crooked. `min-h-[44px]` with the
             selects' own padding and text size puts every control on one line. */
          className={`min-h-[44px] w-full rounded-xl border bg-white py-2 pl-11 pr-[14px] text-sm text-mv-ink outline-none transition-colors placeholder:text-mv-placeholder hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] ${CONTROL_TINT}`}
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
        {counties.map((name) => (
          <option key={name} value={name}>
            {name} County
          </option>
        ))}
      </SelectControl>
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
  canClearAll,
  onClearAll,
}: {
  filters: AppliedFilter[];
  /** False when every filter is already at its default — see the hook. */
  canClearAll: boolean;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    /* DEFECT 116 / 118 — the row was `mt-4 pt-4`, which stacked two full gaps
       against the filter row above it. Halved, and `gap-x-3` gives the chips a
       little more room than the tight `gap-2` they shared with the Clear all
       button. */
    <div className="mt-[10px] flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-mv-line-soft pt-[10px]">
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

      {/* DEFECT 116 — a measured step away from the last chip, not a push to the
          far edge: `ms-auto` sent it 589px right, which is the "unnecessary extra
          whitespace" the defect warns against. `ms-1` on top of the row's `gap-x-3`
          reads as a separator between the filters and the action that clears them,
          and it survives wrapping. The ✕ gains a real gap — it was butted straight
          against the word. */}
      {canClearAll && (
        <FilterPill
          active={false}
          onClick={onClearAll}
          className="!py-[7px] ms-1"
        >
          <span className="inline-flex items-center gap-[7px]">
            Clear all
            <X aria-hidden="true" className="h-[11px] w-[11px]" strokeWidth={3} />
          </span>
        </FilterPill>
      )}
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

/**
 * The toggleable columns, in the order they appear in the table.
 *
 * The locked "Operator Name (operator no.)" row that used to head this list is
 * gone: it was permanently checked and disabled, so it offered nothing to click.
 * That column is not optional and is simply always rendered.
 */
/**
 * The Columns menu — DEFECT 123.
 *
 * EVERY COLUMN IS DESELECTABLE AGAIN, DOWN TO A FLOOR OF TWO. An earlier pass
 * pinned Oil, Gas, Counties and Status as "always on", which met the floor by
 * never approaching it — but it also took away the ability to narrow the table at
 * all, and the defect is explicit that the block belongs AT two: "if exactly 2
 * columns are selected, the user must not be able to deselect either one".
 *
 * SO THE DISABLING IS DYNAMIC, not a property of particular columns. Any column
 * may be turned off while three or more are on; at exactly two, the two that
 * remain lock and the rest stay free to turn back on. That is the rule the defect
 * describes, and it is enforced again in the hook — see `withColumnFloor` — so a
 * restored or hand-edited state cannot get under it either.
 */
const COLUMN_LABELS: { key: keyof OperatorColumns; label: string }[] = [
  { key: "oil", label: "Oil Produced" },
  { key: "gas", label: "Gas Produced" },
  { key: "cty", label: "Counties" },
  { key: "leases", label: "Leases count" },
  { key: "lastProduction", label: "Last production" },
  { key: "status", label: "Status" },
];

/** The floor the Columns menu enforces — DEFECT 123. */
const MIN_VISIBLE_COLUMNS = 2;

function TableControls({
  columns,
  onColumnsChange,
  onExport,
  isExporting,
}: {
  columns: OperatorColumns;
  onColumnsChange: (columns: OperatorColumns) => void;
  onExport: () => void;
  /** True while the file is being fetched and built — DEFECT 121. */
  isExporting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** How many are on right now — what decides whether the floor has been reached. */
  const shownCount = Object.values(columns).filter(Boolean).length;

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
            {COLUMN_LABELS.map(({ key, label }) => {
              /* Locked only when it is one of the last two — see the note above. */
              const atFloor = shownCount <= MIN_VISIBLE_COLUMNS;
              const locked = columns[key] && atFloor;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-[9px] py-[6px] text-[13.5px] font-medium ${
                    locked
                      ? "cursor-default text-mv-muted"
                      : "cursor-pointer text-mv-ink"
                  }`}
                  /* Named rather than left to the disabled styling alone: a greyed
                     tick with no explanation reads as a bug. */
                  title={
                    locked
                      ? `At least ${MIN_VISIBLE_COLUMNS} columns must stay visible`
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    checked={columns[key]}
                    disabled={locked}
                    onChange={(event) =>
                      onColumnsChange({
                        ...columns,
                        [key]: event.target.checked,
                      })
                    }
                    className={`h-4 w-4 accent-mv-green-deep ${
                      locked ? "cursor-default opacity-60" : "cursor-pointer"
                    }`}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* DEFECT 121 — the button now says it is working and refuses a second
          click while it does. The export is a whole result set and a file build,
          so silence for the duration read as a dead control. */}
      <Button
        onClick={onExport}
        disabled={isExporting}
        aria-busy={isExporting}
        className="max-[767px]:text-sm"
      >
        {isExporting ? "Exporting…" : "Export CSV"}
        <span aria-hidden="true">{isExporting ? "" : "↓"}</span>
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
  onSort: (key: OperatorSortKey, dir?: "asc" | "desc") => void;
  onClearFilters: () => void;
  /** Re-issues the same request; the filter dedupe would otherwise skip it. */
  onRetry: () => void;
}) {
  const visibleSortable = SORTABLE.filter((col) => columns[col.column]);

  /* Whether the two account-only columns came back withheld — read off the
     response, so the header and the cells can never disagree about what arrived.

     MEASURED ON A ROW THAT IS NOT ITSELF GATED. Every field of a gated row is
     withheld, so asking one of those would report the columns as locked for a
     signed-in member who happened to be looking at a quick-filtered page.

     ONLY THE TWO COUNT COLUMNS ARE DERIVED HERE NOW. `lockedCount`, `oilLocked`,
     `gasLocked` and `anythingLocked` existed solely to decide whether to draw the
     unlock band at the foot of the table; the band is gone (requested), so the flags
     went with it rather than being left computed and unread. */
  const firstOpenRow = page.rows.find((row) => !row.masked);
  const ctyLocked = !!firstOpenRow && isLockedValue(firstOpenRow.counties);
  const leasesLocked = !!firstOpenRow && isLockedValue(firstOpenRow.leases);
  const columnLocked: Partial<Record<keyof OperatorColumns, boolean>> = {
    cty: ctyLocked,
    leases: leasesLocked,
  };
  // `#` + name + the visible optional columns, for the empty row's colspan.
  const columnCount =
    2 +
    visibleSortable.length +
    (columns.leases ? 1 : 0) +
    (columns.lastProduction ? 1 : 0) +
    (columns.status ? 1 : 0);

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
            Texas oil and gas operators, {SORT_CAPTIONS[sortKey]}.
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
                  <span className="inline-flex items-center gap-[6px]">
                    <SortButton
                      // The unit lives here rather than on every row: it never
                      // varies down the column, so repeating it 10 times only
                      // crowded the figures.
                      label={columnLabel(col, page.units)}
                      active={sortKey === col.key}
                      dir={sortDir}
                      onSort={(dir) => onSort(col.key, dir)}
                    />
                    {columnLocked[col.column] && <LockedHeaderMark />}
                  </span>
                </th>
              ))}

              {/* Opt-in columns. Plain labels, not buttons — connecting them to
                  `sort.propertyName` was not part of this change. */}
              {columns.leases && (
                <th scope="col" className={`${TH_CLASS} text-right`}>
                  <span className="inline-flex items-center gap-[6px]">
                    Leases count
                    {leasesLocked && <LockedHeaderMark />}
                  </span>
                </th>
              )}

              {columns.lastProduction && (
                <th scope="col" className={`${TH_CLASS} text-left`}>
                  Last production
                </th>
              )}

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
                // A full page of placeholders, not five. On first load `rows` is
                // empty, so five skeletons were replaced by ten data rows and the
                // card grew — a layout shift on every cold visit.
                rows={page.rows.length || PAGE_SIZE}
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

            {/* THE UNLOCK BAND THAT STOOD HERE IS GONE (requested).

                It was a full-width row reading "The production figures are locked",
                with a Register for free button and a Sign in link. Nothing replaces
                it: every withheld cell already carries its own redacted bar and its
                own "Free account" link, so the offer is made at each figure the
                reader actually reaches for rather than once, in prose, at the foot of
                the table. The page's closing CTA band still makes the ask in full.

                Nothing about WHAT is gated changed — the locks, the header marks and
                the gated rows are untouched. */}
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
/**
 * The tile's edge length. 40px because the cell's two lines of text measure 41px
 * inside `py-4` — anything taller grows every row in the table.
 *
 * The tile itself is `OperatorLogo`, shared with the detail page's hero; the notes on
 * why the image fills it with no inset live there.
 */
const LOGO_SIZE = 40;
const LOGO_RADIUS = 9;

/* ==========================================================================
   The sign-in gate, as the table renders it

   WHAT IS ACTUALLY GATED, AND BY WHOM. Not by this file: the search endpoint
   returns rows 4-10 as the literal `"****"` when one of the four quick filters
   is on and `member_id` is 0 — measured, and identical on every page of the
   result (3 real, 7 gated, `total_count` unchanged). Plain search, county,
   status, play type and paging never gate, so the directory stays free to browse
   exactly as the heading above it promises. This is the soft gate: the ranking
   is shown, the tail of it needs a free account.

   WHY BARS AND NOT `****`. Four asterisks in every cell reads as a rendering
   fault — the row looks broken rather than withheld, and nothing on screen says
   an account would fix it. A blurred bar reads as content deliberately held
   back, which is what it is.

   AND WHY NOT FAKE DATA UNDER THE BLUR. A blurred row of invented operator names
   and volumes would look more convincing and would be a lie: the API sent no
   figures for these rows, so there is nothing to blur. The bars claim only that
   something is there, which is all we know.
   ========================================================================== */

/**
 * The lock beside a gated column's header.
 *
 * White at 70% rather than the muted grey the cells use — this sits on the dark
 * table head, where grey-on-dark is close to invisible. `aria-hidden`, because
 * every cell in the column already carries "locked, create a free account" for a
 * screen reader; announcing it in the header too would say it eleven times.
 */
function LockedHeaderMark() {
  return (
    <Lock
      aria-hidden="true"
      className="h-[11px] w-[11px] shrink-0 text-white/70"
      strokeWidth={2.4}
    />
  );
}

/**
 * A numeric cell whose value is withheld from signed-out visitors.
 *
 * THE SAME TREATMENT AS "FIND YOUR RECORD" (requested) — see
 * `app/claim/_components/ui.tsx`. A redacted bar with a lock and a "Free account"
 * link under it, so the reader can see there IS a value and what it costs to read
 * it, rather than a bar that only says something is missing.
 *
 * LAID OUT FOR A TABLE, NOT A CARD. The claim page stacks the bar and the link and
 * can afford the height; this appears in up to thirty numeric cells at once, so the
 * two sit on one right-aligned line and the row keeps its height.
 *
 * EVERY LINK CARRIES ITS OWN `aria-label` naming the field. Thirty links reading
 * "Free account" would be thirty identical stops in a screen reader's link list;
 * "Create a free account to see the oil produced" tells it which cell it is in.
 */
function LockedValue({
  label,
  width = "w-[28px]",
}: {
  label: string;
  /** Wider for a volume than for a county count, so the bar reads as the size of
      the number it stands in for rather than as a uniform smudge. */
  width?: string;
}) {
  return (
    <span className="inline-flex items-center justify-end gap-[7px]">
      <LockedBar width={width} />
      <Link
        href="/register?from=operators"
        aria-label={`Create a free account to see the ${label.toLowerCase()}`}
        className="inline-flex shrink-0 items-center gap-[4px] whitespace-nowrap text-[11.5px] font-semibold text-mv-green-deep no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        <Lock aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.3} />
        Free account
      </Link>
    </span>
  );
}

/** One withheld value. Decorative — the row's `sr-only` line carries the meaning. */
function LockedBar({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[10px] rounded-full bg-[linear-gradient(90deg,var(--color-mv-line),var(--color-mv-line-soft))] align-middle blur-[2.5px] ${width}`}
    />
  );
}



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

  /* ---- gated row ----

     Its own branch rather than a conditional inside every cell: a locked row
     shares only the column COUNT with a real one, and threading `row.masked`
     through eight cells made each of them harder to read than both versions are
     apart. The rank still shows — it is true, and it is what says the ranking
     continues past what is visible.

     No hover lift and no `cursor-pointer`: there is nothing to open. */
  if (row.masked) {
    return (
      <tr className="group">
        <td className={`${cellClass} text-[12.5px] tabular-nums text-mv-muted`}>
          {rank}
        </td>

        <td className={cellClass}>
          <span className="flex items-center gap-3">
            {/* Exactly the tile's footprint, so a locked row is the same height
                as a real one and the table does not jolt as the gate engages. */}
            <span
              aria-hidden="true"
              style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_RADIUS }}
              className="grid shrink-0 place-items-center bg-mv-line-soft text-mv-muted"
            >
              <Lock className="h-[15px] w-[15px]" strokeWidth={2.2} />
            </span>

            <span className="min-w-0">
              {/* The one place the gate is stated in words. Said once per row for
                  a screen reader, which gets no benefit at all from the bars. */}
              <span className="sr-only">
                Locked — create a free account to see this operator
              </span>
              <LockedBar width="w-[132px]" />
              {/* `mt-[2px]`, matching the real row's number line exactly. The bar
                  sits in the same 22.475px line box the operator name occupies,
                  so with the same 2px gap above a 16px second line the two rows
                  measure identically — 40.5px — and the table does not step where
                  the gate begins. Measured, not guessed. */}
              <span className="mt-[2px] block text-xs font-semibold text-mv-muted">
                Locked
              </span>
            </span>
          </span>
        </td>

        {columns.oil && (
          <td className={numericCell}>
            <LockedBar width="w-[54px]" />
          </td>
        )}
        {columns.gas && (
          <td className={numericCell}>
            <LockedBar width="w-[54px]" />
          </td>
        )}
        {columns.cty && (
          <td className={numericCell}>
            <LockedBar width="w-[26px]" />
          </td>
        )}
        {columns.leases && (
          <td className={numericCell}>
            <LockedBar width="w-[34px]" />
          </td>
        )}
        {/* METADATA COLUMNS GET A DASH, NOT A BAR.

            The endpoint sends `"****"` for every field of a gated row, these two
            included, so there is no real value to print either way. But a blurred
            bar is an invitation, and these are not what anyone registers for:
            Status and Last production are metadata beside the figures — the
            operator's name, its volumes and its counts — that actually carry the
            value. Blurring all six made the row a wall of fuzz and spread the ask
            thin across cells that cannot pay it off.

            A muted dash reads as "nothing here", which is the truth, and leaves
            the locks concentrated where they mean something. */}
        {columns.lastProduction && (
          <td className={`${cellClass} text-mv-muted`}>—</td>
        )}
        {columns.status && <td className={`${cellClass} text-mv-muted`}>—</td>}
      </tr>
    );
  }

  return (
    <tr className="group transition-colors hover:bg-mv-row-hover">
      <td className={`${cellClass} text-[12.5px] tabular-nums text-mv-muted`}>
        {rank}
      </td>

      <td className={cellClass}>
        {/* The design system's operator identity block (`.op-id`): the logo tile
            beside the name and number, the same pairing the comparison tools use.
            The tile is shorter than the two lines of text next to it, so adding it
            does not change the row's height. */}
        <span className="flex items-center gap-3">
          <OperatorLogo
            url={row.logoUrl}
            monogram={row.monogram}
            size={LOGO_SIZE}
            radius={LOGO_RADIUS}
            monogramClassName="!rounded-[9px]"
          />

          <span className="min-w-0">
            {/* A record with no slug is plain text rather than a link to nowhere.
                (Gated rows never reach here — they return above.) */}
            {/* Ink at rest, brand green on hover — the design system's
                `.op-id-name a` rule, and the same treatment the operator
                comparison tools give an operator name. The row is clickable as a
                whole, so the hover state carries the affordance. */}
            {row.href ? (
              <Link
                href={row.href}
                className="font-bold text-mv-ink no-underline hover:text-mv-green-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                {row.name}
              </Link>
            ) : (
              <strong className="font-bold text-mv-muted">{row.name}</strong>
            )}
            <span className="mt-[2px] block text-xs font-normal text-mv-muted">
              No. {row.operatorNumber}
            </span>
          </span>
        </span>
      </td>

      {/* The volumes are gated for a signed-out reader — see the route handler.
          `isLockedValue` reads the endpoint's own `"****"` sentinel, which is what
          the server put there, so a lock here means the figure never reached the
          browser rather than that CSS is hiding it. */}
      {columns.oil && (
        <td className={numericCell}>
          {isLockedValue(row.oil) ? (
            <LockedValue label="Oil produced" width="w-[64px]" />
          ) : (
            row.oil
          )}
        </td>
      )}

      {columns.gas && (
        <td className={numericCell}>
          {isLockedValue(row.gas) ? (
            <LockedValue label="Gas produced" width="w-[64px]" />
          ) : (
            row.gas
          )}
        </td>
      )}

      {columns.cty && (
        <td className={numericCell}>
          {isLockedValue(row.counties) ? (
            <LockedValue label="Producing counties" />
          ) : (
            row.counties
          )}
        </td>
      )}

      {columns.leases && (
        <td className={numericCell}>
          {isLockedValue(row.leases) ? (
            <LockedValue label="Leases count" />
          ) : (
            row.leases
          )}
        </td>
      )}

      {columns.lastProduction && (
        <td className={cellClass}>{row.lastProduction}</td>
      )}

      {/* No `row.masked` branch here any more — a gated row returns above, so
          this cell only ever renders a real status. */}
      {columns.status && (
        <td className={cellClass}>
          <span
            className={`inline-block whitespace-nowrap rounded-full px-3 py-[5px] text-[12.5px] font-semibold leading-none ${
              row.status === "active"
                ? "bg-mv-tint text-mv-green-deep"
                : "bg-mv-line-soft text-mv-muted"
            }`}
          >
            {row.status === "active" ? "Active" : "Inactive"}
          </span>
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
  onSort,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (dir?: "asc" | "desc") => void;
}) {
  /**
   * Each arrow is its own control, so each can carry its own tooltip and sort in
   * its own direction.
   *
   * WHY IT IS NOT ONE ICON ANY MORE. A single combined chevron can only have one
   * `title`, so hovering either half of it showed the same text — the up arrow of a
   * descending column said "descending", and the down arrow of an ascending one
   * said "ascending". Splitting the control is the only way the tooltip can match
   * the arrow the pointer is actually over.
   *
   * And because each arrow now names a direction, each has to apply that direction
   * rather than toggle: an up arrow that promises "ascending" and delivers
   * descending is worse than no tooltip. The label keeps the old toggle behaviour,
   * so a plain click on the column name is unchanged.
   *
   * COLOUR still carries the applied direction — brand green ascending, light grey
   * descending, per the earlier request. The arrow that is not in effect drops to
   * `white/35` so the pair never reads as two active states.
   */
  const arrowClass = (arrowDir: "asc" | "desc") => {
    if (active && dir === arrowDir) {
      return arrowDir === "asc" ? "text-mv-green" : "text-mv-placeholder";
    }
    return "text-white/35 hover:text-white/80";
  };

  return (
    <span className="inline-flex items-center gap-[5px]">
      <button
        type="button"
        onClick={() => onSort()}
        title={
          active
            ? `Sorted by ${label} ${dir === "asc" ? "ascending" : "descending"}`
            : `Sort by ${label}`
        }
        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-white hover:underline hover:underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {label}
      </button>

      {/* Stacked into the same 16px box the single icon occupied, so the header row
          keeps its height. `-space-y-[3px]` closes the gap the two glyphs leave
          between them. */}
      <span className="inline-flex h-4 shrink-0 flex-col justify-center -space-y-[3px]">
        {(
          [
            ["asc", ChevronUp, "ascending"],
            ["desc", ChevronDown, "descending"],
          ] as const
        ).map(([arrowDir, Icon, word]) => (
          <button
            key={arrowDir}
            type="button"
            onClick={() => onSort(arrowDir)}
            title={`Sort by ${label} ${word}`}
            aria-label={`Sort by ${label} ${word}`}
            aria-pressed={active && dir === arrowDir}
            className="cursor-pointer border-0 bg-transparent p-0 leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon
              aria-hidden="true"
              strokeWidth={2.75}
              className={`h-[11px] w-[13px] shrink-0 ${arrowClass(arrowDir)}`}
            />
          </button>
        ))}
      </span>
    </span>
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
          {/* The name cell mirrors the data row's layout exactly — the logo tile,
              then a 14.5px line for the name and a 12px line for the operator
              number. Sizing the bars alone left this cell ~18px short, so the whole
              card grew when real rows replaced it; omitting the tile shifts the two
              text bars sideways by its width plus the gap for the same reason. */}
          <td className={cellClass}>
            <span className="flex items-center gap-3">
              {/* Both dimensions come from `LOGO_SIZE`, so resizing the tile can
                  never leave the skeleton a different height and reintroduce the
                  shift this cell was tuned to remove. */}
              <span
                className={`${bar} shrink-0 !rounded-[9px]`}
                style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
              />
              <span>
                <span className={`${bar} w-[180px]`} />
                <span className="mt-[2px] block text-xs">
                  <span className={`${bar} !h-2 w-[110px]`} />
                </span>
              </span>
            </span>
          </td>
          {Array.from({ length: sortableCount }, (_, cell) => (
            <td key={cell} className={`${cellClass} text-right`}>
              <span className={`${bar} w-14`} />
            </td>
          ))}
          {columns.leases && (
            <td className={`${cellClass} text-right`}>
              <span className={`${bar} w-12`} />
            </td>
          )}
          {columns.lastProduction && (
            <td className={cellClass}>
              <span className={`${bar} w-20`} />
            </td>
          )}
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

  return (
    <SharedPager
      current={page.page}
      pageCount={page.pageCount}
      total={page.total}
      onPage={onPage}
      label="Directory pages"
    />
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

