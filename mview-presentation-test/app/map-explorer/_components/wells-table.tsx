"use client";

import {
  Activity,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Download,
  Droplet,
  FlaskConical,
  Layers,
  Map as MapIcon,
  MapPin,
  Search,
  TriangleAlert,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  COUNTIES,
  OPERATORS,
  PER_PAGE,
  TOTAL_WELLS,
  WELL_STATUSES,
  WELL_TYPES,
  allWells,
  type WellRow,
} from "./wells-data";

/*
 * The Table view — the result set behind the map, as a grid.
 *
 * Everything runs against the full 9,000-row static set in `wells-data.ts`, so
 * filtering, sorting, paging and the summary strip all agree with each other:
 * tick "Reported BOE only" and the totals, the percentages and the page count
 * all move together, rather than the filter quietly applying to one page.
 *
 * Export full list is the only control still inert — it is PRO-gated in the
 * design, same as the map toolbar's.
 */

type SortKey = keyof Pick<
  WellRow,
  "api" | "operator" | "lease" | "type" | "status" | "county" | "boe"
>;

type ViewTab = "map" | "table" | "insights";

/** The four dropdown facets, each a set of chosen values. */
type FacetKey = "operator" | "type" | "status" | "county";

type Facets = Record<FacetKey, Set<string>>;

type WellsTableProps = {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onShowOnMap: (row: WellRow) => void;
};

/**
 * Widths are shares of the table, taken from the mock's own column ratios.
 * Left to `table-layout: auto` the slack all lands on one column — whichever
 * happens to hold the longest string — which is what left a canyon between
 * County and Reported BOE.
 */
const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "right";
  width: string;
}[] = [
  { key: "api", label: "API", width: "w-[11%]" },
  { key: "operator", label: "Operator", width: "w-[12%]" },
  { key: "lease", label: "Lease", width: "w-[23%]" },
  { key: "type", label: "Type", width: "w-[8%]" },
  { key: "status", label: "Status", width: "w-[15%]" },
  { key: "county", label: "County", width: "w-[15%]" },
  { key: "boe", label: "Reported BOE", align: "right", width: "w-[8%]" },
];

const FACETS: {
  key: FacetKey;
  label: string;
  options: string[];
  searchable?: boolean;
}[] = [
  { key: "operator", label: "Operator", options: OPERATORS, searchable: true },
  { key: "type", label: "Well type", options: WELL_TYPES },
  { key: "status", label: "Status", options: [...WELL_STATUSES] },
  { key: "county", label: "County", options: COUNTIES, searchable: true },
];

const emptyFacets = (): Facets => ({
  operator: new Set(),
  type: new Set(),
  status: new Set(),
  county: new Set(),
});

