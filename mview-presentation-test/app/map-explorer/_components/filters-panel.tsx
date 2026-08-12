"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Lock,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getCountyListMap,
  getFieldListMap,
  getMapSearch,
  getOperatorListMap,
  getPlayTypeListMap,
  getWellStatusListMap,
  getWellTypeListMap,
  type MapFilterItem,
} from "@/lib/map-api";

import { WELLS_STATEWIDE } from "./well-clusters";

/*
 * The Search & filters panel that opens off the FILTERS edge tab.
 *
 * Everything below is static, standing in for the real filter service. The
 * controls do work — radios select, checkboxes toggle, All/None sweep a list,
 * Find… narrows it, sections collapse — but only against that static data.
 * Nothing here touches the map yet.
 *
 * The one thing that cannot behave honestly is the footer count. The section
 * totals do not add up to 1,217,270 — they are counting different things — so
 * the footer cannot be derived from the checkboxes. It stays fixed at the
 * mock's value, which means unchecking a row will not move it. That is the
 * first thing to replace when real filtering lands.
 */

/** The legend dots. Fixed set so the six lists read as one system. */
const DOT = {
  green: "#10b981",
  amber: "#f59e0b",
  blue: "#3b82f6",
  red: "#ef4444",
  purple: "#8b5cf6",
  grey: "#9ca3af",
  slate: "#6b7280",
  brown: "#a16207",
} as const;

type Lease = {
  id: string;
  /** Rendered as written — the mock's lease names carry their own casing. */
  name: string;
  number: string;
  location: string;
};

const MY_LEASES: Lease[] = [
  {
    id: "west-ranch-unit",
    name: "WEST RANCH UNIT",
    number: "93898",
    location: "Andrews County · District 10",
  },
  {
    id: "santa-rita-a",
    name: "SANTA RITA -A-",
    number: "23235",
    location: "Andrews County · District 11",
  },
  {
    id: "dixie-farms",
    name: "DIXIE FARMS",
    number: "18057",
    location: "Reagan County · District 10",
  },
];

/*
 * A count and a colour dot are optional: some lists are plain sets of choices
 * with no tally behind them, and a "0" or a grey dot would read as data rather
 * than as an absence of it.
 */
type FilterItem = { name: string; count?: number; dot?: string };

type FilterSection = {
  id: string;
  label: string;
  items: FilterItem[];
  /** Puts the Find… box above the list — for the sections that run long. */
  searchable?: boolean;
  /** The amber flag beside the heading. */
  note?: string;
  /** The mock opens with County expanded and the rest closed. */
  defaultOpen?: boolean;
};

