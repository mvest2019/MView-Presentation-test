"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import {
  OPERATOR_ENDPOINTS,
  publicOperatorApiBaseUrl,
  TEMP_MEMBER_ID,
  type OperatorSearchResponse,
} from "@/lib/operator-api-types";
import {
  ALL_PLAYS,
  buildOperatorSearchPayload,
  DEFAULT_FILTERS,
  EMPTY_RESULT_PAGE,
  PAGE_SIZE,
  QUICK_FILTERS,
  toOperatorRows,
  toResultPage,
  type OperatorFilters,
  type OperatorResultPage,
  type OperatorSortKey,
  type OperatorStatusFilter,
  type QuickFilterKey,
} from "@/lib/operator-search";
import {
  DEFAULT_COLUMNS,
  type OperatorColumns,
} from "@/lib/operator-types";

/**
 * All state for the Operator Listing, and the only place the search API is
 * called.
 *
 *   filters
 *     -> buildOperatorSearchPayload()   (the one payload builder)
 *     -> POST {NEXT_PUBLIC_OPERATOR_API_BASE_URL}/api/v1/operators/search
 *
 * The browser calls the operator API directly, as requested, so the request in the
 * network tab IS the API request — one hop, the real host, the real endpoint.
 *
 * THIS REQUIRES CORS ON THE API. The endpoint currently answers a preflight
 * without `Access-Control-Allow-Origin` for every origin tried, production
 * included, so the browser discards the response and the table falls to its error
 * state until the API sends that header. `app/api/operators/search/route.ts` is
 * the same-origin forwarder that does work today; switching back is a one-line
 * change to the `fetch` URL below.
 *
 * Calling from the browser also gives up two server-side guarantees: `member_id`
 * and `visitorId` were pinned by the forwarder, and a client can now set either —
 * `member_id: 1` unmasks the gated rows 4-10.
 *
 * `operator-page.tsx` renders what this returns and never builds a payload or
 * touches the API.
 *
 * REQUEST DISCIPLINE
 *
 *  · One effect, keyed on the whole filter object, so every control goes through
 *    the same path and the payload is always complete. No handler fetches
 *    directly, so a single change cannot produce two calls.
 *  · The search box is debounced (300ms, matching `blog-toolbar.tsx`) so typing
 *    "permian" is one request, not seven. Every other control fires immediately —
 *    a click is a deliberate action.
 *  · Each run owns an `AbortController` and the cleanup aborts it, so a superseded
 *    filter change or an unmount cancels the in-flight request. An aborted request
 *    writes no state, which is what makes a stale response harmless.
 *  · Previous rows stay on screen while a request is in flight; the table draws a
 *    skeleton over them. Emptying the body between requests would collapse the
 *    card and cost CLS.
 */

/* --- column preferences: a localStorage-backed external store ------------- */

const STORAGE_KEY = "mv_kyo_cols";

let storedColumns: OperatorColumns | null = null;
const columnListeners = new Set<() => void>();

function parseColumns(raw: string | null): OperatorColumns {
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "oil" in parsed) {
      return { ...DEFAULT_COLUMNS, ...(parsed as Partial<OperatorColumns>) };
    }
  } catch {
    // Corrupt value — fall through to the defaults.
  }
  return DEFAULT_COLUMNS;
}

function readColumnStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getColumnSnapshot(): OperatorColumns {
  storedColumns ??= parseColumns(readColumnStorage());
  return storedColumns;
}

function subscribeToColumns(onStoreChange: () => void): () => void {
  columnListeners.add(onStoreChange);
  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    storedColumns = parseColumns(readColumnStorage());
    onStoreChange();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    columnListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeColumns(next: OperatorColumns): void {
  storedColumns = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the in-memory value still drives the UI.
  }
  for (const listener of columnListeners) listener();
}

/* --- applied-filter tags -------------------------------------------------- */

export type AppliedFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

const SORT_LABELS: Record<OperatorSortKey, string> = {
  oil: "Oil Produced",
  gas: "Gas Produced",
  cty: "Counties",
};

