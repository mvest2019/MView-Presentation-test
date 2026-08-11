"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { OPERATORS_BY_PLAY } from "@/lib/operator-mock-data";
import { queryAllMatching, queryOperators, toCsv } from "@/lib/operator-query";
import {
  ALL_PLAYS,
  DEFAULT_COLUMNS,
  DEFAULT_QUERY,
  QUICK_FILTERS,
  type OperatorColumns,
  type OperatorPage,
  type OperatorQuery,
  type OperatorSortKey,
  type OperatorStatus,
  type QuickFilterKey,
} from "@/lib/operator-types";

/**
 * ============================================================================
 * THE API SEAM
 *
 * This hook is the only place in the operator UI that knows where rows come
 * from. Today it runs `queryOperators` over the local fixture; when the real
 * endpoint exists, the `useMemo` below becomes a fetch and `operator-page.tsx`
 * does not change at all.
 *
 *   today:  filters -> queryOperators(OPERATORS_BY_PLAY, query) -> OperatorPage
 *   later:  filters -> fetchOperators(query)                    -> OperatorPage
 *
 * That works because `OperatorPage` is already shaped like a server response —
 * `total` is independent of `items.length`, and the filter-bar counts arrive
 * with the payload instead of being recomputed in the view. The only additions
 * a real request needs are `isLoading` and `error` alongside `page`; no markup
 * has to be restructured to receive them.
 *
 * It is deliberately the one thing kept out of `operator-page.tsx`: that file is
 * the page's markup, this is its data logic, and the whole point of the seam is
 * that swapping the fixture for the API touches one file with no JSX in it.
 * ============================================================================
 */

/** One removable tag in the applied-filters row, with its own undo. */
export type AppliedFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

const SORT_LABELS: Record<OperatorSortKey, string> = {
  name: "Operator",
  oil: "Oil Produced",
  gas: "Gas Produced",
  cty: "Counties",
};

/* ---------------------------------------------------------------------------
   Column preferences — a `localStorage`-backed external store.

   Read through `useSyncExternalStore` rather than copied into state inside an
   effect. Two reasons: the server has no `localStorage`, so the server snapshot
   has to be the defaults for the markup to hydrate cleanly; and setting state
   from an effect body triggers a second render on every mount, which is what
   `react-hooks/set-state-in-effect` exists to catch.

   `current` is the source of truth and is handed out by reference, which keeps
   `getSnapshot` stable — returning a freshly parsed object each call would
   re-render forever. It also means a browser with storage blocked still toggles
   columns for the session; the choice just does not outlive the tab.
   --------------------------------------------------------------------------- */

const STORAGE_KEY = "mv_kyo_cols";

let storedColumns: OperatorColumns | null = null;
const columnListeners = new Set<() => void>();

function parseColumns(raw: string | null): OperatorColumns {
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "oil" in parsed) {
      // Spread over the defaults so a blob written by an older shape cannot
      // leave a column undefined.
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

  // Keeps two tabs in step. Does not fire in the tab that wrote the value,
  // hence the explicit notify in `writeColumns`.
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

/* ------------------------------------------------------------------------- */

export function useOperatorDirectory() {
  const [query, setQuery] = useState<OperatorQuery>(DEFAULT_QUERY);
  const columns = useSyncExternalStore(
    subscribeToColumns,
    getColumnSnapshot,
    () => DEFAULT_COLUMNS,
  );

  const page: OperatorPage = useMemo(
    () => queryOperators(OPERATORS_BY_PLAY, query),
    [query],
  );

  /** Any filter change restarts at page 1; paging alone does not. */
  const patch = useCallback(
    (changes: Partial<OperatorQuery>, resetPage = true) => {
      setQuery((current) => ({
        ...current,
        ...changes,
        ...(resetPage ? { page: 1 } : null),
      }));
    },
    [],
  );

  const setSearch = useCallback((search: string) => patch({ search }), [patch]);
  const setPlay = useCallback((play: string) => patch({ play }), [patch]);
  const setStatus = useCallback(
    (status: OperatorStatus | "") => patch({ status }),
    [patch],
  );
  const setCounty = useCallback((county: string) => patch({ county }), [patch]);

  const toggleQuick = useCallback((key: QuickFilterKey) => {
    setQuery((current) => ({
      ...current,
      quick: current.quick === key ? "" : key,
      page: 1,
    }));
  }, []);

  /** Re-clicking a column flips direction; a new column starts on its natural one. */
  const toggleSort = useCallback((key: OperatorSortKey) => {
    setQuery((current) => ({
      ...current,
      sortKey: key,
      sortDir:
        current.sortKey === key
          ? ((current.sortDir * -1) as 1 | -1)
          : key === "name"
            ? 1
            : -1,
      page: 1,
    }));
  }, []);

  const setPage = useCallback(
    (next: number) => patch({ page: next }, false),
    [patch],
  );
  const setPageSize = useCallback(
    (pageSize: number) => patch({ pageSize }),
    [patch],
  );

  /** Resets every filter and the sort. Column choices are deliberately kept. */
  const clearFilters = useCallback(() => setQuery(DEFAULT_QUERY), []);

  const exportCsv = useCallback(() => {
    const rows = queryAllMatching(OPERATORS_BY_PLAY, query);
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "know-your-operators_filtered.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [query]);

  /** The applied-filter tags, each carrying the action that removes it. */
  const appliedFilters = useMemo<AppliedFilter[]>(() => {
    const filters: AppliedFilter[] = [];

    if (query.play !== ALL_PLAYS) {
      filters.push({
        id: "play",
        label: query.play,
        onRemove: () => setPlay(ALL_PLAYS),
      });
    }
    if (query.search.trim()) {
      filters.push({
        id: "search",
        label: `“${query.search.trim()}”`,
        onRemove: () => setSearch(""),
      });
    }
    if (query.quick) {
      filters.push({
        id: "quick",
        label: QUICK_FILTERS[query.quick],
        onRemove: () => patch({ quick: "" }),
      });
    }
    if (query.status) {
      filters.push({
        id: "status",
        label: `Status: ${query.status === "active" ? "Active" : "Inactive"}`,
        onRemove: () => setStatus(""),
      });
    }
    if (query.county) {
      filters.push({
        id: "county",
        label: `County: ${query.county}`,
        onRemove: () => setCounty(""),
      });
    }
    if (query.sortKey) {
      filters.push({
        id: "sort",
        label: `Sorted by ${SORT_LABELS[query.sortKey]}${
          query.sortDir > 0 ? " ▲" : " ▼"
        }`,
        onRemove: () => patch({ sortKey: "", sortDir: -1 }),
      });
    }

    return filters;
  }, [query, patch, setPlay, setSearch, setStatus, setCounty]);

  /**
   * A digits-only search is almost certainly an operator number, which the
   * fixture cannot match. The empty state says so rather than implying the
   * operator does not exist.
   */
  const isNumericSearch =
    query.search.trim().length > 0 && /^[0-9\s-]+$/.test(query.search.trim());

  return {
    query,
    page,
    columns,
    appliedFilters,
    isNumericSearch,
    setSearch,
    setPlay,
    setStatus,
    setCounty,
    toggleQuick,
    toggleSort,
    setPage,
    setPageSize,
    setColumns: writeColumns,
    clearFilters,
    exportCsv,
  };
}