export function WellsTable({
  activeTab,
  onTabChange,
  onShowOnMap,
}: WellsTableProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({
    key: "api",
    ascending: true,
  });
  const [query, setQuery] = useState("");
  const [boeOnly, setBoeOnly] = useState(false);
  const [facets, setFacets] = useState<Facets>(emptyFacets);
  const [openFacet, setOpenFacet] = useState<FacetKey | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close an open dropdown on an outside click, as the map overlays do.
  useEffect(() => {
    if (!openFacet) return;

    function onPointerDown(event: MouseEvent) {
      if (!filterBarRef.current?.contains(event.target as Node)) {
        setOpenFacet(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenFacet(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openFacet]);

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return allWells().filter((row) => {
      if (boeOnly && row.boe === null) return false;
      if (facets.operator.size && !facets.operator.has(row.operator)) return false;
      if (facets.type.size && !facets.type.has(row.type)) return false;
      if (facets.status.size && !(row.status && facets.status.has(row.status))) {
        return false;
      }
      if (facets.county.size && !facets.county.has(row.county)) return false;
      if (!needle) return true;
      return (
        row.api.toLowerCase().includes(needle) ||
        row.operator.toLowerCase().includes(needle) ||
        row.lease.toLowerCase().includes(needle)
      );
    });
  }, [query, boeOnly, facets]);

  const summary = useMemo(() => {
    const operators = new Set<string>();
    const counties = new Set<string>();
    let oil = 0;
    let gas = 0;
    let inactive = 0;

    for (const row of matched) {
      operators.add(row.operator);
      counties.add(row.county);
      if (row.type === "Oil") oil += 1;
      else if (row.type === "Gas") gas += 1;
      if (row.status === "Inactive") inactive += 1;
    }

    return {
      total: matched.length,
      oil,
      gas,
      inactive,
      operators: operators.size,
      counties: counties.size,
    };
  }, [matched]);

  // Sorting spans the whole matched set, not just the page on screen.
  const sorted = useMemo(() => {
    const rows = [...matched];
    rows.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      // Nulls sort last whichever way the column is pointing.
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;

      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return sort.ascending ? order : -order;
    });
    return rows;
  }, [matched, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const rows = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const firstShown = sorted.length ? (safePage - 1) * PER_PAGE + 1 : 0;
  const lastShown = Math.min(safePage * PER_PAGE, sorted.length);
  const allOnPageSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.api));

  const chips = [
    ...FACETS.flatMap(({ key, label }) =>
      [...facets[key]].map((value) => ({ key, label, value })),
    ),
    ...(boeOnly
      ? [{ key: "boe" as const, label: "Reported BOE only", value: "" }]
      : []),
  ];

  function updateFacet(key: FacetKey, next: Set<string>) {
    setFacets((current) => ({ ...current, [key]: next }));
    setPage(1);
  }

  function removeChip(chip: (typeof chips)[number]) {
    if (chip.key === "boe") {
      setBoeOnly(false);
    } else {
      const next = new Set(facets[chip.key]);
      next.delete(chip.value);
      updateFacet(chip.key, next);
    }
    setPage(1);
  }

  function clearAll() {
    setFacets(emptyFacets());
    setBoeOnly(false);
    setQuery("");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, ascending: !current.ascending }
        : { key, ascending: true },
    );
    setPage(1);
  }

  function toggleRow(api: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(api)) next.delete(api);
      else next.add(api);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) rows.forEach((row) => next.delete(row.api));
      else rows.forEach((row) => next.add(row.api));
      return next;
    });
  }

  const share = (count: number) =>
    summary.total ? ((count / summary.total) * 100).toFixed(1) : "0.0";

  return (
    /* Two cards on the page background, not one flat sheet: the result header
       and its summary in the first, the grid and its pager in the second. */
    <div className="absolute inset-0 z-40 overflow-y-auto bg-mv-bg p-4">
      <div className="overflow-hidden rounded-xl border border-mv-line bg-white">
      {/* ---------------- heading ----------------
          Back sits on the heading's own row rather than a row of its own: the
          table fills the screen, so the map is otherwise only reachable from
          the view switch on the far right, but a 116px button does not earn a
          full-width band when this row already has ~880px going spare. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 pt-5">
        <button
          type="button"
          onClick={() => onTabChange("map")}
          className="inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg border border-mv-line px-3 py-[6px] text-[12.5px] font-semibold text-mv-green-deep hover:border-mv-green-deep hover:bg-[#f2f8f5]"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to map
        </button>

        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-mv-line" />

        <h2 className="text-[19px] font-bold leading-none text-mv-ink">
          <span className="text-mv-green-deep">
            {summary.total.toLocaleString("en-US")}
          </span>{" "}
          wells match your search
        </h2>
        <p className="text-[12.5px] text-mv-muted">
          Showing {firstShown.toLocaleString("en-US")} to{" "}
          {lastShown.toLocaleString("en-US")} of{" "}
          {summary.total.toLocaleString("en-US")} results
        </p>
      </div>

      {/* ---------------- controls ----------------
          One row: `nowrap` plus a scroller rather than `flex-wrap`, which
          collapsed this into a three-line block on a narrow viewport. */}
      <div
        ref={filterBarRef}
        className="flex items-center gap-2 px-6 py-4"
      >
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-mv-line px-3 py-[7px]">
          <Search size={14} className="text-mv-muted" aria-hidden="true" />
          <label htmlFor="table-search" className="sr-only">
            Search API, operator or lease
          </label>
          <input
            id="table-search"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search API, operator, lease,"
            className="w-[172px] border-0 bg-transparent text-[12.5px] leading-tight text-mv-ink outline-none placeholder:text-mv-muted"
          />
        </div>

        <span className="ml-1 shrink-0 text-[10px] font-extrabold uppercase tracking-[.1em] text-mv-muted">
          Filter
        </span>

        {FACETS.map((facet) => (
          <FilterDropdown
            key={facet.key}
            label={facet.label}
            options={facet.options}
            searchable={facet.searchable}
            chosen={facets[facet.key]}
            open={openFacet === facet.key}
            onOpenChange={(next) => setOpenFacet(next ? facet.key : null)}
            onChange={(next) => updateFacet(facet.key, next)}
          />
        ))}

        <label
          className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-[14px] py-[6px] text-[12.5px] font-semibold ${
            boeOnly
              ? "border-mv-green-deep text-mv-green-deep"
              : "border-mv-line text-mv-slate"
          }`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={boeOnly}
            onChange={(event) => {
              setBoeOnly(event.target.checked);
              setPage(1);
            }}
          />
          <Box checked={boeOnly} />
          Reported BOE only
        </label>

        {chips.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 cursor-pointer text-[12.5px] text-mv-muted underline underline-offset-2 hover:text-mv-green-deep"
          >
            Clear all
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <div className="flex items-center gap-1 rounded-lg border border-mv-line bg-white p-1">
            <TabButton
              icon={MapIcon}
              label="Map"
              active={activeTab === "map"}
              onClick={() => onTabChange("map")}
            />
            <TabButton
              icon={TableIcon}
              label="Table"
              active={activeTab === "table"}
              onClick={() => onTabChange("table")}
            />
            <TabButton
              icon={Activity}
              label="Insights"
              active={activeTab === "insights"}
              onClick={() => onTabChange("insights")}
            />
          </div>

          <button
            type="button"
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-mv-line px-[14px] py-[8px] text-[12.5px] font-semibold text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
          >
            <Download size={14} aria-hidden="true" />
            Export full list
            <span className="inline-flex items-center gap-[2px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-amber">
              <Zap size={8} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              Pro
            </span>
          </button>
        </div>
      </div>

      {/* ---------------- applied filters ---------------- */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
          {chips.map((chip) => (
            <span
              key={`${chip.key}:${chip.value}`}
              className="inline-flex items-center gap-[6px] rounded-full bg-[#eef1ee] py-[4px] pl-[12px] pr-[8px] text-[12px] font-semibold text-mv-slate"
            >
              {chip.value || chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={`Remove ${chip.value || chip.label}`}
                className="grid h-[15px] w-[15px] cursor-pointer place-items-center rounded-full text-mv-muted hover:bg-white hover:text-mv-green-deep"
              >
                <X size={11} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ---------------- summary strip ----------------
          Top border only — the card's own edge closes it off below. */}
      <div className="grid grid-cols-2 gap-px border-t border-mv-line bg-mv-line md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon={FlaskConical}
          tint="green"
          label="Total wells"
          value={summary.total}
          note={
            summary.total === TOTAL_WELLS
              ? "100% of results"
              : `${((summary.total / TOTAL_WELLS) * 100).toFixed(1)}% of all wells`
          }
        />
        <SummaryCard
          icon={Activity}
          tint="green"
          label="Oil wells"
          value={summary.oil}
          note={`${share(summary.oil)}%`}
        />
        <SummaryCard
          icon={Droplet}
          tint="red"
          label="Gas wells"
          value={summary.gas}
          note={`${share(summary.gas)}%`}
        />
        <SummaryCard
          icon={TriangleAlert}
          tint="amber"
          label="Inactive wells"
          value={summary.inactive}
          note={`${share(summary.inactive)}%`}
        />
        <SummaryCard
          icon={Layers}
          tint="blue"
          label="Unique operators"
          value={summary.operators}
          note="Across this result set"
        />
        <SummaryCard
          icon={MapIcon}
          tint="purple"
          label="Counties"
          value={summary.counties}
          note="Across this result set"
        />
      </div>

      </div>

      {/* ---------------- table ---------------- */}
      <div className="mt-4 overflow-hidden rounded-xl border border-mv-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="border-b border-mv-line bg-[#f8f9fa]">
              {/* First and last cells carry the page's 24px gutter, so the grid
                  lines up with the heading above it. */}
              <th scope="col" className="w-12 py-[8px] pl-6 pr-4">
                <label className="flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={allOnPageSelected}
                    onChange={togglePage}
                  />
                  <Box checked={allOnPageSelected} />
                  <span className="sr-only">Select all rows on this page</span>
                </label>
              </th>

              {COLUMNS.map(({ key, label, align, width }) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sort.key === key
                      ? sort.ascending
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`whitespace-nowrap px-4 py-[8px] ${width} ${
                    align === "right" ? "text-right" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[12.5px] font-extrabold uppercase tracking-[.08em] text-mv-slate hover:text-mv-green-deep"
                  >
                    {label}
                    <SortMark
                      active={sort.key === key}
                      ascending={sort.ascending}
                    />
                  </button>
                </th>
              ))}

              <th
                scope="col"
                className="whitespace-nowrap py-[8px] pl-4 pr-6 text-[12.5px] font-extrabold uppercase tracking-[.08em] text-mv-slate"
              >
                View on map
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.api}
                className="border-b border-mv-line hover:bg-[#fafbfa]"
              >
                <td className="py-[14px] pl-6 pr-4">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected.has(row.api)}
                      onChange={() => toggleRow(row.api)}
                    />
                    <Box checked={selected.has(row.api)} />
                    <span className="sr-only">Select {row.api}</span>
                  </label>
                </td>

                <td className="px-4 py-[14px]">
                  <span className="text-[13px] font-semibold text-mv-green-deep underline underline-offset-2">
                    {row.api}
                  </span>
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {row.operator}
                </td>
                <td className="px-4 py-[14px] text-[13px] font-bold text-mv-ink">
                  {row.lease}
                </td>
                <td className="px-4 py-[14px]">
                  <span className="inline-flex items-center gap-[6px] rounded-full bg-[#eef1ee] px-[10px] py-[3px] text-[12px] font-medium text-mv-slate">
                    <Dot color={TYPE_DOT[row.type]} />
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {row.status ? (
                    <span className="inline-flex items-center gap-[6px]">
                      <Dot color={STATUS_DOT[row.status]} />
                      {row.status}
                    </span>
                  ) : (
                    <span className="text-mv-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {row.county}
                </td>
                <td className="px-4 py-[14px] text-right text-[13px] tabular-nums text-mv-ink">
                  {row.boe === null ? (
                    <span className="text-mv-muted">—</span>
                  ) : (
                    row.boe.toLocaleString("en-US")
                  )}
                </td>

                <td className="py-[14px] pl-4 pr-6">
                  <button
                    type="button"
                    onClick={() => onShowOnMap(row)}
                    aria-label={`Show ${row.api} on the map`}
                    title="View on map"
                    className="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
                  >
                    <MapPin size={13} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 2}
                  className="px-6 py-10 text-center text-[13px] text-mv-muted"
                >
                  No wells match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- pager ---------------- */}
      <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-3">
        <span className="mr-2 text-[12.5px] text-mv-muted">
          {firstShown.toLocaleString("en-US")}–
          {lastShown.toLocaleString("en-US")} of{" "}
          {summary.total.toLocaleString("en-US")}
        </span>

        <PagerButton
          label="First page"
          icon={ChevronsLeft}
          disabled={safePage === 1}
          onClick={() => setPage(1)}
        />
        <PagerButton
          label="Previous page"
          icon={ChevronLeft}
          disabled={safePage === 1}
          onClick={() => setPage(Math.max(1, safePage - 1))}
        />

        {pageWindow(safePage, totalPages).map((entry, index) =>
          entry === null ? (
            <span
              key={`gap-${index}`}
              className="px-1 text-[12.5px] text-mv-muted"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              aria-current={entry === safePage ? "page" : undefined}
              onClick={() => setPage(entry)}
              className={`h-[28px] min-w-[28px] cursor-pointer rounded-lg border px-2 text-[12.5px] font-semibold ${
                entry === safePage
                  ? "border-mv-green-deep bg-mv-green-deep text-white"
                  : "border-mv-line text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <PagerButton
          label="Next page"
          icon={ChevronRight}
          disabled={safePage === totalPages}
          onClick={() => setPage(Math.min(totalPages, safePage + 1))}
        />
        <PagerButton
          label="Last page"
          icon={ChevronsRight}
          disabled={safePage === totalPages}
          onClick={() => setPage(totalPages)}
        />
      </div>
      </div>
    </div>
  );
}

/** A filter pill and the panel it opens. */
function FilterDropdown({
  label,
  options,
  searchable,
  chosen,
  open,
  onOpenChange,
  onChange,
}: {
  label: string;
  options: string[];
  searchable?: boolean;
  chosen: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: Set<string>) => void;
}) {
  const [find, setFind] = useState("");

  const visible = useMemo(() => {
    const needle = find.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [find, options]);

  function toggle(option: string) {
    const next = new Set(chosen);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange(next);
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex cursor-pointer items-center gap-[6px] rounded-full border px-[14px] py-[6px] text-[12.5px] font-semibold ${
          chosen.size
            ? "border-mv-green-deep text-mv-green-deep"
            : "border-mv-line text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
        }`}
      >
        {label}
        {chosen.size > 0 && (
          <span className="rounded-full bg-mv-green-deep px-[6px] text-[10px] font-bold text-white">
            {chosen.size}
          </span>
        )}
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[238px] rounded-xl border border-mv-line bg-white p-3 shadow-mv-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.1em] text-mv-ink">
              {label}
            </span>
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="cursor-pointer text-[11.5px] font-bold text-mv-green-deep hover:underline"
            >
              None
            </button>
          </div>

          {searchable && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-mv-line px-[10px] py-[6px]">
              <Search size={13} className="text-mv-muted" aria-hidden="true" />
              <input
                type="search"
                value={find}
                onChange={(event) => setFind(event.target.value)}
                placeholder="Find…"
                aria-label={`Find in ${label}`}
                className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] leading-tight text-mv-slate outline-none placeholder:text-mv-muted"
              />
            </div>
          )}

          <div className="max-h-[232px] overflow-y-auto">
            {visible.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 py-[5px]"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={chosen.has(option)}
                  onChange={() => toggle(option)}
                />
                <Box checked={chosen.has(option)} />
                <span className="flex-1 truncate text-[12.5px] text-mv-ink">
                  {option}
                </span>
              </label>
            ))}

            {visible.length === 0 && (
              <p className="py-2 text-[12px] text-mv-muted">Nothing matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_DOT: Record<WellRow["type"], string> = {
  Oil: "#3f9d76",
  Gas: "#d1584f",
  Injection: "#4a7fbf",
};

const STATUS_DOT: Record<string, string> = {
  Producing: "#3f9d76",
  "Shut-In Producer": "#d9a441",
  Inactive: "#9ca3af",
};

/** Lucide has no plain grid-table glyph that matches; this is the mock's. */
function TableIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MapIcon | typeof TableIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-[6px] rounded-lg px-3 py-[6px] text-[13px] font-semibold ${
        active
          ? "bg-mv-green-deep text-white"
          : "text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

const TINTS = {
  green: "bg-[#e6f6ee] text-mv-green-deep",
  red: "bg-[#fdecea] text-[#c0453c]",
  amber: "bg-mv-amber-bg text-mv-amber",
  blue: "bg-mv-blue-bg text-mv-blue",
  purple: "bg-[#f0ecfd] text-[#6d43c8]",
} as const;

function SummaryCard({
  icon: Icon,
  tint,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  tint: keyof typeof TINTS;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-white px-6 py-[13px]">
      <span
        aria-hidden="true"
        className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg ${TINTS[tint]}`}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[11.5px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-muted">
          {label}
        </div>
        {/* Value and note share a line — there is room to the right of the
            number, and stacking them cost a row of height for nothing. */}
        <div className="mt-[6px] flex flex-wrap items-baseline gap-x-2 gap-y-[3px]">
          <span className="text-[21px] font-bold leading-none text-mv-ink">
            {value.toLocaleString("en-US")}
          </span>
          <span className="text-[11.5px] leading-none text-mv-muted">
            {note}
          </span>
        </div>
      </div>
    </div>
  );
}

function SortMark({
  active,
  ascending,
}: {
  active: boolean;
  ascending: boolean;
}) {
  if (!active) {
    return (
      <ChevronsUpDown size={11} className="text-mv-muted" aria-hidden="true" />
    );
  }
  return ascending ? (
    <ChevronUp size={11} aria-hidden="true" />
  ) : (
    <ChevronDown size={11} aria-hidden="true" />
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border ${
        checked
          ? "border-mv-green-deep bg-mv-green-deep text-white"
          : "border-[#c7cbd1] bg-white"
      }`}
    >
      {checked && <Check size={11} strokeWidth={3.5} />}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-[6px] w-[6px] shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

function PagerButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-[28px] w-[28px] place-items-center rounded-lg border border-mv-line text-mv-slate enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:opacity-40"
    >
      <Icon size={14} aria-hidden="true" />
    </button>
  );
}

/** `1 2 3 4 5 … 900`, sliding with the current page. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const window: (number | null)[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));

  for (let index = 0; index < 5 && start + index <= totalPages; index++) {
    window.push(start + index);
  }
  if (start + 5 <= totalPages) {
    if (start + 5 < totalPages) window.push(null);
    window.push(totalPages);
  }
  return window;
}