export const FILTER_SECTIONS: FilterSection[] = [
  {
    id: "county",
    label: "County",
    searchable: true,
    defaultOpen: true,
    items: [
      { name: "Midland", count: 412, dot: DOT.green },
      { name: "Reeves", count: 388, dot: DOT.amber },
      { name: "Ector", count: 305, dot: DOT.blue },
      { name: "Karnes", count: 214, dot: DOT.red },
      { name: "Martin", count: 198, dot: DOT.green },
      { name: "Howard", count: 176, dot: DOT.purple },
      { name: "Andrews", count: 152, dot: DOT.amber },
      { name: "Upton", count: 141, dot: DOT.green },
      { name: "Reagan", count: 128, dot: DOT.red },
      { name: "Gaines", count: 119, dot: DOT.blue },
      { name: "All other counties", count: 6767, dot: DOT.grey },
    ],
  },
  {
    // No screenshot shows this list open, so the operators and their counts are
    // invented — plausible Permian names, not real figures. Replace wholesale.
    id: "operator",
    label: "Operator",
    searchable: true,
    items: [
      { name: "Pioneer Natural Resources", count: 48210, dot: DOT.green },
      { name: "Diamondback E&P", count: 41905, dot: DOT.amber },
      { name: "ConocoPhillips", count: 33640, dot: DOT.blue },
      { name: "Chevron U.S.A.", count: 29318, dot: DOT.red },
      { name: "Apache Corporation", count: 24772, dot: DOT.purple },
      { name: "Oxy USA", count: 22140, dot: DOT.green },
      { name: "EOG Resources", count: 19884, dot: DOT.amber },
      { name: "Devon Energy", count: 15301, dot: DOT.blue },
      // These two are real — they surface in the mock's typeahead for "up".
      { name: "UPP Operating", count: 9412, dot: DOT.red },
      { name: "Supreme", count: 6880, dot: DOT.purple },
      { name: "All other operators", count: 982100, dot: DOT.grey },
    ],
  },
  {
    id: "well-type",
    label: "Well type",
    items: [
      { name: "Oil Well" },
      { name: "Gas Well" },
      { name: "Oil / Gas Well" },
      { name: "Injection / Disposal Well" },
      { name: "Storage Well" },
      { name: "Service Well" },
      { name: "Observation Well" },
      { name: "Brine Mining Well" },
      { name: "Water Supply Well" },
      { name: "Geothermal Well" },
    ],
  },
  {
    id: "status",
    label: "Well status",
    items: [
      { name: "Permitted Location" },
      { name: "Producing" },
      { name: "Non-Producing" },
      { name: "Dry Hole" },
      { name: "Canceled / Abandoned Location" },
    ],
  },
  {
    id: "play-type",
    label: "Play type",
    note: "No well data",
    items: [
      { name: "Permian – Midland", count: 2110, dot: DOT.green },
      { name: "Permian – Delaware", count: 1340, dot: DOT.green },
      { name: "Eagle Ford", count: 1020, dot: DOT.amber },
      { name: "Barnett", count: 512, dot: DOT.green },
      { name: "Haynesville", count: 305, dot: DOT.amber },
      { name: "Granite Wash", count: 188, dot: DOT.purple },
      { name: "Austin Chalk", count: 142, dot: DOT.red },
      { name: "Conventional / other", count: 3383, dot: DOT.grey },
    ],
  },
  {
    // Spraberry and Wolfcamp are from the mock; the rest are filled in.
    id: "field",
    label: "Field",
    note: "No well data",
    searchable: true,
    items: [
      { name: "Spraberry (Trend)", count: 1240, dot: DOT.green },
      { name: "Wolfcamp", count: 1105, dot: DOT.red },
      { name: "Wolfbone", count: 940, dot: DOT.amber },
      { name: "Bone Spring", count: 812, dot: DOT.blue },
      { name: "Eagleville (Eagle Ford)", count: 705, dot: DOT.amber },
      { name: "Phantom (Wolfcamp)", count: 588, dot: DOT.purple },
      { name: "Panhandle, West", count: 341, dot: DOT.green },
      { name: "All other fields", count: 4271, dot: DOT.grey },
    ],
  },
];

/**
 * What the top search box looks through. The placeholder names them — "Lease,
 * operator, or county" — so status, well type, play type and field stay out of
 * it, which is also why "Water Supply" does not answer a search for "up".
 */
/** Below this the search box stays quiet — the endpoint is slow and vague. */
const SEARCH_MIN_CHARS = 3;

/** The API's `type` as the badge beside a result, and the section it belongs to. */
const SEARCH_KINDS: Record<string, string> = {
  lease: "Lease",
  operator: "Operator",
  county: "County",
};

const SEARCH_SECTIONS: Record<string, string | undefined> = {
  operator: "operator",
  county: "county",
};

type Suggestion = {
  key: string;
  label: string;
  /** The badge on the right — which list the hit came from. */
  kind: string;
  sectionId?: string;
  leaseId?: string;
};

type FiltersPanelProps = {
  onCollapse?: () => void;
  /** Positioning; the panel places itself nowhere on its own. */
  className?: string;
};