const SEARCH_DEBOUNCE_MS = 300;


export function useOperatorDirectory({
  playTypes,
  visitorId,
}: {
  playTypes: string[];
  /**
   * Read from the `guestUserID` cookie by the server component and passed in, so
   * the payload the client builds is complete. The route handler re-asserts it
   * from the cookie, so this value is for visibility, not for trust.
   */
  visitorId: string;
}) {
  const [filters, setFilters] = useState<OperatorFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState<OperatorResultPage>(EMPTY_RESULT_PAGE);
  const [hasError, setHasError] = useState(false);
  /** False until the first response lands, so "no results" cannot flash early. */
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  /**
   * The request is driven through a transition rather than a `setIsLoading(true)`
   * at the top of the effect. `isPending` is the same signal without the
   * synchronous state write that `react-hooks/set-state-in-effect` rightly flags,
   * and React keeps the current rows interactive while the next page resolves.
   */
  const [isPending, startTransition] = useTransition();

  const columns = useSyncExternalStore(
    subscribeToColumns,
    getColumnSnapshot,
    () => DEFAULT_COLUMNS,
  );

  /**
   * Only the search box needs debouncing, so it is the only thing delayed. Held
   * separately from `filters` so the input stays fully responsive while the
   * request waits.
   */
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.searchText);

  useEffect(() => {
    if (searchInput === filters.searchText) return;
    const timer = setTimeout(() => {
      setFilters((current) => ({
        ...current,
        searchText: searchInput,
        page: 1,
      }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, filters.searchText]);

  /**
   * Bumped to force a refetch when the filters have not changed — the "Try
   * again" path. Kept out of the payload; it only participates in the effect key.
   */
  const [reloadNonce, setReloadNonce] = useState(0);
  const retry = useCallback(() => setReloadNonce((n) => n + 1), []);

  /**
   * THE ONE REQUEST FLOW.
   *
   * Every control writes to `filters`; this single effect is the only thing that
   * issues a request. There is no second effect and no handler that fetches
   * directly, so a change cannot produce two calls, and the payload is built in
   * exactly one place.
   *
   * CANCELLATION. Each run owns an `AbortController`. The cleanup aborts it, which
   * React calls both when the dependencies change and when the component
   * unmounts — so a superseded filter change and a navigation away both cancel the
   * in-flight request, and the abort propagates through the route handler to the
   * operator API. An aborted request resolves to nothing: no state write, no error
   * state, no chance of a stale response overwriting a newer one. That replaces the
   * request-id bookkeeping this used to need.
   */
  useEffect(() => {
    const controller = new AbortController();

    startTransition(async () => {
      try {
        const response = await fetch(
          `${publicOperatorApiBaseUrl()}${OPERATOR_ENDPOINTS.search}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // The complete contract body, built by the shared builder.
            body: JSON.stringify(
              buildOperatorSearchPayload(filters, visitorId),
            ),
            signal: controller.signal,
          },
        );

        if (!response.ok) throw new Error(`search responded ${response.status}`);

        const { result, total_count } =
          (await response.json()) as OperatorSearchResponse;

        setPage(toResultPage(result, total_count, filters.page));
        setHasError(false);
        setHasLoadedOnce(true);
      } catch (error) {
        // Superseded or unmounted. Expected, and deliberately silent: leaving
        // `isLoading` as it is lets the replacement request own the UI.
        if (controller.signal.aborted) return;

        console.error("[operators] search request failed", error);
        setHasError(true);
        setHasLoadedOnce(true);
      }
    });

    return () => controller.abort();
  }, [filters, reloadNonce, visitorId]);

  /**
   * Loading until the first response lands, then only while a request is in
   * flight. Without the `hasLoadedOnce` half, the very first render would show
   * an empty table for a frame before the effect starts the transition.
   */
  const isLoading = isPending || !hasLoadedOnce;

  /* --- control handlers -------------------------------------------------- */

  /** Any filter change restarts at page 1; paging alone does not. */
  const patch = useCallback(
    (changes: Partial<OperatorFilters>, resetPage = true) => {
      setFilters((current) => ({
        ...current,
        ...changes,
        ...(resetPage ? { page: 1 } : null),
      }));
    },
    [],
  );

  const setSearch = useCallback((value: string) => setSearchInput(value), []);
  const setPlay = useCallback((play: string) => patch({ play }), [patch]);
  const setStatus = useCallback(
    (status: OperatorStatusFilter) => patch({ status }),
    [patch],
  );
  const setCounty = useCallback((county: string) => patch({ county }), [patch]);

  /**
   * Quick filters are independent booleans, not one selection: the API accepts
   * all four at once and expects `false` for the unselected ones.
   */
  const toggleQuick = useCallback((key: QuickFilterKey) => {
    setFilters((current) => ({
      ...current,
      quick: { ...current.quick, [key]: !current.quick[key] },
      page: 1,
    }));
  }, []);

  /** Re-clicking a column flips direction; a new column starts descending. */
  const toggleSort = useCallback((key: OperatorSortKey) => {
    setFilters((current) => ({
      ...current,
      sortKey: key,
      sortDir:
        current.sortKey === key && current.sortDir === "desc" ? "asc" : "desc",
      page: 1,
    }));
  }, []);

  const goToPage = useCallback(
    (next: number) => patch({ page: next }, false),
    [patch],
  );

  /** Resets every filter and the sort. Column choices are deliberately kept. */
  const clearFilters = useCallback(() => {
    setSearchInput(DEFAULT_FILTERS.searchText);
    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Export CSV — now the rows currently on screen.
   *
   * It used to write the whole filtered set, which was possible when every record
   * was already in the browser. The API is paginated and offers no bulk export,
   * so covering all matches would mean walking every page (3,095 active operators
   * is 310 requests). Exporting the current page is the honest version of the
   * same button; a real export needs a server-side endpoint.
   */
  /** In-flight guard, so a second click cannot start a duplicate export. */
  const exporting = useRef(false);

  /**
   * Export CSV.
   *
   * Calls the same search endpoint with the export payload — `{ member_id }` and
   * nothing else, as specified — then writes the response out with the columns the
   * table is currently showing, so the file matches what is on screen.
   *
   * The row set is whatever that payload returns; it is not the filtered view and
   * not the current page. See the note in the report about how many records the
   * endpoint actually sends back for this body.
   */
  const exportCsv = useCallback(async () => {
    if (exporting.current) return;
    exporting.current = true;

    try {
      const response = await fetch(
        `${publicOperatorApiBaseUrl()}${OPERATOR_ENDPOINTS.search}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member_id: TEMP_MEMBER_ID }),
        },
      );

      if (!response.ok) throw new Error(`export responded ${response.status}`);

      const { result } = (await response.json()) as OperatorSearchResponse;
      const rows = toOperatorRows(result);

      // Same columns as the table, honouring the Columns toggles so the file has
      // the columns the visitor can see.
      const header = ["Rank", "Operator Name", "Operator No."];
      if (columns.oil) header.push("Oil Produced");
      if (columns.gas) header.push("Gas Produced");
      if (columns.cty) header.push("Counties");
      if (columns.leases) header.push("Leases count");
      if (columns.lastProduction) header.push("Last production");
      if (columns.status) header.push("Status");

      const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const lines = [header.join(",")];

      rows.forEach((row, index) => {
        const line = [String(index + 1), cell(row.name), cell(row.operatorNumber)];
        if (columns.oil) line.push(cell(row.oil));
        if (columns.gas) line.push(cell(row.gas));
        if (columns.cty) line.push(cell(row.counties));
        if (columns.leases) line.push(cell(row.leases));
        if (columns.lastProduction) line.push(cell(row.lastProduction));
        if (columns.status) line.push(cell(row.status));
        lines.push(line.join(","));
      });

      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "know-your-operators.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      // Logged rather than surfaced: the button has no error slot in the design,
      // and a failed export must not disturb the table the visitor is reading.
      console.error("[operators] CSV export failed", error);
    } finally {
      exporting.current = false;
    }
  }, [columns]);

  /* --- applied-filter tags ---------------------------------------------- */

  const appliedFilters = useMemo<AppliedFilter[]>(() => {
    const tags: AppliedFilter[] = [];

    // Must be a real selection, not just "different from the default". A `<select>`
    // whose options failed to load reports `""`, which is neither `ALL_PLAYS` nor a
    // play — testing only for inequality rendered a blank tag chip with a remove
    // button and nothing to remove.
    if (filters.play && filters.play !== ALL_PLAYS) {
      tags.push({
        id: "play",
        label: filters.play,
        onRemove: () => setPlay(DEFAULT_FILTERS.play),
      });
    }
    if (filters.searchText.trim()) {
      tags.push({
        id: "search",
        label: `“${filters.searchText.trim()}”`,
        onRemove: () => {
          setSearchInput("");
          patch({ searchText: "" });
        },
      });
    }
    for (const key of Object.keys(filters.quick) as QuickFilterKey[]) {
      if (!filters.quick[key]) continue;
      tags.push({
        id: `quick-${key}`,
        label: QUICK_FILTERS[key],
        onRemove: () => toggleQuick(key),
      });
    }
    /**
     * Shown whenever a status is actually constraining the results, including the
     * default `active` — that IS a filter narrowing 24,744 operators to 3,095, so
     * it belongs in the applied row rather than being invisible.
     *
     * `""` means "all statuses", which is the absence of a constraint, so it gets
     * no tag. Removing this one therefore sets `""`: the × widens the results
     * rather than bouncing back to the same value it already had.
     *
     * The dead "Clear all" this used to cause is handled by `canClearFilters`
     * instead — that button only appears when something is genuinely non-default,
     * so a page showing only "Status: Active" no longer offers a no-op click.
     */
    tags.push(
      filters.status === ""
        ? {
            // "All statuses" is still a choice the visitor made, and showing it
            // keeps the applied row on screen so "Clear all" stays reachable.
            // Its × goes back to the default rather than widening further.
            id: "status",
            label: "Status: All statuses",
            onRemove: () => setStatus(DEFAULT_FILTERS.status),
          }
        : {
            id: "status",
            label: `Status: ${
              filters.status === "active" ? "Active" : "Inactive"
            }`,
            onRemove: () => setStatus(""),
          },
    );
    if (filters.county) {
      tags.push({
        id: "county",
        label: `County: ${filters.county}`,
        onRemove: () => setCounty(""),
      });
    }
    if (
      filters.sortKey !== DEFAULT_FILTERS.sortKey ||
      filters.sortDir !== DEFAULT_FILTERS.sortDir
    ) {
      tags.push({
        id: "sort",
        // Spelled out rather than `▲`/`▼`. The header arrows are now icons, and a
        // bare glyph in a text chip read as a rendering artefact.
        label: `Sorted by ${SORT_LABELS[filters.sortKey]} (${
          filters.sortDir === "asc" ? "ascending" : "descending"
        })`,
        onRemove: () =>
          patch({
            sortKey: DEFAULT_FILTERS.sortKey,
            sortDir: DEFAULT_FILTERS.sortDir,
          }),
      });
    }

    return tags;
  }, [filters, patch, setPlay, setStatus, setCounty, toggleQuick]);

  /**
   * Whether "Clear all" has anything to do.
   *
   * `setFilters(DEFAULT_FILTERS)` is a no-op when state already holds that same
   * reference, so offering the button on an untouched page produced a click that
   * visibly did nothing. It now renders only when some filter really is
   * non-default, which lets the applied row still show the default status tag.
   */
  const canClearFilters =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return {
    filters,
    searchInput,
    playTypes,
    page,
    pageSize: PAGE_SIZE,
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
    setColumns: writeColumns,
    clearFilters,
    retry,
    exportCsv,
  };
}
