"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";

import {
  activeFilterCount,
  emptyLeaseFilters,
  type LeaseFilterOptions,
  type LeaseFilters,
} from "../../_lib/lease-filters";
import { LeaseSelect, type SelectOption } from "./lease-select";
import {
  leasePageSizes,
  leaseSortOptions,
  presetKeyFor,
  sortLabel,
  type LeaseSort,
} from "../../_lib/lease-sorting";

/** Which layout the list is drawn in. */
export type LeaseView = "list" | "grid";

/**
 * EVERYTHING ABOVE THE TABLE — search, sort, page size, layout and five filters.
 *
 * ── IT IS THE TOP OF THE TABLE'S OWN CARD, NOT A CARD OF ITS OWN ──
 *
 * The controls and the rows they govern are one object, so they share one
 * border: search and filters, then the headings, then the rows, then the pager,
 * with no gap anywhere down the stack. As two cards there was a strip of page
 * between the filter row and the column headings, which read as two unrelated
 * panels that happened to be adjacent. `LeaseListPanel` owns the card; this
 * renders the two rows into it.
 *
 * ── TWO ROWS, AND THE SPLIT IS BY WHAT THEY DO ──
 *
 * The top row changes how the list is PRESENTED: what it is sorted by, how much
 * of it is on screen, and whether it is a table or cards. The bottom row changes
 * WHICH LEASES ARE IN IT. Mixing them puts "sort by value" beside "only DE WITT"
 * as if they were the same kind of decision, and a reader hunting for a filter
 * has to read every control to find it.
 *
 * The tinted second row is what makes that split visible without a heading.
 *
 * ── IT OWNS NO STATE ──
 *
 * Every value is passed in and every change handed back to `LeaseListPanel`,
 * because the table, the grid and the totals row all read the same selection.
 * A toolbar holding its own state would be the second place that selection
 * lives.
 *
 * ── THE FILTER ROW IS ALWAYS OPEN ──
 *
 * It used to fold away behind a button that also carried a count of active
 * filters, and both are gone on request. The row is five dropdowns that read
 * "All …" until somebody changes one, which is its own statement that nothing
 * is being hidden — and "Clear all" is the one-click way out of a narrowing
 * somebody has lost track of.
 *
 * The count that went with them is not missed: the pager below the table says
 * "Showing 1–10 of 10 leases" and is `aria-live`, so the same fact still
 * reaches a screen reader when a filter changes it.
 *
 * ── EVERY DROPDOWN IS BUILT FROM THE RECORD ──
 *
 * See `lease-filters.ts`. A county this owner holds nothing in would return an
 * empty table and leave them unable to tell a filter from a fault.
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
  filters,
  onFiltersChange,
  options,
}: {
  sort: LeaseSort;
  onSortChange: (next: LeaseSort) => void;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  query: string;
  onQueryChange: (next: string) => void;
  view: LeaseView;
  onViewChange: (next: LeaseView) => void;
  filters: LeaseFilters;
  onFiltersChange: (next: LeaseFilters) => void;
  /* WHAT THE FIVE DROPDOWNS OFFER, passed in rather than imported. They are the
     distinct values of the leases actually on screen, and this component does
     not know which set that is — see `leaseFilterOptionsFor`. */
  options: LeaseFilterOptions;
}) {
  const active = activeFilterCount(filters);

  function set<K extends keyof LeaseFilters>(key: K, value: string): void {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <>
      {/* ── THE CONTROL ROW, WHICH IS FOUR ROWS ON A PHONE AND WAS FIVE ──

          Left to wrap on its own the four controls each took a line, and the
          layout button pair — pushed right by `ml-auto` — landed alone on the
          last one with 200px of empty card beside it. Below `sm` the search and
          the sort each take a full row deliberately (they are the two that need
          the width), and "Show" and the layout pair share the last one, which
          is what `ml-auto` was always for. */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <label className="relative flex w-full items-center sm:w-auto sm:min-w-[240px] sm:flex-1">
          <span className="sr-only">Search your leases</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 h-4 w-4 text-mv-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search lease, number, county, operator or reservoir…"
            className="w-full rounded-[9px] border border-mv-line bg-mv-card py-2 pr-3 pl-9 text-[13px] text-mv-ink outline-none transition-colors placeholder:text-mv-placeholder hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
          />
        </label>

        <ToolbarSelect
          fill
          label="Sort by"
          value={presetKeyFor(sort) ?? "custom"}
          onChange={(value) => {
            const preset = leaseSortOptions.find(
              (option) => option.value === value,
            );
            if (preset) onSortChange(preset.sort);
          }}
          /* AN ORDER REACHED BY CLICKING A HEADING usually has no preset name,
             and the control cannot show nothing. So it describes itself —
             "Operator — Z to A" — and disappears again the moment the reader
             picks a named order. Disabled because picking it would be picking
             what is already selected. */
          options={[
            ...(presetKeyFor(sort) === null
              ? [{ value: "custom", label: sortLabel(sort), disabled: true }]
              : []),
            ...leaseSortOptions.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ]}
        />

        <ToolbarSelect
          label="Show"
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={leasePageSizes.map((size) => ({
            value: String(size),
            label: `${size} per page`,
          }))}
        />

        {/* `aria-pressed` on two buttons is the whole accessible story of a
            segmented control — see `ui/segmented-control.tsx` for why this is
            not Radix. The icons repeat what the words say, so they are hidden. */}
        <span
          role="group"
          aria-label="Lease layout"
          className="ml-auto inline-flex gap-0.5 rounded-[10px] bg-mv-portal-wash p-[3px]"
        >
          <ViewButton
            selected={view === "list"}
            onClick={() => onViewChange("list")}
            icon={<List aria-hidden="true" className="h-3.5 w-3.5" />}
            label="List"
          />
          <ViewButton
            selected={view === "grid"}
            onClick={() => onViewChange("grid")}
            icon={<LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" />}
            label="Grid"
          />
        </span>
      </div>

      {/*
        A STRONGER RULE UNDER THE FILTER ROW THAN BETWEEN THE TWO CONTROL ROWS.
        The search row and the filter row are one block — how the list is
        presented, and which leases are in it — so the line between them is the
        light hairline every other divider on the page uses. The line BELOW them
        separates the controls from the thing they control, which is the one
        real break in the card, so it is the darker `mv-line-strong`.
      */}
      <div className="flex flex-wrap items-center gap-3 border-t border-b border-t-mv-line border-b-mv-line-strong bg-mv-bg px-4 py-3">
        <FilterField
          label="County"
          value={filters.county}
          allLabel="All counties"
          options={options.county}
          onChange={(value) => set("county", value)}
        />
        <FilterField
          label="Operator"
          value={filters.operator}
          allLabel="All operators"
          options={options.operator}
          onChange={(value) => set("operator", value)}
        />
        <FilterField
          label="Reservoir"
          value={filters.reservoir}
          allLabel="All reservoirs"
          options={options.reservoir}
          onChange={(value) => set("reservoir", value)}
        />
        <FilterField
          label="Status"
          value={filters.status}
          allLabel="All status"
          options={options.status}
          onChange={(value) => set("status", value)}
        />
        <FilterField
          label="Lease type"
          value={filters.type}
          allLabel="All types"
          options={options.type}
          onChange={(value) => set("type", value)}
        />

        <div className="ml-auto flex items-center">
          {/*
            RED, AND IT IS THE ONLY RED CONTROL ON THE PAGE. Everything else
            here narrows or reorders and is reversible by doing it again; this
            one throws away every choice the reader has made in the row at once.
            The colour is the warning, which is also why it is an outline rather
            than a fill — a solid red button reads as the thing you are supposed
            to press.

            DISABLED RATHER THAN HIDDEN WHEN THERE IS NOTHING TO CLEAR. The row
            keeps its shape as filters come and go, so nothing slides sideways
            under the pointer the moment somebody picks one — and the red fades
            with it, so the warning is only on when there is something to lose.
          */}
          <button
            type="button"
            disabled={active === 0}
            onClick={() => onFiltersChange(emptyLeaseFilters)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-mv-red bg-mv-card px-3 py-2 text-[12.5px] font-semibold text-mv-red transition-colors hover:bg-mv-red-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-red disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-mv-card"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Clear all
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * A labelled select for the top row — the label beside the control, because
 * that row reads as a sentence ("sort by production value, show 25 per page").
 */
function ToolbarSelect({
  label,
  value,
  onChange,
  className = "",
  options,
  fill = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  options: readonly SelectOption[];
  /** Take the whole row on a phone — for the one whose value is a sentence. */
  fill?: boolean;
}) {
  return (
    /* A `<span>` AND NOT A `<label>`. The control is a button, and a `<label>`
       wrapping a button does not name it — `LeaseSelect` carries its own
       `aria-labelledby` instead, so the visible word here is decoration and
       must not claim to be the label. */
    <span
      className={`flex items-center gap-2 ${fill ? "w-full sm:w-auto" : ""} ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className="text-[12px] font-semibold whitespace-nowrap text-mv-muted"
      >
        {label}
      </span>
      <span className={fill ? "min-w-0 grow sm:grow-0" : ""}>
        <LeaseSelect
          label={label}
          value={value}
          options={options}
          onChange={onChange}
          block={fill}
        />
      </span>
    </span>
  );
}

/**
 * A select for the filter row.
 *
 * ── THE LABEL IS THERE BUT NOT DRAWN ──
 *
 * Each control already says what it filters — "All counties", "All operators" —
 * so a "County" caption above it repeats the word directly beneath. The row is
 * five dropdowns that name themselves.
 *
 * The `<span>` stays as `sr-only` rather than being deleted, and that is not
 * ceremony: a `<select>` needs an accessible name, and its first option is not
 * one. Without it a screen reader announces five unnamed comboboxes whose only
 * distinguishing feature is the option list inside them.
 */
function FilterField({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  /** What the empty value reads as — "All counties", not "All". */
  allLabel: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  return (
    <span className="min-w-[150px] flex-1">
      <LeaseSelect
        label={label}
        value={value}
        onChange={onChange}
        block
        /* `""` IS "All counties" — the first option below. Passing it is what
           puts the ✕ on this control once anything else is chosen. */
        clearTo=""
        options={[
          { value: "", label: allLabel },
          ...options.map((option) => ({ value: option, label: option })),
        ]}
      />
    </span>
  );
}

function ViewButton({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      /* THE SELECTED SEGMENT IS GREEN, LIKE EVERY OTHER "THIS ONE" ON THE PAGE.
         It was ink, and a black fill was the only one on the tab: the My Leases
         pill directly above it and the current page in the pager underneath it
         both say "selected" in brand green, so a third answer in black read as
         a different KIND of control rather than the same state. */
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        selected
          ? "bg-mv-green-deep text-white shadow-mv"
          : "bg-transparent text-mv-slate hover:text-mv-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
