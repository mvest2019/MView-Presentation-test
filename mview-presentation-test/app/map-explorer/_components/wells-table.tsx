"use client";

import {
  Activity,
  ArrowLeft,
  Check,
  CircleCheck,
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
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  EMPTY_PRODUCTION,
  ProductionFilter,
  productionCount,
  type ProductionRange,
} from "./production-filter";

import {
  getTableMap,
  type MapTableRow,
  type MapTableSummary,
} from "@/lib/map-api";

import {
  COUNTIES,
  OPERATORS,
  PER_PAGE,
  WELL_STATUSES,
  WELL_TYPES,
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
 * Export full list is the only control still inert.
 */

type SortKey = keyof Pick<
  WellRow,
  | "api"
  | "operator"
  | "lease"
  | "type"
  | "status"
  | "county"
  | "oil"
  | "gas"
>;

type ViewTab = "map" | "table" | "insights";

/** The four dropdown facets, each a set of chosen values. */
type FacetKey = "operator" | "type" | "status" | "county";

type Facets = Record<FacetKey, Set<string>>;

type WellsTableProps = {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onShowOnMap: (row: MapTableRow) => void;
};

/**
 * Widths are shares of the table. Left to `table-layout: auto` the slack all
 * lands on one column — whichever holds the longest string — which opens a
 * canyon between County and Reported BOE.
 *
 * On a wide screen the table has several hundred pixels more than its content
 * needs, and that slack has to land somewhere. Concentrating it in any one
 * column opens a visible canyon — Lease at 28% did exactly that. These shares
 * track each column's real content width instead, so the surplus is spread as
 * an even gutter between every pair of columns rather than a hole after one.
 */
const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "right";
  width: string;
  /** Columns the server will not order by, so the header is plain text. */
  sortable?: boolean;
}[] = [
  { key: "api", label: "API", width: "w-[11%]", sortable: false },
  { key: "operator", label: "Operator", width: "w-[15%]" },
  { key: "lease", label: "Lease", width: "w-[17%]" },
  { key: "type", label: "Type", width: "w-[11%]", sortable: false },
  { key: "status", label: "Status", width: "w-[13%]", sortable: false },
  { key: "county", label: "County", width: "w-[11%]" },
  { key: "oil", label: "Oil (bbl)", align: "right", width: "w-[11%]" },
  { key: "gas", label: "Gas (mcf)", align: "right", width: "w-[11%]" },
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
  /*
   * Two copies: what is ticked, and what the rows are actually for.
   *
   * The endpoint is slow enough that filtering on every tick meant a request
   * per checkbox, each one replacing the last. Apply commits the draft; until
   * then the table keeps showing what it already had.
   */
  const [facets, setFacets] = useState<Facets>(emptyFacets);
  const [appliedFacets, setAppliedFacets] = useState<Facets>(emptyFacets);
  const [production, setProduction] = useState<ProductionRange>(EMPTY_PRODUCTION);
  const [appliedProduction, setAppliedProduction] =
    useState<ProductionRange>(EMPTY_PRODUCTION);
  const [productionOpen, setProductionOpen] = useState(false);
  const [openFacet, setOpenFacet] = useState<FacetKey | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close an open dropdown on an outside click, as the map overlays do.
  useEffect(() => {
    if (!openFacet && !productionOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!filterBarRef.current?.contains(event.target as Node)) {
        setOpenFacet(null);
        setProductionOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenFacet(null);
        setProductionOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openFacet, productionOpen]);

  /*
   * The rows come from the server, a page at a time.
   *
   * 1.1M wells: the page, the sort, the search and the facets are all part of
   * the request rather than something to do in the browser over a downloaded
   * copy. The summary comes back with them, already totalled over the whole
   * result set rather than over the twenty-five rows on screen.
   */
  const [rows, setRows] = useState<MapTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<MapTableSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Debounced, or every keystroke in the search box is a page of wells.
    const timer = setTimeout(() => {
      setLoading(true);

      getTableMap({
        page,
        pageSize: PER_PAGE,
        sort: sort.key,
        dir: sort.ascending ? "asc" : "desc",
        q: query,
        filters: {
          county: [...appliedFacets.county],
          wtype: [...appliedFacets.type],
          status: [...appliedFacets.status],
        },
        ranges: {
          producedOilMin: appliedProduction.oilMin,
          producedOilMax: appliedProduction.oilMax,
          producedGasMin: appliedProduction.gasMin,
          producedGasMax: appliedProduction.gasMax,
        },
      })
        .then((result) => {
          if (cancelled) return;
          setRows(result.rows);
          setTotal(result.total);
          setTotalPages(Math.max(1, result.totalPages));
          setSummary(result.summary);
          setError(null);
        })
        .catch((failure: unknown) => {
          if (cancelled) return;
          setRows([]);
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load the table.",
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, query ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, sort, query, appliedFacets, appliedProduction]);

  const safePage = Math.min(page, totalPages);
  const firstShown = total ? (safePage - 1) * PER_PAGE + 1 : 0;
  const lastShown = Math.min(safePage * PER_PAGE, total);

  const chips = [
    ...FACETS.flatMap(({ key, label }) =>
      [...facets[key]].map((value) => ({ key, label, value })),
    ),
  ];

  function updateFacet(key: FacetKey, next: Set<string>) {
    setFacets((current) => ({ ...current, [key]: next }));
    setPage(1);
  }

  function removeChip(chip: (typeof chips)[number]) {
    const next = new Set(facets[chip.key]);
    next.delete(chip.value);
    updateFacet(chip.key, next);
    setPage(1);
  }

  function clearAll() {
    setFacets(emptyFacets());
    setAppliedFacets(emptyFacets());
    setProduction(EMPTY_PRODUCTION);
    setAppliedProduction(EMPTY_PRODUCTION);
    setQuery("");
    setPage(1);
  }

  function applyFacets() {
    setAppliedFacets(facets);
    setAppliedProduction(production);
    setPage(1);
  }

  /** A stable spelling of a selection, for telling draft from applied. */
  const spell = (of: Facets) =>
    FACETS.map(({ key }) => [...of[key]].sort().join("|")).join("§");

  const pending =
    spell(facets) !== spell(appliedFacets) ||
    JSON.stringify(production) !== JSON.stringify(appliedProduction);
  const anyFilter =
    chips.length > 0 ||
    productionCount(appliedProduction) > 0 ||
    appliedFacets.county.size > 0;

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, ascending: !current.ascending }
        : { key, ascending: true },
    );
    setPage(1);
  }

  return (
    /* Two cards on the page background, not one flat sheet: the result header
       and its summary in the first, the grid and its pager in the second. */
    <div className="absolute inset-0 z-40 overflow-y-auto bg-mv-bg p-3 lg:p-4">
      {/* No `overflow-hidden` here — the filter dropdowns open past the card's
          bottom edge and it would slice them off. The summary strip rounds its
          own bottom corners instead, which is all the clipping was for. */}
      <div className="rounded-xl border border-mv-line bg-white">
      {/* ---------------- heading ----------------
          Back sits on the heading's own row rather than a row of its own: the
          table fills the screen, so the map is otherwise only reachable from
          the view switch on the far right, but a 116px button does not earn a
          full-width band when this row already has ~880px going spare. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 lg:px-6 lg:pt-5">
        <button
          type="button"
          onClick={() => onTabChange("map")}
          className="inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg border border-mv-line px-3 py-[6px] text-[12.5px] font-semibold text-mv-green-deep hover:border-mv-green-deep hover:bg-[#f2f8f5]"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to map
        </button>

        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-mv-line" />

        {/* A title, not a tally: the count already appears in the line below
            and again in the summary strip, and "match your search" claimed a
            search that has usually not happened. */}
        <h2 className="text-[16px] font-bold leading-tight text-mv-ink lg:text-[19px] lg:leading-none">
          Well results
        </h2>

        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:ml-auto lg:w-auto lg:flex-nowrap lg:pl-2">
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-mv-line bg-white p-1 lg:flex-none lg:justify-start">
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
            className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-mv-line px-[14px] py-[8px] text-[12.5px] font-semibold text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep lg:w-auto"
          >
            <Download size={14} aria-hidden="true" />
            Export full list
          </button>
        </div>
      </div>

      {/* ---------------- controls ----------------
          One row: `nowrap` plus a scroller rather than `flex-wrap`, which
          collapsed this into a three-line block on a narrow viewport. */}
      <div
        ref={filterBarRef}
        className="flex flex-wrap items-center gap-2 px-4 py-3 lg:flex-nowrap lg:px-6 lg:py-4"
      >
        <div className="flex w-full items-center gap-2 rounded-lg border border-mv-line px-3 py-[7px] lg:w-auto lg:shrink-0">
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
            className="w-full min-w-0 border-0 bg-transparent text-[12.5px] leading-tight text-mv-ink outline-none placeholder:text-mv-muted lg:w-[172px]"
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
            disabled={loading}
            onOpenChange={(next) => {
              setOpenFacet(next ? facet.key : null);
              if (next) setProductionOpen(false);
            }}
            onChange={(next) => updateFacet(facet.key, next)}
          />
        ))}

        <ProductionFilter
          range={production}
          open={productionOpen}
          disabled={loading}
          onOpenChange={(next) => {
            setProductionOpen(next);
            if (next) setOpenFacet(null);
          }}
          onChange={setProduction}
        />

        {/* Apply and Clear at the end of the row, where the space is. */}
        <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
          <button
            type="button"
            onClick={clearAll}
            disabled={loading || (!pending && !anyFilter)}
            className="rounded-lg border border-mv-line px-[13px] py-[7px] text-[12.5px] font-semibold text-mv-slate enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={applyFacets}
            disabled={loading || !pending}
            className="rounded-lg px-[13px] py-[7px] text-[12.5px] font-bold enabled:cursor-pointer enabled:bg-mv-green-deep enabled:text-white enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#eef1ee] disabled:text-mv-muted"
          >
            Apply filters
          </button>
        </div>

      </div>

      {/* ---------------- applied filters ---------------- */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 lg:px-6 lg:pb-4">
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
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t border-mv-line bg-mv-line md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon={FlaskConical}
          tint="green"
          label="Total wells"
          value={summary?.totalWells ?? 0}
          note="Across this result set"
        />
        <SummaryCard
          icon={Activity}
          tint="green"
          label="Oil wells"
          value={summary?.oilWells ?? 0}
          note={`${summary?.oilPct ?? 0}%`}
        />
        <SummaryCard
          icon={Droplet}
          tint="red"
          label="Gas wells"
          value={summary?.gasWells ?? 0}
          note={`${summary?.gasPct ?? 0}%`}
        />
        <SummaryCard
          icon={CircleCheck}
          tint="green"
          label="Active wells"
          value={summary?.activeWells ?? 0}
          note={`${summary?.activePct ?? 0}%`}
        />
        <SummaryCard
          icon={Layers}
          tint="blue"
          label="Unique operators"
          value={summary?.operators ?? 0}
          note="Across this result set"
        />
        <SummaryCard
          icon={MapIcon}
          tint="purple"
          label="Counties"
          value={summary?.counties ?? 0}
          note="Across this result set"
        />
      </div>

      </div>

      {/* ---------------- table ---------------- */}
      <div className="relative mt-4 overflow-hidden rounded-xl border border-mv-line bg-white">
      {/* Over the dimmed rows, not instead of them: dimming alone reads as a
          disabled table, and says nothing about how long it will be. */}
      {loading && rows.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <span className="flex items-center gap-[10px] rounded-full border border-mv-line bg-white px-[16px] py-[9px] shadow-mv-lg">
            <span
              aria-hidden="true"
              className="h-[14px] w-[14px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
            />
            <span className="text-[12.5px] font-semibold leading-none text-mv-slate">
              Loading wells…
            </span>
          </span>
        </div>
      )}

      <div className="mv-thin-scroll overflow-x-auto">
        <table className="w-full min-w-[1160px] border-collapse text-left">
          <thead>
            <tr className="border-b border-mv-line bg-[#f8f9fa]">
              {/* The first and last cells carry the page's 24px gutter, so the
                  grid lines up with the heading above it. */}
              {COLUMNS.map(({ key, label, align, width, sortable }, index) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sortable === false
                      ? undefined
                      : sort.key === key
                        ? sort.ascending
                          ? "ascending"
                          : "descending"
                        : "none"
                  }
                  className={`whitespace-nowrap py-[8px] ${
                    index === 0 ? "pl-6 pr-4" : "px-4"
                  } ${width} ${align === "right" ? "text-right" : ""}`}
                >
                  {sortable === false ? (
                    <span className="inline-flex whitespace-nowrap text-[12.5px] font-extrabold uppercase tracking-[.08em] text-mv-slate">
                      {label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => toggleSort(key)}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-extrabold uppercase tracking-[.08em] text-mv-slate enabled:cursor-pointer enabled:hover:text-mv-green-deep disabled:cursor-wait"
                    >
                      {label}
                      <SortMark
                        active={sort.key === key}
                        ascending={sort.ascending}
                      />
                    </button>
                  )}
                </th>
              ))}

              <th
                scope="col"
                className="whitespace-nowrap py-[8px] pl-4 pr-6 text-center text-[12.5px] font-extrabold uppercase tracking-[.08em] text-mv-slate"
              >
                View on map
              </th>
            </tr>
          </thead>

          <tbody className={loading && rows.length > 0 ? "opacity-50" : ""}>
            {rows.map((row) => (
              <tr
                key={row.api}
                className="border-b border-mv-line hover:bg-[#fafbfa]"
              >
                <td className="py-[14px] pl-6 pr-4">
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
                    <Dot color={TYPE_DOT[row.wtype] ?? DOT_GREY} />
                    {row.wtype}
                  </span>
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {row.status ? (
                    <span className="inline-flex items-center gap-[6px]">
                      <Dot color={STATUS_DOT[row.status] ?? DOT_GREY} />
                      {row.status}
                    </span>
                  ) : (
                    <span className="text-mv-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {row.county}
                </td>
                <Volume value={row.producedOil} />
                <Volume value={row.producedGas} />
                <td className="py-[14px] pl-4 pr-6">
                  <button
                    type="button"
                    onClick={() => onShowOnMap(row)}
                    aria-label={`Show ${row.api} on the map`}
                    title="View on map"
                    className="mx-auto grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
                  >
                    <MapPin size={13} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                {/* Tall and centred: with no rows the card collapsed to a
                    strip and the spinner sat under the header with the page
                    empty beneath it. The height holds the card open so the
                    table does not jump when the rows arrive. */}
                <td
                  colSpan={COLUMNS.length + 1}
                  className="h-[52vh] px-6 text-center align-middle text-[13px] text-mv-muted"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-[10px] text-[15px] font-semibold text-mv-slate">
                      <span
                        aria-hidden="true"
                        className="h-[22px] w-[22px] animate-spin rounded-full border-[3px] border-mv-line border-t-mv-green-deep"
                      />
                      Loading wells…
                    </span>
                  ) : (
                    (error ?? "No wells match these filters.")
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- pager ---------------- */}
      <div
        className={`flex flex-col items-center gap-2 px-4 py-3 lg:flex-row lg:flex-wrap lg:justify-end lg:px-6 ${
          loading && rows.length === 0 ? "invisible" : ""
        }`}
      >
        <span className="text-[12.5px] text-mv-muted lg:mr-2">
          {firstShown.toLocaleString("en-US")}–
          {lastShown.toLocaleString("en-US")} of{" "}
          {total.toLocaleString("en-US")}
        </span>

        <div className="flex flex-wrap items-center justify-center gap-[6px] lg:contents">
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
                disabled={loading}
                aria-current={entry === safePage ? "page" : undefined}
                onClick={() => setPage(entry)}
                /* A phone fits one row of pager controls, not two, so below
                   lg the window narrows to the current page and its nearest
                   neighbours — the ends and the ellipses stay, since they are
                   what makes the gap readable as a gap. */
                className={`h-[28px] min-w-[28px] cursor-pointer rounded-lg border px-2 text-[12.5px] font-semibold ${
                  entry === 1 ||
                  entry === totalPages ||
                  Math.abs(entry - safePage) <= 2
                    ? ""
                    : "hidden lg:inline-block"
                } ${
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
  disabled,
  onOpenChange,
  onChange,
}: {
  label: string;
  options: string[];
  searchable?: boolean;
  chosen: Set<string>;
  open: boolean;
  /** Shut while a request is out — a second filter would race the first. */
  disabled?: boolean;
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
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex items-center gap-[6px] rounded-full border px-[14px] py-[6px] text-[12.5px] font-semibold enabled:cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
          chosen.size
            ? "border-mv-green-deep text-mv-green-deep"
            : "border-mv-line text-mv-slate enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep"
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

/** Anything the API reports that is not listed here falls back to grey. */
const DOT_GREY = "#9ca3af";

const TYPE_DOT: Record<string, string> = {
  Oil: "#3f9d76",
  Gas: "#d1584f",
  "Oil or Gas": "#b45309",
  Injection: "#4a7fbf",
};

const STATUS_DOT: Record<string, string> = {
  Producing: "#3f9d76",
  "Shut-In": "#d9a441",
  "Shut-In Producer": "#d9a441",
  Plugged: "#9ca3af",
  Service: "#4a7fbf",
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
    <div className="flex items-start gap-2 bg-white px-3 py-[11px] lg:gap-3 lg:px-6 lg:py-[13px]">
      <span
        aria-hidden="true"
        className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg ${TINTS[tint]}`}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-extrabold uppercase leading-[1.2] tracking-[.08em] text-mv-muted lg:text-[11.5px]">
          {label}
        </div>
        {/* Value and note share a line — there is room to the right of the
            number, and stacking them cost a row of height for nothing. */}
        <div className="mt-[6px] flex flex-wrap items-baseline gap-x-2 gap-y-[3px]">
          <span className="text-[18px] font-bold leading-none text-mv-ink lg:text-[21px]">
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

/** A reported volume, or a dash where nothing was filed. */
function Volume({ value }: { value: number | null }) {
  return (
    <td className="px-4 py-[14px] text-right text-[13px] tabular-nums text-mv-ink">
      {value === null ? (
        <span className="text-mv-muted">—</span>
      ) : (
        value.toLocaleString("en-US")
      )}
    </td>
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
