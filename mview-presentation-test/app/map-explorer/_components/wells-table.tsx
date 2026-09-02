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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MapToast } from "./map-toast";
import { usePanelPlacement } from "./panel-placement";
import { downloadSheet, type SheetColumn } from "./xlsx";
import { TableSearch, type SearchPick } from "./table-search";

import {
  EMPTY_PRODUCTION,
  ProductionFilter,
  productionCount,
  productionProblem,
  type ProductionRange,
} from "./production-filter";

import {
  getCountyListMap,
  nextOffset,
  getOperatorListMap,
  getTableMap,
  getWellStatusListMap,
  getWellTypeListMap,
  type MapFilterItem,
  type MapTableRow,
  type MapTableSummary,
} from "@/lib/map-api";

/*
 * The Table view — the result set behind the map, as a grid.
 *
 * Every part of it is the server's: the rows, the dropdown options, the counts
 * in the summary strip, the page count. 1.1M wells is not something to hold in
 * the browser, so the page, the sort, the search and the filters are all part
 * of the request, and the summary comes back totalled over the whole result
 * set rather than over the rows on screen.
 *
 * Export full list is the only control still inert.
 */

/**
 * Adds the picked search result to whichever facet it filters on.
 *
 * An API number is not a facet — it goes out as `q` — so it is left alone here.
 */
function withPick(
  filters: Record<string, string[]>,
  pick: SearchPick | null,
): Record<string, string[]> {
  if (!pick || pick.facet === "q") return filters;

  const existing = filters[pick.facet] ?? [];
  return {
    ...filters,
    [pick.facet]: existing.includes(pick.param)
      ? existing
      : [...existing, pick.param],
  };
}

/** How wide a facet dropdown's panel is, for keeping it on the page. */
const PANEL_WIDTH = 238;

/** How close to the end of a paged list counts as having reached it. */
const PANEL_NEAR_END = 40;

/** What an exported cell says where the record says nothing. */
const NOTHING_MARK = "-";

/** Rows per page — the `pageSize` the table asks for. */
const PER_PAGE = 10;

/** The columns a header can order by — the endpoint's own list. */
type SortKey =
  | "api"
  | "operator"
  | "lease"
  | "type"
  | "status"
  | "county"
  | "oil"
  | "gas";

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
  { key: "api", label: "API", width: "w-[10%]", sortable: false },
  { key: "operator", label: "Operator", width: "w-[13%]" },
  { key: "lease", label: "Lease", width: "w-[15%]" },
  /* The widest of the short columns: its values are phrases — "Injection /
     Disposal from Oil" — and at the old width every one of them wrapped to
     three lines, which set the height of the row it was in. */
  { key: "type", label: "Type", width: "w-[15%]", sortable: false },
  { key: "status", label: "Status", width: "w-[12%]", sortable: false },
  { key: "county", label: "County", width: "w-[10%]" },
  {
    key: "oil",
    label: "Producing Oil (bbl)",
    align: "right",
    width: "w-[12%]",
  },
  {
    key: "gas",
    label: "Producing Gas (mcf)",
    align: "right",
    width: "w-[12%]",
  },
];

/*
 * The four dropdowns. Their options come from the facet endpoints, not from
 * this file — a hardcoded list can only ever disagree with the data, and the
 * operator one did: it offered names the endpoint had never heard of.
 */
const FACETS: {
  key: FacetKey;
  label: string;
  searchable?: boolean;
}[] = [
  { key: "operator", label: "Operator", searchable: true },
  { key: "type", label: "Well type" },
  { key: "status", label: "Status" },
  { key: "county", label: "County", searchable: true },
];

/*
 * The column key as the endpoint spells it.
 *
 * Two of ours are not its names — the Oil and Gas columns are `producedOil`
 * and `producedGas` — and sending "oil" was rejected outright with a 400,
 * which is what "Failed to fetch the table" was reporting.
 */
const SORT_PARAM: Record<string, string> = {
  oil: "producedOil",
  gas: "producedGas",
  type: "wtype",
};

/*
 * The words the service uses for "nothing".
 *
 * It does not send an absent field: it sends a string. "Null" in the lease and
 * type columns, "NAN" in county, "Unknown" in operator — all of them printed
 * as though they were the value, so a well appeared to be operated by Unknown
 * in the county of NAN.
 */
const NOTHING = new Set(["null", "nan", "n/a", "na", "unknown", "-", "--"]);

/** Whether a field the service sent actually holds anything. */
function missing(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const text = value.trim();
  return text === "" || NOTHING.has(text.toLowerCase());
}

