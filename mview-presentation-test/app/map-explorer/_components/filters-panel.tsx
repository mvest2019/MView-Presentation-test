"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCountyListMap,
  nextOffset,
  getFieldListMap,
  getMapSearch,
  getOperatorListMap,
  getPlayTypeListMap,
  getWellStatusListMap,
  getWellTypeListMap,
  type MapFilterItem,
} from "@/lib/map-api";


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
 * The count is optional: a facet that returns no tally should show none, and a
 * "0" would read as data rather than as the absence of it.
 */
type FilterItem = { name: string; count?: number; id?: string };

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

/*
 * The sections themselves — id, label and how each behaves. Every list now
 * comes from the API, so `items` starts empty and is filled in by `sections`
 * below; the static rows that stood in for them while there was no endpoint
 * are gone.
 */
/** How many operators arrive at a time, and how long typing settles first. */
const OPERATOR_PAGE = 50;
const OPERATOR_FIND_WAIT = 260;

/** How close to the end of a paged list counts as having reached it. */
const NEAR_END = 48;

export const FILTER_SECTIONS: FilterSection[] = [
  { id: "county", label: "County", searchable: true, defaultOpen: true, items: [] },
  { id: "operator", label: "Operator", searchable: true, items: [] },
  { id: "well-type", label: "Well type", items: [] },
  { id: "status", label: "Well status", items: [] },
  { id: "play-type", label: "Play type", items: [] },
  { id: "field", label: "Field", searchable: true, items: [] },
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

/*
 * The matched-wells parameter each section filters on.
 *
 * Two of the section ids are not the API's names for them — `well-type` is
 * `wtype` and `play-type` is `play` — so Apply sent keys the endpoint does not
 * accept and those two filters did nothing. The mapping lives here rather than
 * renaming the sections, because the ids are also the keys of the checkbox
 * state and the notices.
 */
/*
 * The two facets the endpoint matches by id rather than by name. The rows
 * still show the name — nobody searches for operator 665748 — so the id is
 * looked up from the loaded list when Apply builds the request.
 */
const ID_FACETS = new Set(["operator", "field"]);

/*
 * Rows a facet may show before it scrolls inside itself.
 *
 * Eight is about the tallest a section can be and still leave the ones below
 * it reachable without scrolling the whole rail. Short lists — the three well
 * types, say — stay open in full, because a scrollbar on four rows is furniture
 * around nothing.
 */
const LONG_LIST = 8;

const SECTION_FACETS: Record<string, string> = {
  county: "county",
  operator: "operator",
  "well-type": "wtype",
  status: "status",
  "play-type": "play",
  field: "field",
};

/** The matched-wells parameter each search type filters on. */
const SEARCH_FACETS: Record<string, string | undefined> = {
  county: "county",
  operator: "operator",
  lease: "lease",
};

type Suggestion = {
  key: string;
  label: string;
  /** The badge on the right — which list the hit came from. */
  kind: string;
  sectionId?: string;
  leaseId?: string;
  /*
   * How to ask the map for this hit: the matched-wells parameter, and the
   * value it takes. They differ by type — a lease is found by its key, a
   * county and an operator by name — so the pairing is decided where the
   * results arrive rather than where they are used.
   */
  facet?: string;
  param?: string;
  /**
   * The lease's own number, or numbers, as the service reports them.
   *
   * A lease name is not unique — "AVERLY" is two leases in two districts —
   * and the number is what tells them apart, so it is shown beside the name
   * rather than left in the payload.
   */
  note?: string;
};

type FiltersPanelProps = {
  /**
   * Fired by Apply with what is ticked, keyed by facet. The panel does not
   * fetch: the map owns what it draws, so it makes the request and decides
   * what to do with the answer.
   */
  onApply?: (filters: Record<string, string[]>) => void;
  /**
   * The filter the page was opened with, from the address.
   *
   * Keyed by the API's facet names, values as the API takes them — so an
   * operator is an id here and a name in the list, which is why this is
   * applied only once the lists have landed.
   */
  opening?: Record<string, string[]>;
  onCollapse?: () => void;
  /**
   * Turns the whole card off while the map is busy.
   *
   * A scrim rather than an opacity on the card: fading the card itself makes
   * it translucent, and the map shows straight through a panel that is
   * supposed to be sitting on top of it. This keeps the white background and
   * greys only what is printed on it.
   */
  disabled?: boolean;
  /** Positioning; the panel places itself nowhere on its own. */
  className?: string;
  /**
   * The height the caller measured off the map, in pixels. An inline style
   * because it is a measurement, not a design decision — and because it must
   * beat any class that would have the card size itself from its content.
   */
  style?: React.CSSProperties;
};

export function FiltersPanel({
  onApply,
  opening,
  onCollapse,
  disabled,
  className = "",
  style,
}: FiltersPanelProps) {
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
            items: counties.map(({ value, count, id }) => ({
              name: value,
              count,
              id,
            })),
          };
        }
        if (section.id === "operator") {
          return {
            ...section,
            items: operators.map(({ value, count, id }) => ({
              name: value,
              count,
              id,
            })),
          };
        }
        if (section.id === "well-type") {
          return {
            ...section,
            items: wellTypes.map(({ value, count, id }) => ({
              name: value,
              count,
              id,
            })),
          };
        }
        if (section.id === "field") {
          return {
            ...section,
            items: fields.map(({ value, count, id }) => ({
              name: value,
              count,
              id,
            })),
          };
        }
        if (section.id === "play-type") {
          return {
            ...section,
            items: playTypes.map(({ value, count, id }) => ({
              name: value,
              count,
              id,
            })),
          };
        }
        if (section.id === "status") {
          return {
            ...section,
            items: wellStatuses.map(({ value, count, id }) => ({
              name: value,
              count,
              id,
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

  /*
   * The operators, a page at a time.
   *
   * There are twenty-two thousand of them. Asked for in one request it was a
   * couple of megabytes and a couple of thousand rows drawn into a panel that
   * shows eight — so the list arrives fifty at a time, with Show more under
   * it, and the Find box asks the service rather than sifting the fifty in
   * hand.
   */
  const [operatorsTotal, setOperatorsTotal] = useState(0);
  const [operatorFind, setOperatorFind] = useState("");
  const [operatorsMore, setOperatorsMore] = useState(false);
  /*
   * Set when a page comes back with nothing new in it.
   *
   * The end of the list, or a service that will not go further — either way
   * asking again returns the same rows, and a list at the bottom of its
   * scroll would ask on every frame.
   */
  const operatorsDone = useRef(false);
  /* Only the newest search may fill the list — a slow one for "ex" must not
     land on top of the answer for "exxon". */
  const operatorRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const request = ++operatorRequest.current;
    const find = operatorFind.trim();

    /* A beat before asking, so a name being typed is one request and not
       one per letter. Nothing typed asks at once — that is the opening
       list. */
    const wait = setTimeout(
      () => {
        setOperatorsLoading(true);
        operatorsDone.current = false;

        getOperatorListMap({
          limit: OPERATOR_PAGE,
          offset: 0,
          q: find || undefined,
        })
          .then((page) => {
            if (cancelled || request !== operatorRequest.current) return;
            setOperators(page.items);
            setOperatorsTotal(page.total);
            setOperatorsError(null);
          })
          .catch((error: unknown) => {
            if (cancelled || request !== operatorRequest.current) return;
            setOperatorsError(
              error instanceof Error
                ? error.message
                : "Could not load operators.",
            );
          })
          .finally(() => {
            if (!cancelled && request === operatorRequest.current) {
              setOperatorsLoading(false);
            }
          });
      },
      find ? OPERATOR_FIND_WAIT : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(wait);
    };
  }, [operatorFind]);

  /*
   * The next page, appended — asked for when the reader reaches the end of
   * the list rather than by pressing anything.
   */
  const loadMoreOperators = useCallback(() => {
    if (operatorsMore || operatorsDone.current) return;
    /* Everything there is, already in hand. */
    if (operatorsTotal > 0 && operators.length >= operatorsTotal) return;

    const request = operatorRequest.current;
    setOperatorsMore(true);

    getOperatorListMap({
      limit: OPERATOR_PAGE,
      offset: nextOffset(operators.length),
      q: operatorFind.trim() || undefined,
    })
      .then((page) => {
        /* A search that landed while this was out has replaced the list; its
           next page is not this one. */
        if (request !== operatorRequest.current) return;
        setOperators((current) => {
          /*
           * Only what is not already listed.
           *
           * Two operators can share a name — the Commission's register has
           * several "EXXON CORP." under different numbers — and a service
           * that reads `offset` as a row rather than a page hands back a
           * page that overlaps the last one. Either way the list must not
           * hold the same row twice: React keys off it, and a repeated key
           * is a row that can be dropped or duplicated on the next redraw.
           */
          const seen = new Set(current.map((item) => item.id ?? item.value));
          const fresh = page.items.filter(
            (item) => !seen.has(item.id ?? item.value),
          );
          /* Nothing new means there is no more to be had; stop asking. */
          if (fresh.length === 0) {
            operatorsDone.current = true;
            return current;
          }
          return [...current, ...fresh];
        });
        setOperatorsTotal(page.total);
      })
      .catch(() => {
        /* The list on screen stands, and the next scroll asks again. */
      })
      .finally(() => setOperatorsMore(false));
  }, [operators.length, operatorsTotal, operatorsMore, operatorFind]);

  const [query, setQuery] = useState("");
  /*
   * Bumped by Clear filters to rebuild the sections.
   *
   * Each section's Find… box is its own state, held inside the section, so
   * nothing out here can empty it. Clearing left "kar" in the county box with
   * every county unticked — a list filtered to one row, for a filter that had
   * just been taken off. A new key is the one way to reach it.
   */
  const [sectionsResetAt, setSectionsResetAt] = useState(0);


  /*
   * What the search API returned for the box at the top of the panel. Only
   * this box goes to the network — the Find… box inside each section still
   * filters the rows already on screen.
   */
  const [searchHits, setSearchHits] = useState<Suggestion[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  /** Ticked or unticked since the last Apply. */
  const [dirty, setDirty] = useState(false);
  /*
   * What a searched-for row filters by, remembered by the name it shows.
   *
   * Picking a search result also ticks its box, and the box only holds the
   * name. Operator and field filter by id, and the id normally comes from the
   * loaded facet list — but a searched-for operator is usually not in that
   * list, which is why it was searched for. Without this, pressing Apply
   * afterwards would fall back to the name and match nothing.
   */
  const [pickedParams, setPickedParams] = useState<
    Record<string, Record<string, string>>
  >({});
  /*
   * The query the box was filled with by picking a result.
   *
   * Picking writes the label into the input, which looks to the effect below
   * exactly like typing it — so choosing "KARNES" fired a second search for
   * "KARNES" whose answer was the thing just chosen. This is how the effect
   * tells the two apart.
   */
  const pickedQueryRef = useRef<string | null>(null);
  /**
   * Whether the search alone is what the map is filtered by.
   *
   * A hit can be a filter without ticking anything: it carries its own facet
   * and parameter, and not every one of them has a row in the sections below.
   * When that happens nothing in `checked` changes, so the effect that watches
   * for the last box being unticked never fires — and clearing the box left
   * the wells on the map with nothing in the panel to explain them.
   */
  const searchAloneRef = useRef(false);
  /*
   * What the last pick ticked. Clearing the box has to undo the pick as well
   * as the text — a filter still on the map with an empty search box is the
   * panel disagreeing with what is drawn.
   */
  const lastPickRef = useRef<{ sectionId: string; label: string } | null>(null);
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

    // Filled in by a pick, not typed: the answer is already on screen.
    if (pickedQueryRef.current === needle) return;

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
              key: `${result.type}:${result.id ?? result.value}:${index}`,
              label: result.value || (result.label ?? ""),
              kind: SEARCH_KINDS[result.type] ?? result.type,
              sectionId: SEARCH_SECTIONS[result.type],
              facet: SEARCH_FACETS[result.type],
              /*
               * `id` first. The search reports the name in `value` and, where
               * the filter wants something else, the id alongside it — so an
               * operator comes back as KABCO OIL & GAS COMPANY with id 449245,
               * and it is the id that matches. Counties have no id and filter
               * by name, which `value` already is.
               */
              param: result.id ?? result.value,
              /* Leases only: an operator's id is an internal number and a
                 county has none, so neither is worth showing. The service
                 sends several keys comma-separated where one name covers more
                 than one lease. */
              note:
                result.type === "lease" && result.id
                  ? result.id.split(",").map((key) => key.trim()).join(", ")
                  : undefined,
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
  /*
   * What Apply would send: the ticked values, keyed by the API's name for each
   * facet. An untouched section is not a filter of "nothing", it is no filter
   * at all, so it is left out entirely — which also makes this empty exactly
   * when there is nothing to apply.
   */
  const selectedFilters = useMemo(() => {
    const idOf = new Map<string, Map<string, string>>();
    for (const section of sections) {
      idOf.set(
        section.id,
        new Map(
          section.items
            .filter((item) => item.id)
            // First wins: a name can appear twice with different ids — two
            // Spraberry fields, for instance — and the list is ordered by
            // well count, so the first is the larger of them.
            .reverse()
            .map((item) => [item.name, item.id as string]),
        ),
      );
    }

    return Object.fromEntries(
      Object.entries(checked)
        .map(([section, values]): [string, string[]] => {
          const ids = idOf.get(section);
          const useIds = ID_FACETS.has(section) && ids;

          return [
            SECTION_FACETS[section] ?? section,
            [...values].map((name) => {
              // A searched-for row knows its own id; the loaded list is the
              // fallback, and the name itself the last resort.
              const picked = pickedParams[section]?.[name];
              if (picked) return picked;
              return useIds ? (ids.get(name) ?? name) : name;
            }),
          ];
        })
        .filter(([, values]) => values.length > 0),
    );
  }, [checked, sections, pickedParams]);

  const hasSelection = Object.keys(selectedFilters).length > 0;

  /*
   * Apply is live while the boxes differ from what was last applied — not
   * only while something is ticked. Unticking the last box has to be
   * appliable too, or there is no way to take the wells back off the map.
   */
  const canApply = hasSelection || dirty;

  /*
   * Whether a filter is currently applied — which is what Clear is for.
   *
   * Derived rather than stored: the boxes match what was last applied exactly
   * when something is ticked and nothing has changed since. Ticking one more
   * makes it dirty, Apply lights up again and Clear steps aside, because at
   * that moment the map is not showing what the panel says.
   */
  const applied = hasSelection && !dirty;

  /*
   * Clearing the last box clears the map, without waiting for Apply.
   *
   * Apply exists to say "run this filter", and an empty filter is not one —
   * unticking everything is a request to stop filtering, and leaving the wells
   * up until a button is pressed makes the panel disagree with the map.
   *
   * "Was filtering" means the map, not the boxes. Read off the draft, ticking
   * a county and then unticking it — a change of mind, never applied — sent an
   * empty filter to a map that was not filtered, which cleared a filter that
   * was never there and threw the view back to the state extent.
   */
  const wasFiltering = useRef(false);

  useEffect(() => {
    if (hasSelection || !wasFiltering.current) return;

    wasFiltering.current = false;
    setDirty(false);
    onApply?.({});
  }, [hasSelection, onApply]);

  /*
   * Ticks the boxes a shared link filtered by, once.
   *
   * In a frame rather than in the effect body: this is a setState from an
   * effect, which the compiler's rule forbids outright and which is fine one
   * tick later. The guard is a ref so a second list arriving does not tick
   * everything twice.
   */
  const openingApplied = useRef(false);

  useEffect(() => {
    if (openingApplied.current) return;
    if (!opening || Object.keys(opening).length === 0) return;
    /* Nothing to match against yet. */
    if (sections.every((section) => section.items.length === 0)) return;

    /*
     * A microtask, not an animation frame.
     *
     * The frame was being cancelled by this effect's own cleanup: `sections`
     * is rebuilt whenever a facet list lands and the map re-renders many
     * times a second while it loads, so the next render arrived before the
     * next paint, every time, and the ticks were never applied. A microtask
     * runs before that can happen — and it is still not the effect body,
     * which is what the compiler's rule is about.
     */
    queueMicrotask(() => {
      const ticks: Record<string, Set<string>> = {};
      const params: Record<string, Record<string, string>> = {};

      for (const section of sections) {
        const facet = SECTION_FACETS[section.id] ?? section.id;
        const wanted = opening[facet];
        if (!wanted || wanted.length === 0) continue;

        const chosen = new Set<string>();

        for (const value of wanted) {
          /* Operators and fields travel as ids; everything else as its own
             name. Either way what is ticked is the row's name. */
          const row = ID_FACETS.has(section.id)
            ? section.items.find((item) => item.id === value)
            : section.items.find(
                (item) => item.name.toLowerCase() === value.toLowerCase(),
              );

          if (!row) continue;
          chosen.add(row.name);
          if (row.id) {
            params[section.id] = { ...params[section.id], [row.name]: row.id };
          }
        }

        if (chosen.size > 0) ticks[section.id] = chosen;
      }

      /* Nothing matched yet — the list this filter names has not arrived.
         The guard stays down so the next list to land tries again; marking it
         done here was what left the boxes empty while the map drew the
         filter. */
      if (Object.keys(ticks).length === 0) return;

      openingApplied.current = true;
      setChecked((previous) => ({ ...previous, ...ticks }));
      setPickedParams((previous) => ({ ...previous, ...params }));
      /* The map is already showing this, so it is applied, not a draft. */
      setDirty(false);
      wasFiltering.current = true;
    });
  }, [opening, sections]);

  function applySuggestion(suggestion: Suggestion) {
    // A search hit is a filter in its own right: picking one asks the map for
    // those wells, rather than only ticking a box to be applied afterwards.
    if (suggestion.facet && suggestion.param) {
      /*
       * Added to what is already applied, not instead of it — and that goes
       * for its own facet too.
       *
       * Sent alone, picking an operator threw away the county that was
       * ticked; sent as the only value of its facet, searching for a second
       * county threw away the first. Both left the map showing one thing
       * while the panel's boxes said another. A pick is one more value on one
       * facet, so it joins the list rather than becoming it.
       */
      const already = selectedFilters[suggestion.facet] ?? [];
      /* A pick applies itself, so the map is filtered from here too. */
      wasFiltering.current = true;
      onApply?.({
        ...selectedFilters,
        [suggestion.facet]: already.includes(suggestion.param)
          ? already
          : [...already, suggestion.param],
      });
      /* No section row to tick means nothing else will undo this. */
      searchAloneRef.current = !suggestion.sectionId;
    }

    if (suggestion.leaseId) {
      setSelectedLease(suggestion.leaseId);
      setLeasesOpen(true);
    } else if (suggestion.sectionId) {
      const sectionId = suggestion.sectionId;

      if (suggestion.param) {
        const param = suggestion.param;
        setPickedParams((previous) => ({
          ...previous,
          [sectionId]: { ...previous[sectionId], [suggestion.label]: param },
        }));
      }

      setOpenSections((previous) => new Set(previous).add(sectionId));
      /* Ticked as well as, not instead of: the row the search found is one
         more county — or operator, or field — beside whatever was ticked
         before it. */
      setChecked((previous) => ({
        ...previous,
        [sectionId]: new Set(previous[sectionId]).add(suggestion.label),
      }));
    }

    /*
     * The box now holds the result's own name, which is rarely the text that
     * was typed to find it — "KARNE" finds "KARNES". `searching` compares the
     * box against the query the results answer, so without this line those two
     * never match again and the dropdown is stuck saying "Searching…" over a
     * blurred list, for a request that will never be made: the effect below
     * skips a query that was filled in by a pick.
     */
    pickedQueryRef.current = suggestion.label.trim();
    lastPickRef.current = suggestion.sectionId
      ? { sectionId: suggestion.sectionId, label: suggestion.label }
      : null;
    setSearchedFor(suggestion.label.trim());
    setQuery(suggestion.label);
    setSuggestionsOpen(false);
  }

  /*
   * Empties the box, and takes the pick with it.
   *
   * Whatever the pick ticked is unticked here; if that leaves nothing ticked
   * anywhere, the effect above notices and clears the map without waiting for
   * Apply. If other sections are still ticked, Apply lights up instead — the
   * search is one filter among several, not a master switch.
   *
   * Where the hit ticked nothing at all — it filtered the map on its own — the
   * map is cleared here, because no box changing means that effect will not
   * run. The wells come off and the bubbles come back, which is what emptying
   * the box asks for.
   */
  function clearSearch() {
    const pick = lastPickRef.current;

    if (searchAloneRef.current) {
      searchAloneRef.current = false;
      setDirty(false);
      wasFiltering.current = false;
      onApply?.({});
    }

    if (pick) {
      setChecked((previous) => {
        const next = new Set(previous[pick.sectionId]);
        next.delete(pick.label);
        return { ...previous, [pick.sectionId]: next };
      });
      setPickedParams((previous) => {
        const section = { ...previous[pick.sectionId] };
        delete section[pick.label];
        return { ...previous, [pick.sectionId]: section };
      });
      setDirty(true);
    }

    lastPickRef.current = null;
    pickedQueryRef.current = null;
    setQuery("");
    setSearchHits([]);
    setSearchError(null);
    setSearchedFor("");
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
    setDirty(true);
    setChecked((previous) => {
      const next = new Set(previous[sectionId]);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...previous, [sectionId]: next };
    });
  }

  return (
    <div
      /*
        Everything about this card's shape — two rows, the overflow, the
        height it is given — lives in `.mv-filters-card` and `.mv-filters-rail`
        in `globals.css`, as plain CSS. Only the paint is utilities.

        That is deliberate. A utility class exists because a build step
        generated it; if one of `h-[calc(100%-36px)]` or
        `grid-rows-[minmax(0,1fr)_auto]` is ever missing from the stylesheet,
        the card silently falls back to sizing itself from its content — a
        short card with the Apply button stranded in the middle of it. Written
        by hand, in a file that is always served whole, there is nothing to
        miss.
      */
      style={style}
      /* Rounded on the right only: the other three sides are the map's own
         edges, and a rounded corner against a straight frame reads as a card
         that has come loose. */
      className={`mv-filters-card w-[196px] rounded-r-xl border-y-0 border-l-0 border-r border-mv-line bg-white shadow-mv-lg md:w-[224px] lg:w-[252px] ${className}`}
    >
      {/* Sits over the card and takes the clicks, so nothing inside needs a
          `disabled` of its own — there are six facets, two search boxes and a
          hundred checkboxes in here. */}
      {disabled && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-30 cursor-not-allowed rounded-xl bg-white/65"
        />
      )}

      <div className="mv-thin-scroll mv-filters-body px-[14px]">
        {/* ---------------- header ---------------- */}
        <div className="flex items-center gap-2 pb-3 pt-[14px]">
          <h2 className="text-[14px] lg:text-[15px] font-bold leading-none text-mv-ink">
            Search &amp; filters
          </h2>
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
              /*
               * Clicking back into a box that already holds a picked result
               * reopens nothing: the list would only offer the answer that is
               * already in the box. Typing opens it again.
               */
              onFocus={() => {
                if (pickedQueryRef.current !== query.trim()) {
                  setSuggestionsOpen(true);
                }
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Lease, operator, or county"
              className="min-w-0 flex-1 border-0 bg-transparent text-[11.5px] lg:text-[12.5px] leading-tight text-mv-ink outline-none placeholder:text-mv-muted"
            />
            {query !== "" && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear the search"
                title="Clear the search"
                className="grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f1f2f4] hover:text-mv-red"
              >
                <X size={12} strokeWidth={2.5} aria-hidden="true" />
              </button>
            )}

            <Search
              size={14}
              className="shrink-0 text-mv-muted group-focus-within:text-mv-green-deep"
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
                    className="h-[16px] w-[16px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
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
                    /* The row is 200px wide and an operator's name is often
                       longer, so what is on screen is "MARATHON O…" — which
                       could be any of several. Hovering gives the whole
                       name. */
                    title={`${suggestion.label}${
                      suggestion.note ? ` (${suggestion.note})` : ""
                    } · ${suggestion.kind}`}
                    className={`flex w-full cursor-pointer items-center gap-2 px-3 py-[9px] text-left ${
                      index === activeSuggestion ? "bg-[#f2f8f5]" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px] lg:text-[13px] text-mv-slate">
                      <Highlighted text={suggestion.label} query={query} />
                      {suggestion.note && (
                        <span className="text-mv-muted">
                          {" "}
                          ({suggestion.note})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded bg-[#f1f2f4] px-[7px] py-[3px] text-[8.5px] lg:text-[9.5px] font-bold uppercase tracking-[.06em] text-mv-muted">
                      {suggestion.kind}
                    </span>
                  </button>
                </li>
              ))}

              {/* Nothing to show yet.
                  A first search has no previous answer to blur, so the wait is
                  drawn as the rows that are coming: three bars the width of a
                  name and its kind, pulsing. A line of text on its own left the
                  panel looking broken for the second or two the service takes. */}
              {suggestions.length === 0 && searching && (
                <li aria-hidden="true" className="px-3 py-[7px]">
                  {[0.85, 0.62, 0.73].map((width, row) => (
                    <span
                      key={row}
                      className="flex animate-pulse items-center gap-2 py-[7px]"
                      style={{ animationDelay: `${row * 140}ms` }}
                    >
                      <span
                        className="h-[9px] rounded-full bg-[#eceff1]"
                        style={{ width: `${width * 100}%` }}
                      />
                      <span className="ml-auto h-[13px] w-[42px] shrink-0 rounded bg-[#f4f6f7]" />
                    </span>
                  ))}
                </li>
              )}

              {suggestions.length === 0 && searching && (
                <li className="flex items-center gap-2 border-t border-mv-line px-3 py-[7px] text-[10.5px] lg:text-[11.5px] font-semibold text-mv-muted">
                  <span
                    aria-hidden="true"
                    className="h-[16px] w-[16px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
                  />
                  Searching leases, operators and counties…
                </li>
              )}

              {suggestions.length === 0 && !searching && (
                <li className="px-3 py-[11px]">
                  {searchError ? (
                    <span className="flex items-start gap-2 text-[12px] lg:text-[12.5px] leading-snug text-mv-red">
                      <TriangleAlert
                        size={13}
                        strokeWidth={2}
                        className="mt-[1px] shrink-0"
                        aria-hidden="true"
                      />
                      {searchError}
                    </span>
                  ) : query.trim().length < SEARCH_MIN_CHARS ? (
                    <span className="text-[12px] lg:text-[13px] text-mv-muted">
                      Keep typing — {SEARCH_MIN_CHARS} letters to search.
                    </span>
                  ) : (
                    <span className="block">
                      <span className="block text-[12px] lg:text-[13px] font-semibold text-mv-ink">
                        No matches for &ldquo;{query.trim()}&rdquo;
                      </span>
                      <span className="mt-[3px] block text-[11px] lg:text-[11.5px] leading-snug text-mv-muted">
                        Leases are named as the Commission records them, often
                        the landowner&rsquo;s surname.
                      </span>
                    </span>
                  )}
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
            <BulkAction onClick={() => setSelectedLease(null)}>
              Clear all
            </BulkAction>
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
            key={`${section.id}-${sectionsResetAt}`}
            section={section}
            notice={notices[section.id]}
            open={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            checked={checked[section.id]}
            onToggleItem={(name) => toggleItem(section.id, name)}
            /* Operators are the one paged facet — see the loader above. */
            {...(section.id === "operator"
              ? {
                  onFind: setOperatorFind,
                  total: operatorsTotal,
                  onMore: loadMoreOperators,
                  loadingMore: operatorsMore,
                }
              : null)}
          />
        ))}

        <div className="h-2" />
      </div>

      {/* ---------------- apply ----------------
          Outside the scroll container, so the sections scroll under it and
          this stays put — the button has to be reachable without scrolling to
          the end of two hundred and seventy counties. */}
      {/* The card's second row, so it is at the bottom by definition rather
          than by being pushed there. */}
      <div className="border-t border-mv-line bg-white px-[14px] pb-[12px] pt-[12px]">
        <button
          type="button"
          disabled={!canApply}
          onClick={() => {
            setDirty(false);
            /* From here the map is showing this, so unticking the last box
               has something to undo. */
            wasFiltering.current = Object.keys(selectedFilters).length > 0;
            onApply?.(selectedFilters);
          }}
          className="w-full rounded-lg px-3 py-[9px] text-[12.5px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep enabled:cursor-pointer enabled:bg-mv-green-deep enabled:text-white enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#eef1ee] disabled:text-mv-muted"
        >
          Apply filters
        </button>

        {/* Only once a filter is on the map. Clearing takes every box off,
            which the effect above turns into an empty apply — the same path
            unticking the last box already takes, rather than a second way of
            doing the same thing. */}
        {applied && (
          <button
            type="button"
            onClick={() => {
              setChecked((previous) =>
                Object.fromEntries(
                  Object.keys(previous).map((section) => [
                    section,
                    new Set<string>(),
                  ]),
                ),
              );
              setPickedParams({});
              /* The box goes with the boxes. It holds the name of a filter
                 that is being taken off — left there, the panel reads as
                 filtered by an operator while the map shows the state. */
              lastPickRef.current = null;
              pickedQueryRef.current = null;
              searchAloneRef.current = false;
              setQuery("");
              setSearchHits([]);
              setSearchError(null);
              setSearchedFor("");
              setSuggestionsOpen(false);
              setSelectedLease(null);
              /* And the Find… box inside each section, which only a rebuild
                 can reach. */
              setSectionsResetAt((count) => count + 1);
            }}
            className="mt-2 w-full cursor-pointer rounded-lg border border-mv-red px-3 py-[8px] text-[12.5px] font-semibold text-mv-red hover:bg-mv-red-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-red"
          >
            Clear filters
          </button>
        )}
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
  notice,
  onFind,
  total,
  onMore,
  loadingMore,
}: {
  section: FilterSection;
  open: boolean;
  onToggle: () => void;
  checked: Set<string>;
  onToggleItem: (name: string) => void;
  /** Shown in place of the list — "loading", or why there is nothing. */
  notice?: string | null;
  /**
   * Where the Find box goes for a section whose list is paged.
   *
   * Given one, the box asks the service instead of sifting what is in hand —
   * which is the only way to find the twenty-thousandth operator when fifty
   * are loaded. Without it the box filters locally, as every other section
   * still does.
   */
  onFind?: (query: string) => void;
  /** How many rows there are in all, where that is more than are loaded. */
  total?: number;
  /** Fetches the next page. */
  onMore?: () => void;
  loadingMore?: boolean;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    /* A paged list is filtered by the service; what arrived is the answer. */
    if (onFind) return section.items;

    const needle = query.trim().toLowerCase();
    if (!needle) return section.items;
    return section.items.filter((item) =>
      item.name.toLowerCase().includes(needle),
    );
  }, [onFind, query, section.items]);

  return (
    <SectionShell
      label={section.label}
      note={section.note}
      open={open}
      onToggle={onToggle}
    >
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
            onChange={(event) => {
              setQuery(event.target.value);
              onFind?.(event.target.value);
            }}
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
          reach.

          Measured by how many rows there actually are, not by whether the
          section has a Find… box. Well type has no search and twenty-five
          entries, so the old test missed it and that one section pushed
          everything below it out of reach. */}
      <div
        /*
         * The next page is asked for by reading, not by pressing: when the
         * last rows come into view the following fifty are already on their
         * way. `NEAR_END` is the run left below the fold that counts as
         * having reached it.
         */
        onScroll={
          onMore
            ? (event) => {
                const box = event.currentTarget;
                if (
                  box.scrollTop + box.clientHeight >=
                  box.scrollHeight - NEAR_END
                ) {
                  onMore();
                }
              }
            : undefined
        }
        className={
          visible.length > LONG_LIST
            ? "mv-thin-scroll max-h-[248px] overflow-y-auto"
            : ""
        }
      >
      {!notice &&
        visible.map((item) => (
        <label
          /* The number where the register gives one: two operators can share
             a name, and a name alone is then the same key twice. */
          key={item.id ?? item.name}
          className="flex cursor-pointer items-center gap-2 py-[5px]"
        >
          {/*
            The real checkbox sits exactly where the drawn one is, invisible
            over it, rather than being tucked away with `sr-only`.

            `sr-only` positions the input absolutely as a 1×1 box with a -1px
            margin. Clicking the label focuses it, and the browser then scrolls
            that box into view — which is not the row you clicked, so the list
            jumped. Over the drawn box it is already in view, and there is
            nothing to scroll to.
          */}
          <span className="relative grid h-[15px] w-[15px] shrink-0 place-items-center">
            <input
              type="checkbox"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              checked={checked.has(item.name)}
              onChange={() => onToggleItem(item.name)}
            />
            <Checkbox checked={checked.has(item.name)} />
          </span>
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

      {/* Where the list has got to. Worth saying even though nothing has to
          be pressed: fifty rows that stop with no word about it read as a
          list of fifty. */}
      {!notice && onMore && total !== undefined && total > 0 && (
        <p className="flex items-center gap-[6px] pt-[6px] text-[11.5px] text-mv-muted lg:text-[12px]">
          {loadingMore && (
            <span
              aria-hidden="true"
              className="h-[11px] w-[11px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
            />
          )}
          {section.items.length.toLocaleString("en-US")} of{" "}
          {total.toLocaleString("en-US")}
          {section.items.length < total && !loadingMore
            ? " · scroll for more"
            : ""}
        </p>
      )}

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
        <span className="text-[11px] lg:text-[12px] font-extrabold uppercase tracking-[.1em] text-mv-ink">
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

/*
 * The radio and checkbox are drawn rather than styled natively: `accent-color`
 * cannot produce the mock's hollow ring with a green dot, and it leaves the
 * unchecked border the platform grey. The real input sits over each of these,
 * transparent and the same size, so keyboard and screen-reader behaviour is
 * the browser's — and so focusing one scrolls to the row it belongs to rather
 * than to a 1×1 box parked somewhere else.
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