export function FiltersPanel({ onCollapse, className = "" }: FiltersPanelProps) {
  /* The live county list, with the two states any request has besides its
     result. `loading` starts true because the request starts on mount. */
  const [counties, setCounties] = useState<MapFilterItem[]>([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState<string | null>(null);

  /* Operators arrive from the filters facet, so they carry counts as well. */
  const [operators, setOperators] = useState<MapFilterItem[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);

  const [wellTypes, setWellTypes] = useState<MapFilterItem[]>([]);
  const [wellTypesLoading, setWellTypesLoading] = useState(true);
  const [wellTypesError, setWellTypesError] = useState<string | null>(null);

  const [fields, setFields] = useState<MapFilterItem[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [playTypes, setPlayTypes] = useState<MapFilterItem[]>([]);
  const [playTypesLoading, setPlayTypesLoading] = useState(true);
  const [playTypesError, setPlayTypesError] = useState<string | null>(null);

  const [wellStatuses, setWellStatuses] = useState<MapFilterItem[]>([]);
  const [wellStatusesLoading, setWellStatusesLoading] = useState(true);
  const [wellStatusesError, setWellStatusesError] = useState<string | null>(
    null,
  );


  /*
   * The live county list replaces the section's items. It arrives as a prop
   * from a server fetch, so it is here on the first render and the state
   * initialisers below can seed themselves from it — no empty first paint, no
   * effect to reconcile afterwards.
   *
   * The API returns names only, so these rows carry no count and no dot.
   */
  /*
   * What each API-backed section shows instead of its list: the loading line
   * while the request is out, then the error if it failed, and nothing once
   * the rows are in. A lookup rather than a ternary chain — one more facet
   * should be one more line here, not another level of nesting.
   */
  const notices: Record<string, string | null | undefined> = {
    county: countiesLoading ? "Loading counties…" : countiesError,
    operator: operatorsLoading ? "Loading operators…" : operatorsError,
    "well-type": wellTypesLoading ? "Loading well types…" : wellTypesError,
    status: wellStatusesLoading ? "Loading well statuses…" : wellStatusesError,
    "play-type": playTypesLoading ? "Loading play types…" : playTypesError,
    field: fieldsLoading ? "Loading fields…" : fieldsError,
  };

  const sections = useMemo<FilterSection[]>(
    () =>
      FILTER_SECTIONS.map((section) => {
        if (section.id === "county") {
          return {
            ...section,
            items: counties.map(({ value, count }) => ({ name: value, count })),
          };
        }
        if (section.id === "operator") {
          return {
            ...section,
            items: operators.map(({ value, count }) => ({
              name: value,
              count,
            })),
          };
        }
        if (section.id === "well-type") {
          return {
            ...section,
            items: wellTypes.map(({ value, count }) => ({
              name: value,
              count,
            })),
          };
        }
        if (section.id === "field") {
          return {
            ...section,
            // Live data now, so the "No well data" flag comes off.
            note: undefined,
            items: fields.map(({ value, count }) => ({ name: value, count })),
          };
        }
        if (section.id === "play-type") {
          return {
            ...section,
            // The list is live now, so the "No well data" flag comes off.
            note: undefined,
            items: playTypes.map(({ value, count }) => ({
              name: value,
              count,
            })),
          };
        }
        if (section.id === "status") {
          return {
            ...section,
            items: wellStatuses.map(({ value, count }) => ({
              name: value,
              count,
            })),
          };
        }
        return section;
      }),
    [counties, operators, wellTypes, wellStatuses, playTypes, fields],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the commented-out My leases section
  const [selectedLease, setSelectedLease] = useState<string | null>(
    MY_LEASES[0].id,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the commented-out My leases section
  const [leasesOpen, setLeasesOpen] = useState(true);

  const [openSections, setOpenSections] = useState<Set<string>>(
    () =>
      new Set(
        sections.filter((section) => section.defaultOpen).map(
          (section) => section.id,
        ),
      ),
  );

  // Everything starts ticked, so the panel opens showing the whole map.
  const [checked, setChecked] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(
      sections.map((section) => [
        section.id,
        new Set(section.items.map((item) => item.name)),
      ]),
    ),
  );

  useEffect(() => {
    // `cancelled` rather than an AbortController: the panel can unmount while
    // the request is in flight, and the only thing that must not happen then
    // is a setState on a component that has gone.
    let cancelled = false;

    getCountyListMap()
      .then((list) => {
        if (cancelled) return;
        setCounties(list);
        // Counties arrive unticked — 270 of them ticked reads as a filter
        // already applied. All · None is right above the list.
        setCountiesError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCountiesError(
          error instanceof Error ? error.message : "Could not load counties.",
        );
      })
      .finally(() => {
        if (!cancelled) setCountiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getFieldListMap()
      .then((list) => {
        if (cancelled) return;
        setFields(list);
        setFieldsError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFieldsError(
          error instanceof Error ? error.message : "Could not load fields.",
        );
      })
      .finally(() => {
        if (!cancelled) setFieldsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getPlayTypeListMap()
      .then((list) => {
        if (cancelled) return;
        setPlayTypes(list);
        setPlayTypesError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPlayTypesError(
          error instanceof Error ? error.message : "Could not load play types.",
        );
      })
      .finally(() => {
        if (!cancelled) setPlayTypesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getWellStatusListMap()
      .then((list) => {
        if (cancelled) return;
        setWellStatuses(list);
        setWellStatusesError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setWellStatusesError(
          error instanceof Error
            ? error.message
            : "Could not load well statuses.",
        );
      })
      .finally(() => {
        if (!cancelled) setWellStatusesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getWellTypeListMap()
      .then((list) => {
        if (cancelled) return;
        setWellTypes(list);
        setWellTypesError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setWellTypesError(
          error instanceof Error ? error.message : "Could not load well types.",
        );
      })
      .finally(() => {
        if (!cancelled) setWellTypesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getOperatorListMap()
      .then((list) => {
        if (cancelled) return;
        setOperators(list);
        setOperatorsError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setOperatorsError(
          error instanceof Error ? error.message : "Could not load operators.",
        );
      })
      .finally(() => {
        if (!cancelled) setOperatorsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [query, setQuery] = useState("");
  /*
   * What the search API returned for the box at the top of the panel. Only
   * this box goes to the network — the Find… box inside each section still
   * filters the rows already on screen.
   */
  const [searchHits, setSearchHits] = useState<Suggestion[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  /*
   * The query these results answer. Anything else in the box means an answer
   * is still coming — which covers the debounce window as well as the request
   * itself. A plain `loading` flag cannot: it only goes up when the timer
   * fires, so for those 300ms the box looked settled and empty and said "No
   * matches" before it said "Searching…".
   */
  const [searchedFor, setSearchedFor] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  /* The dropdown is the API's answer and nothing else — no local matching
     against the loaded rows, no lease list. */
  const suggestions = searchHits;

  /* Typed enough to search, and the results on hand are for something else. */
  const searching =
    query.trim().length >= SEARCH_MIN_CHARS && query.trim() !== searchedFor;

  useEffect(() => {
    const needle = query.trim();
    let cancelled = false;

    /*
     * Below the minimum the box has nothing to ask for: two letters match
     * thousands of rows and the endpoint takes seconds to answer. Debounced on
     * top of that, so a word typed at speed is one request, not five.
     */
    const timer = setTimeout(() => {
      if (needle.length < SEARCH_MIN_CHARS) {
        setSearchHits([]);
        setSearchError(null);
        setSearchedFor(needle);
        return;
      }

      getMapSearch(needle)
        .then((results) => {
          if (cancelled) return;
          setSearchHits(
            results.map((result, index) => ({
              // Counties carry their name in `value`; the rest have an id
              // there and the name in `label`.
              key: `${result.type}:${result.value}:${index}`,
              label: result.label ?? result.value,
              kind: SEARCH_KINDS[result.type] ?? result.type,
              sectionId: SEARCH_SECTIONS[result.type],
            })),
          );
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setSearchHits([]);
          setSearchError(
            error instanceof Error ? error.message : "Search failed.",
          );
        })
        .finally(() => {
          if (!cancelled) setSearchedFor(needle);
        });
    }, needle.length < SEARCH_MIN_CHARS ? 0 : 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Dismiss the suggestions on an outside click, as the map's other overlays do.
  useEffect(() => {
    if (!suggestionsOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [suggestionsOpen]);

  /**
   * Applying a hit narrows its list to that one entry and opens the section, so
   * the result of the search is visible rather than just typed. Clearing the
   * box does not put the list back — the filter is applied, not previewed.
   */
  function applySuggestion(suggestion: Suggestion) {
    if (suggestion.leaseId) {
      setSelectedLease(suggestion.leaseId);
      setLeasesOpen(true);
    } else if (suggestion.sectionId) {
      const sectionId = suggestion.sectionId;
      setOpenSections((previous) => new Set(previous).add(sectionId));
      setChecked((previous) => ({
        ...previous,
        [sectionId]: new Set([suggestion.label]),
      }));
    }

    setQuery(suggestion.label);
    setSuggestionsOpen(false);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      return;
    }
    if (!suggestionsOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((index) =>
        Math.min(index + 1, suggestions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      applySuggestion(suggestions[activeSuggestion]);
    }
  }

  function toggleSection(id: string) {
    setOpenSections((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleItem(sectionId: string, name: string) {
    setChecked((previous) => {
      const next = new Set(previous[sectionId]);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...previous, [sectionId]: next };
    });
  }

  function setAll(section: FilterSection, on: boolean) {
    setChecked((previous) => ({
      ...previous,
      [section.id]: on
        ? new Set(section.items.map((item) => item.name))
        : new Set(),
    }));
  }

  return (
    <div
      className={`flex max-h-full w-[196px] flex-col md:w-[224px] lg:w-[252px] overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg ${className}`}
    >
      <div className="mv-thin-scroll min-h-0 flex-1 overflow-y-auto px-[14px]">
        {/* ---------------- header ---------------- */}
        <div className="flex items-center gap-2 pb-3 pt-[14px]">
          <h2 className="text-[14px] lg:text-[15px] font-bold leading-none text-mv-ink">
            Search &amp; filters
          </h2>
          <ProBadge />
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse filters"
            className="ml-auto grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-slate hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
        </div>

        <div ref={searchRef} className="relative">
          <div className="group flex items-center gap-2 rounded-lg border border-mv-line py-[7px] pl-3 pr-[10px] focus-within:border-mv-green focus-within:ring-1 focus-within:ring-mv-green">
            <label htmlFor="filters-search" className="sr-only">
              Search leases, operators or counties
            </label>
            <input
              id="filters-search"
              type="text"
              role="combobox"
              autoComplete="off"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="filters-search-results"
              aria-activedescendant={
                suggestionsOpen && suggestions.length > 0
                  ? `filters-search-option-${activeSuggestion}`
                  : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveSuggestion(0);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Lease, operator, or county"
              className="min-w-0 flex-1 border-0 bg-transparent text-[11.5px] lg:text-[12.5px] leading-tight text-mv-ink outline-none placeholder:text-mv-muted"
            />
            <Search
              size={14}
              className="text-mv-muted group-focus-within:text-mv-green-deep"
              aria-hidden="true"
            />
          </div>

          {suggestionsOpen && query.trim() !== "" && (
            <ul
              id="filters-search-results"
              role="listbox"
              aria-label="Search results"
              className="mv-thin-scroll absolute inset-x-0 top-full z-20 mt-1 max-h-[248px] overflow-y-auto rounded-lg border border-mv-line bg-white py-1 shadow-mv-lg"
            >
              {/* Refining a search keeps the previous answer on screen, blurred
                  and inert, with the spinner above it — the list stays where
                  it was instead of emptying and reflowing, but nobody can
                  click a result that is about to be replaced. */}
              {searching && suggestions.length > 0 && (
                <li className="flex items-center gap-2 border-b border-mv-line px-3 py-[6px] text-[10.5px] lg:text-[11.5px] font-semibold text-mv-muted">
                  <span
                    aria-hidden="true"
                    className="h-[11px] w-[11px] shrink-0 animate-spin rounded-full border-[1.5px] border-mv-line border-t-mv-green-deep"
                  />
                  Searching…
                </li>
              )}

              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.key}
                  className={
                    searching
                      ? "pointer-events-none select-none opacity-50 blur-[1.5px] transition-[filter,opacity] duration-150"
                      : "transition-[filter,opacity] duration-150"
                  }
                >
                  <button
                    type="button"
                    id={`filters-search-option-${index}`}
                    role="option"
                    aria-selected={index === activeSuggestion}
                    // Keeps focus in the field, so the blur never races the click.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => applySuggestion(suggestion)}
                    className={`flex w-full cursor-pointer items-center gap-2 px-3 py-[9px] text-left ${
                      index === activeSuggestion ? "bg-[#f2f8f5]" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px] lg:text-[13px] text-mv-slate">
                      <Highlighted text={suggestion.label} query={query} />
                    </span>
                    <span className="shrink-0 rounded bg-[#f1f2f4] px-[7px] py-[3px] text-[8.5px] lg:text-[9.5px] font-bold uppercase tracking-[.06em] text-mv-muted">
                      {suggestion.kind}
                    </span>
                  </button>
                </li>
              ))}

              {suggestions.length === 0 && (
                <li className="px-3 py-[9px] text-[12px] lg:text-[13px] text-mv-muted">
                  {searching
                    ? "Searching…"
                    : searchError
                      ? searchError
                      : query.trim().length < SEARCH_MIN_CHARS
                        ? `Type ${SEARCH_MIN_CHARS} letters to search`
                        : "No matches"}
                </li>
              )}

            </ul>
          )}
        </div>

        {/* ---------------- my leases ----------------
            Commented out rather than deleted — the section is expected back,
            so it stays here with its markup intact. Its state and helpers are
            left in place above for the same reason.

        <SectionShell
          label="My leases"
          count={MY_LEASES.length}
          open={leasesOpen}
          onToggle={() => setLeasesOpen((open) => !open)}
        >
          <div className="flex justify-end pb-1">
            <BulkAction onClick={() => setSelectedLease(null)}>None</BulkAction>
          </div>

          {MY_LEASES.map((lease, index) => (
            <label
              key={lease.id}
              className={`flex cursor-pointer items-start gap-[10px] py-[9px] ${
                index > 0 ? "border-t border-mv-line" : ""
              }`}
            >
              <input
                type="radio"
                name="my-lease"
                className="sr-only"
                checked={selectedLease === lease.id}
                onChange={() => setSelectedLease(lease.id)}
              />
              <Radio checked={selectedLease === lease.id} />
              <span className="min-w-0">
                <span className="text-[11.5px] lg:text-[12.5px] font-bold text-mv-ink">
                  {lease.name}
                </span>{" "}
                <span className="text-[11px] lg:text-[12px] text-mv-muted">
                  ({lease.number})
                </span>
                <span className="mt-[2px] block text-[10.5px] lg:text-[11.5px] leading-tight text-mv-muted">
                  {lease.location}
                </span>
              </span>
            </label>
          ))}
        </SectionShell>
        */}

        {/* ---------------- the checkbox sections ---------------- */}
        {sections.map((section) => (
          <CheckboxSection
            key={section.id}
            section={section}
            notice={notices[section.id]}
            open={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            checked={checked[section.id]}
            onToggleItem={(name) => toggleItem(section.id, name)}
            onSetAll={(on) => setAll(section, on)}
          />
        ))}

        <div className="h-2" />
      </div>

      {/* ---------------- match count ---------------- */}
      <div className="border-t border-mv-line px-[14px] py-[10px] text-[11.5px] lg:text-[12.5px] leading-snug text-mv-muted">
        <span className="font-bold text-mv-ink">
          {WELLS_STATEWIDE.toLocaleString("en-US")}
        </span>{" "}
        of {WELLS_STATEWIDE.toLocaleString("en-US")} wells match
      </div>
    </div>
  );
}

function CheckboxSection({
  section,
  open,
  onToggle,
  checked,
  onToggleItem,
  onSetAll,
  notice,
}: {
  section: FilterSection;
  open: boolean;
  onToggle: () => void;
  checked: Set<string>;
  onToggleItem: (name: string) => void;
  onSetAll: (on: boolean) => void;
  /** Shown in place of the list — "loading", or why there is nothing. */
  notice?: string | null;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return section.items;
    return section.items.filter((item) =>
      item.name.toLowerCase().includes(needle),
    );
  }, [query, section.items]);

  return (
    <SectionShell
      label={section.label}
      note={section.note}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex items-center justify-end gap-[6px] pb-[10px]">
        <BulkAction onClick={() => onSetAll(true)}>All</BulkAction>
        <span aria-hidden="true" className="text-[10px] lg:text-[11px] text-mv-muted">
          ·
        </span>
        <BulkAction onClick={() => onSetAll(false)}>None</BulkAction>
      </div>

      {section.searchable && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-mv-line px-[10px] py-[6px]">
          <Search size={13} className="text-mv-muted" aria-hidden="true" />
          <label htmlFor={`${section.id}-find`} className="sr-only">
            Find in {section.label}
          </label>
          <input
            id={`${section.id}-find`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[11.5px] lg:text-[12.5px] leading-tight text-mv-slate outline-none placeholder:text-mv-muted"
          />
        </div>
      )}

      {notice ? (
        <p className="py-2 text-[11px] lg:text-[12px] text-mv-muted">{notice}</p>
      ) : null}

      {/* The long lists scroll inside the section rather than stretching it —
          270 counties would otherwise push every section below them out of
          reach. A Find… box is what marks a list as one of the long ones. */}
      <div
        className={
          section.searchable ? "mv-thin-scroll max-h-[248px] overflow-y-auto" : ""
        }
      >
      {!notice &&
        visible.map((item) => (
        <label
          key={item.name}
          className="flex cursor-pointer items-center gap-2 py-[5px]"
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={checked.has(item.name)}
            onChange={() => onToggleItem(item.name)}
          />
          <Checkbox checked={checked.has(item.name)} />
          {item.dot && (
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: item.dot }}
            />
          )}
          {/* Without a count to keep clear of, a long name may wrap rather
              than be cut off. */}
          <span
            className={`flex-1 text-[11.5px] lg:text-[12.5px] text-mv-ink ${
              item.count === undefined ? "leading-tight" : "truncate"
            }`}
          >
            {item.name}
          </span>
          {item.count !== undefined && (
            <span className="shrink-0 rounded-full bg-mv-mint px-[7px] py-[2px] text-[10px] font-semibold tabular-nums leading-none text-mv-green-deep lg:text-[11px]">
              {item.count.toLocaleString("en-US")}
            </span>
          )}
          </label>
        ))}

      </div>

      {!notice && visible.length === 0 && (
        <p className="py-2 text-[11px] lg:text-[12px] text-mv-muted">Nothing matches.</p>
      )}
    </SectionShell>
  );
}

function SectionShell({
  label,
  count,
  note,
  open,
  onToggle,
  children,
}: {
  label: string;
  count?: number;
  note?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-[14px] border-t border-mv-line pt-[14px]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 text-left"
      >
        <span className="text-[9.5px] lg:text-[10.5px] font-extrabold uppercase tracking-[.1em] text-mv-ink">
          {label}
        </span>
        {count !== undefined && (
          <span className="text-[10px] lg:text-[11px] font-semibold text-mv-muted">
            {count}
          </span>
        )}
        {note && (
          <span className="rounded bg-mv-amber-bg px-[5px] py-[2px] text-[7.5px] lg:text-[8.5px] font-extrabold uppercase tracking-[.06em] text-mv-amber">
            {note}
          </span>
        )}
        {open ? (
          <ChevronUp
            size={15}
            className="ml-auto shrink-0 text-mv-muted"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            size={15}
            className="ml-auto shrink-0 text-mv-muted"
            aria-hidden="true"
          />
        )}
      </button>

      {open && <div className="pt-[6px]">{children}</div>}
    </div>
  );
}

/**
 * Picks out the matched run in brand green wherever it falls — "S**up**reme",
 * not just prefixes. `mv-green-deep` rather than `mv-green`: the lighter brand
 * green does not hold contrast at 13px on white.
 */
function Highlighted({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <span className="font-bold text-mv-green-deep">
        {text.slice(at, at + needle.length)}
      </span>
      {text.slice(at + needle.length)}
    </>
  );
}

/** The green All / None sweeps above a list. */
function BulkAction({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-[10.5px] lg:text-[11.5px] font-bold text-mv-green-deep hover:underline"
    >
      {children}
    </button>
  );
}

/*
 * The radio and checkbox are drawn rather than styled natively: `accent-color`
 * cannot produce the mock's hollow ring with a green dot, and it leaves the
 * unchecked border the platform grey. The real input sits behind each of these
 * in `sr-only`, so keyboard and screen-reader behaviour is the browser's.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the commented-out My leases section
function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-[2px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border-2 ${
        checked ? "border-mv-green-deep" : "border-[#c7cbd1]"
      }`}
    >
      {checked && (
        <span className="h-[7px] w-[7px] rounded-full bg-mv-green-deep" />
      )}
    </span>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
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

function ProBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-[3px] rounded bg-mv-amber-bg px-[5px] py-[2px] text-[8px] lg:text-[9px] font-extrabold uppercase leading-none tracking-[.06em] text-mv-amber">
      <Lock size={8} strokeWidth={3} aria-hidden="true" />
      Pro
    </span>
  );
}
