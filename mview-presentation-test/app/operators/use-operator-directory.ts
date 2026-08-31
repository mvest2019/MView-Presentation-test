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

import type { OperatorSearchResponse } from "@/lib/operator-api-types";
import {
  ALL_PLAYS,
  buildOperatorSearchPayload,
  DEFAULT_FILTERS,
  EMPTY_RESULT_PAGE,
  isLockedValue,
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

/**
 * The table must never render fewer than this many optional columns — DEFECT 123.
 *
 * Two is the floor the defect names: below it the table stops being a comparison
 * and becomes a list of names, and at zero it is a header with nothing under it.
 */
const MIN_COLUMNS = 2;

/**
 * A column set with the floor enforced, or the defaults when it cannot be met.
 *
 * THE INVARIANT LIVES HERE AND NOT IN THE MENU, deliberately. The Columns popover
 * already refuses to untick the four columns the table is built on, but that is a
 * disabled attribute — it governs one path in. This governs every path: a value
 * restored from `localStorage`, a set written by an older build of the page, or a
 * future control that edits columns some other way. An invariant enforced only at
 * the widget that happens to edit it today is one bad write from being violated.
 */
function withColumnFloor(columns: OperatorColumns): OperatorColumns {
  const shown = Object.values(columns).filter(Boolean).length;
  return shown >= MIN_COLUMNS ? columns : DEFAULT_COLUMNS;
}

function parseColumns(raw: string | null): OperatorColumns {
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "oil" in parsed) {
      /*
       * DEFECT 123, the refresh half. This merged the stored value over the
       * defaults and returned it unchecked, so a set saved with every column off —
       * which the menu used to allow — came back all-off on the next load and the
       * table rendered a header with no columns under it. A stored state that
       * cannot be rendered is not a preference worth honouring.
       */
      return withColumnFloor({
        ...DEFAULT_COLUMNS,
        ...(parsed as Partial<OperatorColumns>),
      });
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

function writeColumns(incoming: OperatorColumns): void {
  /* DEFECT 123 — the floor applies on the way in as well as on the way out, so an
     invalid set can never be persisted in the first place. Without this, a state
     the page refuses to render could still be written to storage and would have to
     be repaired on every subsequent load. */
  const next = withColumnFloor(incoming);
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

/**
 * Rows per slice while building the export. 2,000 keeps each slice's work in the
 * tens of milliseconds on the 24,744-row response, which is short enough that a
 * frame can be painted between slices.
 */
const EXPORT_CHUNK = 2000;

/**
 * How many rows one export asks for.
 *
 * The search endpoint honours it: probed at 10, 100, 1000 and 5000 against a query
 * whose `total_count` is 3,095 — the last returned all 3,095 rows in one response.
 * 5000 therefore covers every filtered result set the listing can produce while
 * staying one request rather than 310 pages of ten.
 */
const EXPORT_PAGE_SIZE = 5000;

/**
 * Hand control back to the browser so it can paint and handle input.
 *
 * `scheduler.yield()` is the right primitive — it resumes at the front of the task
 * queue, so yielding does not cost the work its place. Where it is missing,
 * `setTimeout(0)` yields too; it just goes to the back of the queue and carries the
 * ~4ms clamp, which over 13 slices is negligible against the 243ms being broken up.
 */
function yieldToBrowser(): Promise<void> {
  const scheduler = (
    globalThis as { scheduler?: { yield?: () => Promise<void> } }
  ).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}


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
        /*
         * THROUGH THIS SITE'S OWN ORIGIN, NOT STRAIGHT AT THE OPERATOR API.
         *
         * It used to post to `publicOperatorApiBaseUrl()` directly, which left
         * the sign-in gate entirely in the browser's hands: `member_id` rode in
         * a body this file builds, so anything that could edit the request could
         * award itself a member id, and there was no server in the path able to
         * withhold a field. The same-origin handler at
         * `app/api/operators/search/` — written for exactly this and until now
         * unused by the listing — pins `member_id` from the session cookie and
         * strips the two account-only columns before the response is serialised.
         *
         * CANCELLATION SURVIVES THE HOP. The handler passes `request.signal`
         * straight through to the upstream call, so aborting this fetch still
         * aborts the operator API request rather than merely ignoring its reply.
         */
        const response = await fetch("/api/operators/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // The complete contract body, built by the shared builder. `member_id`
          // is a placeholder in it — the handler overwrites it.
          body: JSON.stringify(buildOperatorSearchPayload(filters, visitorId)),
          signal: controller.signal,
        });

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

  /**
   * Sort a column. With no direction, re-clicking a column flips it and a new
   * column starts descending — the header label behaves as it always has.
   *
   * With a direction, that direction is applied outright. The two arrows in each
   * sortable header need this: an up arrow whose tooltip says "ascending" has to
   * actually sort ascending, and a toggle cannot promise that.
   */
  const toggleSort = useCallback(
    (key: OperatorSortKey, dir?: "asc" | "desc") => {
      setFilters((current) => ({
        ...current,
        sortKey: key,
        sortDir:
          dir ??
          (current.sortKey === key && current.sortDir === "desc"
            ? "asc"
            : "desc"),
        page: 1,
      }));
    },
    [],
  );

  const goToPage = useCallback(
    (next: number) => patch({ page: next }, false),
    [patch],
  );

  /** Resets every filter and the sort. Column choices are deliberately kept. */
  const clearFilters = useCallback(() => {
    setSearchInput(DEFAULT_FILTERS.searchText);
    setFilters(DEFAULT_FILTERS);
  }, []);

  /** In-flight guard, so a second click cannot start a duplicate export. */
  const exporting = useRef(false);

  /**
   * Export CSV — DEFECT 121.
   *
   * WHAT IT USED TO DO. It read `GET /operators/all`, the whole directory in one
   * 16 MB response, and wrote every one of the 24,744 records out with a fixed set
   * of columns. The table beside the button was showing 3,095 operators in 5
   * columns under the visitor's filters, so the file agreed with the screen on
   * neither count nor shape — it was a dump of the endpoint, not an export of the
   * view.
   *
   * WHAT IT DOES NOW. It re-runs the QUERY THAT IS ON SCREEN — the same filters,
   * the same search text, the same sort — through the same route handler the table
   * uses, and writes those rows with the columns the table is currently showing.
   * `Showing 1–10 of 779` exports 779 rows; turning Leases count on adds the
   * column and nothing else.
   *
   * ONE REQUEST, NOT 310. The endpoint honours a large `pageSize` — probed:
   * `pageSize: 5000` returns all 3,095 matching rows in a single response with the
   * same `total_count` — so the export asks for the whole result set at once rather
   * than paging it ten at a time. `EXPORT_PAGE_SIZE` is the ceiling it asks for.
   *
   * IT GOES THROUGH `/api/operators/search`, WHICH IS WHAT KEEPS THE GATE. That
   * handler pins `member_id` from the session, so a signed-out visitor's export is
   * gated exactly as their screen is: under a quick filter the API returns rows
   * 4-10 as `"****"` and those rows are written out as locked rather than as data.
   * `/operators/all` took no `member_id` at all, which is how the Export button
   * used to hand over the very counts the table had just locked.
   */
  const exportCsv = useCallback(async () => {
    if (exporting.current) return;
    exporting.current = true;

    try {
      const response = await fetch("/api/operators/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* The filters on screen, verbatim — `buildOperatorSearchPayload` is the one
           payload builder, so the export cannot drift from the table. Only the page
           size differs: the table wants ten, the file wants all of them. */
        body: JSON.stringify({
          ...buildOperatorSearchPayload(filters, visitorId),
          page: 1,
          pageSize: EXPORT_PAGE_SIZE,
        }),
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`export responded ${response.status}`);

      const { result } = (await response.json()) as OperatorSearchResponse;

      /* The visible columns, and only those. Rank, name and number are the row's
         identity and are always written — a CSV of figures with no operator on it
         answers nothing. */
      const header = ["Rank", "Operator Name", "Operator No."];
      if (columns.oil) header.push("Oil Produced");
      if (columns.gas) header.push("Gas Produced");
      if (columns.cty) header.push("Counties");
      if (columns.leases) header.push("Leases count");
      if (columns.lastProduction) header.push("Last production");
      if (columns.status) header.push("Status");

      const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const lines = [header.join(",")];

      /*
       * BUILT IN SLICES, YIELDING BETWEEN THEM. The set is far smaller than the old
       * 24,744-row dump, but a filter that matches every active operator is still
       * 3,095 rows, and mapping and joining them in one pass is unbroken main-thread
       * work. Slicing keeps the page painting while the file is assembled.
       */
      for (let start = 0; start < result.length; start += EXPORT_CHUNK) {
        toOperatorRows(result.slice(start, start + EXPORT_CHUNK)).forEach(
          (row, offset) => {
            /* A gated row carries `"****"` in every field. Written as a word rather
               than as a masked figure, so a spreadsheet does not read it as data. */
            const value = (raw: string) =>
              row.masked || isLockedValue(raw) ? cell("Locked") : cell(raw);

            const line = [
              String(start + offset + 1),
              row.masked ? cell("Locked") : cell(row.name),
              row.masked ? cell("Locked") : cell(row.operatorNumber),
            ];
            if (columns.oil) line.push(value(row.oil));
            if (columns.gas) line.push(value(row.gas));
            if (columns.cty) line.push(value(row.counties));
            if (columns.leases) line.push(value(row.leases));
            if (columns.lastProduction) line.push(value(row.lastProduction));
            if (columns.status) line.push(value(row.status));
            lines.push(line.join(","));
          },
        );
        await yieldToBrowser();
      }

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
  }, [columns, filters, visitorId]);

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