/** The same field, as the table shows it. */
function shown(value: string | null | undefined): string {
  return missing(value) ? "N/A" : value!.trim();
}

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
  /*
   * Null until a column is clicked, and then not sent at all — the endpoint
   * has its own default order, and sending `sort=api` unasked made the request
   * look like it carried an API filter.
   */
  const [sort, setSort] = useState<{
    key: SortKey;
    ascending: boolean;
  } | null>(null);
  /*
   * What the search box picked: a county, an operator or a lease, already
   * carrying the parameter it filters on. A draft like the pills: the box
   * shows the choice, and Apply is what sends it.
   */
  const [picked, setPicked] = useState<SearchPick | null>(null);
  const [appliedPicked, setAppliedPicked] = useState<SearchPick | null>(null);
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
  /*
   * The options behind each dropdown, from the facet endpoints. Fetched once,
   * together: four small lists, and the table is unusable without any of them.
   */
  const [facetItems, setFacetItems] = useState<Record<FacetKey, MapFilterItem[]>>({
    operator: [],
    type: [],
    status: [],
    county: [],
  });
  /*
   * The operator facet alone is paged — there are tens of thousands of them,
   * where the other three are lists a dropdown can hold. Its next page is
   * asked for when the reader reaches the end of what is loaded.
   */
  const [operatorTotal, setOperatorTotal] = useState(0);
  const [operatorMore, setOperatorMore] = useState(false);
  const operatorDone = useRef(false);

  const loadMoreOperators = useCallback(() => {
    if (operatorMore || operatorDone.current) return;

    const loaded = facetItems.operator.length;
    if (loaded === 0) return;
    if (operatorTotal > 0 && loaded >= operatorTotal) return;

    setOperatorMore(true);
    getOperatorListMap({ offset: nextOffset(loaded) })
      .then((page) => {
        setOperatorTotal(page.total);
        setFacetItems((current) => {
          const seen = new Set(
            current.operator.map((item) => item.id ?? item.value),
          );
          const fresh = page.items.filter(
            (item) => !seen.has(item.id ?? item.value),
          );
          /* Nothing new means there is no more to be had. */
          if (fresh.length === 0) {
            operatorDone.current = true;
            return current;
          }
          return { ...current, operator: [...current.operator, ...fresh] };
        });
      })
      .catch(() => {
        /* What is loaded stands, and the next scroll asks again. */
      })
      .finally(() => setOperatorMore(false));
  }, [facetItems.operator, operatorMore, operatorTotal]);
  /*
   * Whether those four are still on their way.
   *
   * Without it an empty list is ambiguous: it is either a facet whose request
   * has not landed or one whose search matched nothing, and the menu said the
   * second about both.
   */
  const [facetsLoading, setFacetsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      /* The operator facet is paged. The size of a page is the service's to
         say — see `OPERATOR_PAGE_SIZE` — and the rest arrive as the reader
         scrolls the dropdown. */
      getOperatorListMap()
        .then((page) => {
          setOperatorTotal(page.total);
          return page.items;
        })
        .catch(() => [] as MapFilterItem[]),
      getWellTypeListMap().catch(() => [] as MapFilterItem[]),
      getWellStatusListMap().catch(() => [] as MapFilterItem[]),
      getCountyListMap().catch(() => [] as MapFilterItem[]),
    ]).then(([operator, type, status, county]) => {
      // One failing leaves its dropdown empty; the others still work.
      if (cancelled) return;
      setFacetItems({ operator, type, status, county });
      setFacetsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Operator filters by id, so its names have to be translated back. */
  const operatorIds = useMemo(
    () =>
      new Map(facetItems.operator.map((item) => [item.value, item.id ?? ""])),
    [facetItems],
  );
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

  /**
   * The confirmation over the table, and whether the next answer earns one.
   *
   * The rows reload for all sorts of reasons — a page turn, a sort, the first
   * paint — and only a filter the reader applied deserves saying out loud. The
   * flag is set by Apply and by Clear, and spent by whichever answer arrives
   * next.
   */
  const [toast, setToast] = useState<string | null>(null);
  const announceRef = useRef<"applied" | "cleared" | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<MapTableSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);

      getTableMap({
        page,
        pageSize: PER_PAGE,
        sort: sort ? (SORT_PARAM[sort.key] ?? sort.key) : undefined,
        dir: sort ? (sort.ascending ? "asc" : "desc") : undefined,
        // An API number is a free-text match, not one of the facets.
        q: appliedPicked?.facet === "q" ? appliedPicked.param : undefined,
        /*
         * Built, not spread. The picked search result was written first and
         * then overwritten by the dropdown's own key for that facet — pick a
         * county and the `county:` line below replaced it with the empty list,
         * so the filter never left the browser. Merging keeps both.
         */
        filters: withPick(
          {
            // Operators go by id; everything else by name.
            operator: [...appliedFacets.operator]
              .map((name) => operatorIds.get(name) ?? "")
              .filter(Boolean),
            county: [...appliedFacets.county],
            wtype: [...appliedFacets.type],
            status: [...appliedFacets.status],
          },
          appliedPicked,
        ),
        // Both ends or neither: a lone bound is not a range.
        ranges: {
          ...(appliedProduction.oilMin && appliedProduction.oilMax
            ? {
                producedOilMin: appliedProduction.oilMin,
                producedOilMax: appliedProduction.oilMax,
              }
            : {}),
          ...(appliedProduction.gasMin && appliedProduction.gasMax
            ? {
                producedGasMin: appliedProduction.gasMin,
                producedGasMax: appliedProduction.gasMax,
              }
            : {}),
        },
      })
        .then((result) => {
          if (cancelled) return;
          setRows(result.rows);
          setTotal(result.total);

          const announce = announceRef.current;
          if (announce) {
            announceRef.current = null;
            setToast(
              announce === "cleared"
                ? "Filters cleared"
                : result.total === 0
                  ? "Filters applied — no wells match"
                  : `Filters applied — ${result.total.toLocaleString("en-US")} well${result.total === 1 ? "" : "s"}`,
            );
          }
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
      // No debounce: every input here is a deliberate choice — a page, a
      // sort, a picked search result — not a keystroke.
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, sort, appliedPicked, appliedFacets, appliedProduction, operatorIds]);

  const safePage = Math.min(page, totalPages);
  const firstShown = total ? (safePage - 1) * PER_PAGE + 1 : 0;
  const lastShown = Math.min(safePage * PER_PAGE, total);

  /*
   * What the table is filtered by — the applied set, never the draft.
   *
   * Built from `facets`, a chip appeared the moment a box was ticked, under a
   * heading reading "Applied", above rows that were still unfiltered and
   * beside a button offering to apply the very thing the chip said was
   * already on. Ticking is a draft; this row is what Apply made of it.
   */
  const chips = [
    ...FACETS.flatMap(({ key, label }) =>
      [...appliedFacets[key]].map((value) => ({ key, label, value })),
    ),
  ];

  /*
   * The production ranges as chips too.
   *
   * They filter the rows exactly as the dropdown facets do, and leaving them
   * out of this row meant a table narrowed to wells making 1–10 bbl that said
   * only "County ANDREWS" above it. A range needs both ends to be a range, so
   * a half-filled pair shows nothing — the same rule the pill's badge counts by.
   *
   * From the applied ranges, for the same reason the chips above are.
   */
  const rangeChips = [
    {
      stream: "oil" as const,
      label: "Producing oil",
      /* As the column heading and the record write it. */
      unit: "BBL",
      min: appliedProduction.oilMin,
      max: appliedProduction.oilMax,
    },
    {
      stream: "gas" as const,
      label: "Producing gas",
      unit: "MCF",
      min: appliedProduction.gasMin,
      max: appliedProduction.gasMax,
    },
  ].filter(({ min, max }) => min.trim() !== "" && max.trim() !== "");

  /*
   * Ticking a box is a draft, so the page it is on does not move.
   *
   * Resetting to page 1 here sent a request for page 1 of the *old* filters —
   * the rows changed under a selection that had not been applied yet, and the
   * page the reader was on was lost before they pressed Apply. Apply is where
   * the page goes back to 1, because that is where the result set changes.
   */
  function updateFacet(key: FacetKey, next: Set<string>) {
    setFacets((current) => ({ ...current, [key]: next }));
  }

  /*
   * Taking a chip off drops that value from the applied set as well as the
   * draft, and reloads. The chips are what is *on* the table — leaving the
   * rows filtered by something no longer listed is the disagreement the chips
   * exist to prevent.
   */
  function removeChip(chip: (typeof chips)[number]) {
    const next = new Set(facets[chip.key]);
    next.delete(chip.value);

    setFacets((current) => ({ ...current, [chip.key]: next }));
    setAppliedFacets((current) => {
      const applied = new Set(current[chip.key]);
      applied.delete(chip.value);
      return { ...current, [chip.key]: applied };
    });
    setPage(1);
  }

  /** Drops one stream's range from the draft and from the applied set. */
  function removeRange(stream: "oil" | "gas") {
    const blank =
      stream === "oil"
        ? { oilMin: "", oilMax: "" }
        : { gasMin: "", gasMax: "" };

    setProduction((current) => ({ ...current, ...blank }));
    setAppliedProduction((current) => ({ ...current, ...blank }));
    setPage(1);
  }

  function clearAll() {
    announceRef.current = "cleared";
    setFacets(emptyFacets());
    setAppliedFacets(emptyFacets());
    setProduction(EMPTY_PRODUCTION);
    setAppliedProduction(EMPTY_PRODUCTION);
    setPicked(null);
    setAppliedPicked(null);
    setPage(1);
  }

  function applyFacets() {
    announceRef.current = "applied";
    // Applying is the end of choosing: whatever panel is open has served its
    // purpose, and leaving it up covers the rows it was just used to filter.
    setOpenFacet(null);
    setProductionOpen(false);
    setAppliedFacets(facets);
    setAppliedProduction(production);
    setAppliedPicked(picked);
    setPage(1);
  }

  /** A stable spelling of a selection, for telling draft from applied. */
  const spell = (of: Facets) =>
    FACETS.map(({ key }) => [...of[key]].sort().join("|")).join("§");

  const pending =
    spell(facets) !== spell(appliedFacets) ||
    JSON.stringify(production) !== JSON.stringify(appliedProduction) ||
    (picked?.param ?? "") !== (appliedPicked?.param ?? "");
  /* What Apply would send, counted: every ticked value, a production range,
     and whatever the search box is holding. */
  const draftCount =
    FACETS.reduce((total, { key }) => total + facets[key].size, 0) +
    productionCount(production) +
    (picked ? 1 : 0);

  const anyFilter =
    appliedPicked !== null ||
    picked !== null ||
    chips.length > 0 ||
    productionCount(appliedProduction) > 0 ||
    appliedFacets.county.size > 0;

  /*
   * The rows on screen, as a file.
   *
   * This page only — the whole result set is over a million wells and the
   * endpoint pages at ten, so "the full list" would be a hundred thousand
   * requests. The button says so, and so does its tooltip.
   */
  function exportPage() {
    if (rows.length === 0) return;

    /*
     * The same headings the table shows, in the same order, and each column
     * told what it holds — so the figures arrive as figures, right-ranged
     * with separators, and the dash for a well with none lines up under
     * them instead of ranging left as text does.
     */
    const columns: SheetColumn[] = [
      { head: "API", width: 15 },
      { head: "Operator", width: 34 },
      { head: "Lease", width: 30 },
      { head: "Type", width: 24 },
      { head: "Status", width: 15 },
      { head: "County", width: 16 },
      { head: "Producing Oil (bbl)", width: 19, format: "number" },
      { head: "Producing Gas (mcf)", width: 19, format: "number" },
    ];

    /* A dash where the record says nothing, the same mark the table shows:
       an empty cell reads as a column nobody filled in. Sums are unaffected
       — a spreadsheet skips text when it adds a column up. */
    downloadSheet(
      `mineral-view-wells-page-${safePage}.xlsx`,
      "Wells",
      columns,
      rows.map((row) => [
        row.api,
        missing(row.operator) ? NOTHING_MARK : row.operator,
        missing(row.lease) ? NOTHING_MARK : row.lease,
        missing(row.wtype) ? NOTHING_MARK : row.wtype,
        missing(row.status) ? NOTHING_MARK : row.status,
        missing(row.county) ? NOTHING_MARK : row.county,
        row.producedOil ?? NOTHING_MARK,
        row.producedGas ?? NOTHING_MARK,
      ]),
    );
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key === key
        ? { key, ascending: !current.ascending }
        : { key, ascending: true },
    );
    setPage(1);
  }

  return (
    /* Two cards on the page background, not one flat sheet: the result header
       and its summary in the first, the grid and its pager in the second. */
    <div className="absolute inset-0 z-40 overflow-y-auto bg-mv-bg p-3 lg:p-4">
      {/* Said over the table for the same reason it is said over the map: a
          filter changes what is on screen somewhere the eye is not. */}
      {toast && (
        <MapToast key={toast} message={toast} onDone={() => setToast(null)} />
      )}

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

        {/* Narrow: the icon at the end of this row, where there is room going
            spare and the eye already is. The labelled button below takes over
            at `lg`, beside the view switch. */}
        <ExportButton
          compact
          className="ml-auto lg:hidden"
          onClick={exportPage}
          loading={loading}
          count={rows.length}
        />

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

          <ExportButton
            className="hidden lg:inline-flex"
            onClick={exportPage}
            loading={loading}
            count={rows.length}
          />
        </div>
      </div>

      {/* ---------------- controls ----------------
          One row: `nowrap` plus a scroller rather than `flex-wrap`, which
          collapsed this into a three-line block on a narrow viewport. */}
      <div
        ref={filterBarRef}
        /* A band of its own: bordered off from the heading above and tinted,
           so the controls read as one strip rather than as loose chips
           floating under the title. */
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-mv-line bg-[#fafbfa] px-4 pb-[10px] pt-[12px] lg:flex-nowrap lg:px-6"
      >
        <TableSearch
          picked={picked}
          disabled={loading}
          onPick={setPicked}
          onClear={() => {
            // Applied straight away, unlike picking: clearing is a request to
            // stop filtering, and waiting for Apply would leave the box empty
            // while the table still showed that one operator's wells.
            setPicked(null);
            setAppliedPicked(null);
            setPage(1);
          }}
        />

        {/* A rule, not a "FILTER" label: the pills say what they are, and the
            word was competing with them for attention. */}
        <span
          aria-hidden="true"
          className="mx-1 hidden h-5 w-px shrink-0 bg-mv-line lg:block"
        />

        {FACETS.map((facet) => (
          <FilterDropdown
            key={facet.key}
            label={facet.label}
            options={facetItems[facet.key].map((item) => item.value)}
            loading={facetsLoading}
            searchable={facet.searchable}
            chosen={facets[facet.key]}
            open={openFacet === facet.key}
            disabled={loading}
            onOpenChange={(next) => {
              setOpenFacet(next ? facet.key : null);
              if (next) setProductionOpen(false);
            }}
            onChange={(next) => updateFacet(facet.key, next)}
            /* Only the operators run to tens of thousands. */
            {...(facet.key === "operator"
              ? {
                  onScrollEnd: loadMoreOperators,
                  loadingMore: operatorMore,
                  total: operatorTotal,
                }
              : null)}
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
            className="rounded-lg border border-mv-red px-[13px] py-[6px] text-[12.5px] font-semibold text-mv-red enabled:cursor-pointer enabled:hover:bg-mv-red-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={applyFacets}
            // A half-filled or back-to-front range cannot be sent.
            disabled={
              loading || !pending || productionProblem(production) !== null
            }
            /* Ringed while it is the next thing to do. The reader has just
               come from a dropdown at the other end of the row, and a button
               that looks the same whether or not it is waiting on them is a
               button they walk past. */
            className={`rounded-lg px-[15px] py-[6px] text-[12.5px] font-bold enabled:cursor-pointer enabled:bg-mv-green-deep enabled:text-white enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#e9ecea] disabled:text-mv-muted ${
              pending ? "ring-4 ring-mv-green-deep/25" : ""
            }`}
          >
            {pending && draftCount > 0
              ? `Apply ${draftCount} filter${draftCount === 1 ? "" : "s"}`
              : "Apply"}
          </button>
        </div>

      </div>

      {/* ---------------- applied filters ----------------
          Each chip names its facet as well as its value: "Anderson" alone
          leaves you to work out which of five filters put it there, and two
          facets can hold the same word. */}
      {(chips.length > 0 || rangeChips.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-[6px] border-b border-mv-line bg-[#fafbfa] px-4 pb-[11px] pt-[9px] lg:px-6">
          <span className="mr-1 shrink-0 text-[10px] font-extrabold uppercase tracking-[.1em] text-mv-muted">
            Applied
          </span>

          {chips.map((chip) => (
            <span
              key={`${chip.key}:${chip.value}`}
              className="inline-flex items-center gap-[7px] rounded-lg border border-mv-green-deep/25 bg-mv-mint py-[4px] pl-[10px] pr-[5px] text-[12px] text-mv-green-deep"
            >
              <span className="text-mv-green-deep/70">{chip.label}</span>
              <span className="font-semibold">{chip.value || "—"}</span>
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={`Remove ${chip.label} ${chip.value}`}
                className="grid h-[16px] w-[16px] cursor-pointer place-items-center rounded text-mv-green-deep/60 hover:bg-white hover:text-mv-red"
              >
                <X size={11} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          ))}

          {rangeChips.map(({ stream, label, unit, min, max }) => (
            <span
              key={stream}
              className="inline-flex items-center gap-[7px] rounded-lg border border-mv-green-deep/25 bg-mv-mint py-[4px] pl-[10px] pr-[5px] text-[12px] text-mv-green-deep"
            >
              <span className="text-mv-green-deep/70">{label}</span>
              <span className="font-semibold tabular-nums">
                {Number(min).toLocaleString("en-US")} –{" "}
                {Number(max).toLocaleString("en-US")} {unit}
              </span>
              <button
                type="button"
                onClick={() => removeRange(stream)}
                aria-label={`Remove the ${label} range`}
                className="grid h-[16px] w-[16px] cursor-pointer place-items-center rounded text-mv-green-deep/60 hover:bg-white hover:text-mv-red"
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
          disabled table, and says nothing about how long it will be.

          Centred on the screen rather than on the card. The card is
          twenty-five rows tall, so its middle is a long way down the page —
          the pill was landing near the foot of the window, or past it, while
          the rows it was explaining were at the top. Fixed, it is where the
          reader is looking whatever they have scrolled to. */}
      {loading && rows.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
          <span className="flex items-center gap-[12px] rounded-full border border-mv-line bg-white px-[22px] py-[13px] shadow-mv-lg">
            <span
              aria-hidden="true"
              className="h-[20px] w-[20px] shrink-0 animate-spin rounded-full border-[3px] border-mv-line border-t-mv-green-deep"
            />
            <span className="text-[15px] font-semibold leading-none text-mv-slate">
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
                      : sort?.key === key
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
                        active={sort?.key === key}
                        ascending={sort?.ascending ?? true}
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
              /*
               * The whole row opens the well, not just the pin at the end of
               * it. Keyboard too: a `tr` takes no focus of its own, so it is
               * given a row role, a tab stop and Enter/Space.
               *
               * Held back while a page is in flight — the rows on screen are
               * the previous page's, and a click would open a well the reader
               * is no longer looking at.
               */
              <tr
                key={row.api}
                role="row"
                tabIndex={loading ? -1 : 0}
                aria-label={`Show ${row.api} on the map`}
                onClick={() => {
                  if (!loading) onShowOnMap(row);
                }}
                onKeyDown={(event) => {
                  if (loading) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onShowOnMap(row);
                  }
                }}
                className={`border-b border-mv-line hover:bg-[#f4f9f6] focus-visible:bg-[#f4f9f6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep ${
                  loading ? "cursor-wait" : "cursor-pointer"
                }`}
              >
                <td className="py-[14px] pl-6 pr-4">
                  <span className="text-[13px] font-semibold text-mv-green-deep underline underline-offset-2">
                    {row.api}
                  </span>
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {shown(row.operator)}
                </td>
                <td
                  className={`px-4 py-[14px] text-[13px] ${
                    missing(row.lease)
                      ? "text-mv-muted"
                      : "font-bold text-mv-ink"
                  }`}
                >
                  {shown(row.lease)}
                </td>
                <td className="px-4 py-[14px]">
                  {missing(row.wtype) ? (
                    <span className="text-[13px] text-mv-muted">N/A</span>
                  ) : (
                    <TypePill wtype={row.wtype} />
                  )}
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {missing(row.status) ? (
                    <span className="text-mv-muted">N/A</span>
                  ) : (
                    <span className="inline-flex items-center gap-[6px]">
                      <Dot color={STATUS_DOT[row.status] ?? DOT_GREY} />
                      {row.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-[14px] text-[13px] text-mv-slate">
                  {shown(row.county)}
                </td>
                <Volume value={row.producedOil} />
                <Volume value={row.producedGas} />
                <td className="py-[14px] pl-4 pr-6">
                  <button
                    type="button"
                    onClick={(event) => {
                      // The row already carries this; without stopping here it
                      // would run twice on one click.
                      event.stopPropagation();
                      if (!loading) onShowOnMap(row);
                    }}
                    // The row is the control now; the pin is its marker, so it
                    // is not a second tab stop announcing the same action.
                    tabIndex={-1}
                    aria-hidden="true"
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
                {/* Empty, and only there for its height: with no rows the card
                    collapsed to a strip. What goes in the space is drawn over
                    the card instead — see below — because this cell is a cell
                    of a 1,160px table, and centred in it on a phone means
                    centred 600px off the right-hand edge of the screen. */}
                <td
                  colSpan={COLUMNS.length + 1}
                  /* 220 on a phone, where the whole summary strip sits above
                     this card: at 300 the middle of the space — where the
                     message is — fell just under the fold. */
                  className="h-[220px] lg:h-[52vh]"
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* What the empty table is doing, said over the card.
          The card is as wide as the screen; the table inside it is 1,160px and
          scrolls, so anything centred in the table is centred somewhere off to
          the right on a narrow viewport. */}
      {rows.length === 0 && (
        /* Centred in the empty space itself: the header row above it and the
           pager below it are outside the box, so "the middle" is the middle of
           the blank area rather than of the card. The space is 220px on a
           phone — half of 52vh, under a card that already starts low on a
           narrow screen, put the message below the fold, which is the same
           message-nobody-can-see this replaced. */
        <div className="pointer-events-none absolute inset-x-0 bottom-[64px] top-[46px] grid place-items-center px-6 text-center">
          {loading ? (
            <span className="inline-flex items-center gap-[10px] text-[13px] lg:text-[15px] font-semibold text-mv-slate">
              <span
                aria-hidden="true"
                className="h-[22px] w-[22px] shrink-0 animate-spin rounded-full border-[3px] border-mv-line border-t-mv-green-deep"
              />
              Loading wells…
            </span>
          ) : (
            <span className="text-[12.5px] lg:text-[13px] text-mv-muted">
              {error ?? "No wells match these filters."}
            </span>
          )}
        </div>
      )}

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
            disabled={loading || safePage === 1}
            onClick={() => setPage(1)}
          />
          <PagerButton
            label="Previous page"
            icon={ChevronLeft}
            disabled={loading || safePage === 1}
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
                className={`h-[28px] min-w-[28px] rounded-lg border px-2 text-[12.5px] font-semibold enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  entry === 1 ||
                  entry === totalPages ||
                  Math.abs(entry - safePage) <= 2
                    ? ""
                    : "hidden lg:inline-block"
                } ${
                  entry === safePage
                    ? "border-mv-green-deep bg-mv-green-deep text-white"
                    : "border-mv-line text-mv-slate enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep"
                }`}
              >
                {entry}
              </button>
            ),
          )}

          <PagerButton
            label="Next page"
            icon={ChevronRight}
            disabled={loading || safePage === totalPages}
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
          />
          <PagerButton
            label="Last page"
            icon={ChevronsRight}
            disabled={loading || safePage === totalPages}
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
  loading,
  searchable,
  chosen,
  open,
  disabled,
  onOpenChange,
  onChange,
  onScrollEnd,
  loadingMore,
  total,
}: {
  label: string;
  options: string[];
  /** True while the list is still being fetched — an empty one means nothing yet. */
  loading?: boolean;
  searchable?: boolean;
  chosen: Set<string>;
  open: boolean;
  /** Shut while a request is out — a second filter would race the first. */
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: Set<string>) => void;
  /** For a paged facet: fetch the next page when the list is scrolled to it. */
  onScrollEnd?: () => void;
  loadingMore?: boolean;
  /** How many rows there are in all, where more than are loaded. */
  total?: number;
}) {
  const [find, setFind] = useState("");

  /* Slid back where the button is too near the right edge for it. */
  const { shift, place } = usePanelPlacement(PANEL_WIDTH);

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
        className={`inline-flex items-center gap-[6px] rounded-lg border px-[13px] py-[6px] text-[12.5px] font-semibold enabled:cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
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
        <div
          ref={place}
          style={{ marginLeft: shift }}
          className="absolute left-0 top-full z-50 mt-2 w-[238px] rounded-xl border border-mv-line bg-white p-3 shadow-mv-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.1em] text-mv-ink">
              {label}
            </span>
            {/* "None" named the state it would leave behind; this names the
                action. Offered only when there is something to clear — the
                heading beside it already says which list. */}
            <button
              type="button"
              disabled={chosen.size === 0}
              onClick={() => onChange(new Set())}
              className="text-[11.5px] font-bold enabled:cursor-pointer enabled:text-mv-green-deep enabled:hover:underline disabled:cursor-not-allowed disabled:text-mv-muted"
            >
              Clear all
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

          <div
            /* A paged facet fetches its next page as the last rows come into
               view — see the operator list, which runs to tens of thousands
               and arrives a page at a time. */
            onScroll={
              onScrollEnd
                ? (event) => {
                    const box = event.currentTarget;
                    if (
                      box.scrollTop + box.clientHeight >=
                      box.scrollHeight - PANEL_NEAR_END
                    ) {
                      onScrollEnd();
                    }
                  }
                : undefined
            }
            className="max-h-[232px] overflow-y-auto"
          >
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

            {visible.length === 0 &&
              (loading ? (
                /* An empty list is not an answer until the request has
                   landed: before that, saying "nothing matches" states that
                   no county exists. */
                <p className="flex items-center gap-2 py-2 text-[12px] text-mv-muted">
                  <span
                    aria-hidden="true"
                    className="h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
                  />
                  Loading {label.toLowerCase()}…
                </p>
              ) : (
                <p className="py-2 text-[12px] text-mv-muted">
                  Nothing matches.
                </p>
              ))}
          </div>

          {/* Where a paged list has got to. Without it a dropdown that stops
              at fifty reads as a facet with fifty values. */}
          {onScrollEnd && total !== undefined && total > options.length && (
            <p className="flex items-center gap-[6px] pt-[6px] text-[11.5px] text-mv-muted">
              {loadingMore && (
                <span
                  aria-hidden="true"
                  className="h-[11px] w-[11px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
                />
              )}
              {options.length.toLocaleString("en-US")} of{" "}
              {total.toLocaleString("en-US")}
              {loadingMore ? "" : " · scroll for more"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Anything the API reports that is not listed here falls back to grey. */
const DOT_GREY = "#9ca3af";

/*
 * The families a well type falls into, and how each one reads.
 *
 * Matched on the phrase rather than looked up whole: the API sends
 * "Plugged Oil", "Plugged Oil / Gas", "Injection / Disposal from Oil" and a
 * dozen more, and a table of exact spellings only ever colours the four it
 * happens to list — every other row came out grey, which said the map's
 * colour-coded legend and this column were describing different data.
 *
 * Order matters: "Plugged Oil" is plugged before it is oil.
 */
const TYPE_LOOKS: { test: RegExp; dot: string; text: string; bg: string }[] = [
  {
    test: /plugged|abandon|cancel/i,
    dot: "#9ca3af",
    text: "#6b7280",
    bg: "#f1f2f4",
  },
  {
    test: /inject|disposal|water|brine/i,
    dot: "#4a7fbf",
    text: "#3a6395",
    bg: "#ecf2fa",
  },
  { test: /dry/i, dot: "#8b6d4a", text: "#7a5f3f", bg: "#f6f1ea" },
  {
    test: /oil\s*(\/|or|&|and)\s*gas/i,
    dot: "#b45309",
    text: "#96470a",
    bg: "#fdf3e4",
  },
  { test: /gas/i, dot: "#d1584f", text: "#b34a42", bg: "#fdeceb" },
  { test: /oil/i, dot: "#3f9d76", text: "#2f7d5d", bg: "#eaf5ef" },
];

const TYPE_FALLBACK = { dot: DOT_GREY, text: "#6b7280", bg: "#eef1ee" };

/**
 * One well type, as a pill.
 *
 * Kept to a single line — a wrapped pill is a three-line row beside eight
 * one-line ones — and cut with an ellipsis when the phrase outruns the
 * column, with the whole of it on hover and in the accessible name.
 */
function TypePill({ wtype }: { wtype: string }) {
  const look = TYPE_LOOKS.find(({ test }) => test.test(wtype)) ?? TYPE_FALLBACK;

  return (
    <span
      title={wtype}
      style={{ backgroundColor: look.bg, color: look.text }}
      /* A width in pixels, not `max-w-full`: the table lays itself out from
         its content, so a cell is as wide as what is in it and "full" is
         whatever the pill already grew to — the ellipsis never came, and one
         long phrase pushed the column over the ones beside it. */
      className="inline-flex max-w-[150px] items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-medium xl:max-w-[200px]"
    >
      <Dot color={look.dot} />
      {/* `min-w-0`: a flex item will not shrink below its content without it,
          so the ellipsis never appeared and the pill pushed the column wide. */}
      <span className="min-w-0 truncate">{wtype}</span>
    </span>
  );
}

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

/*
 * Export, in both of its shapes.
 *
 * `compact` is the icon alone, for the heading row on a narrow screen; without
 * it, the labelled button that sits beside the view switch from `lg` up. One
 * component rather than two so the two cannot drift apart -- they are the same
 * control, and the only difference is whether there is room to name it.
 *
 * The card on hover replaces the browser's own tooltip, which is late, plain,
 * and on the icon says nothing a download arrow has not already said. What it
 * has to add is the scope: Export gives you the rows on this page, not every
 * row the filters matched.
 */
function ExportButton({
  compact,
  className = "",
  onClick,
  loading,
  count,
}: {
  compact?: boolean;
  className?: string;
  onClick: () => void;
  loading: boolean;
  count: number;
}) {
  /* Locked while a page is in flight: the rows on screen are the previous
     page's, and exporting them under a pager that already says 7 hands over
     the wrong ten records. */
  const disabled = loading || count === 0;

  return (
    /*
     * The wrapper takes the hover, not the button: a disabled button stops
     * firing pointer events in some engines, and "why can I not press this"
     * is exactly the case the card is there to answer.
     */
    <span className={`group relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="Export this page"
        className={
          compact
            ? "grid h-[32px] w-[32px] cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-slate enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-mv-line px-[14px] py-[8px] text-[12.5px] font-semibold text-mv-slate enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
        }
      >
        <Download size={compact ? 15 : 14} aria-hidden="true" />
        {!compact && "Export this page"}
      </button>

      {/* Held to the right edge: the icon sits at the end of its row, and a
          centred card would hang off the side of a phone screen. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-[9px] hidden w-[232px] rounded-lg bg-white px-[13px] py-[10px] text-[11.5px] leading-snug text-mv-slate shadow-mv-lg ring-1 ring-mv-line group-hover:block group-focus-within:block"
      >
        <span
          aria-hidden="true"
          className="absolute -top-[5px] right-[14px] h-[9px] w-[9px] rotate-45 border-l border-t border-mv-line bg-white"
        />
        {loading ? (
          "Loading this page — the rows are still arriving."
        ) : count === 0 ? (
          "Nothing to export: no rows matched these filters."
        ) : (
          <>
            <span className="block font-semibold text-mv-ink">
              Export this page
            </span>
            <span className="mt-[3px] block">
              The {count} row{count === 1 ? "" : "s"} shown here, as a CSV —
              this page only, not the whole result set.
            </span>
          </>
        )}
      </span>
    </span>
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
      /* An equal share of the row until `lg`, where the switch sits in a
         line with Back to map and the export button and takes only the width
         its words need. Below that the row is the switch's own, and three
         content-width buttons floating in the middle of it read as three
         loose chips rather than one control. */
      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-lg px-3 py-[6px] text-[13px] font-semibold lg:flex-none ${
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
      className="grid h-[28px] w-[28px] place-items-center rounded-lg border border-mv-line text-mv-slate enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-not-allowed disabled:opacity-40"
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
