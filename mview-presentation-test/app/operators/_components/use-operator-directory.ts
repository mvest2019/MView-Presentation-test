"use client";

import { useCallback, useMemo, useState } from "react";

import { OPERATORS_BY_PLAY } from "@/lib/operator-mock-data";
import { queryAllMatching, queryOperators, toCsv } from "@/lib/operator-query";
import {
  ALL_PLAYS,
  DEFAULT_QUERY,
  QUICK_FILTERS,
  type OperatorPage,
  type OperatorQuery,
  type OperatorSortKey,
  type OperatorStatus,
  type QuickFilterKey,
} from "@/lib/operator-types";

import { useColumnPreferences } from "./use-column-preferences";

/**
 * ============================================================================
 * THE API SEAM
 *
 * This hook is the only place in the operator UI that knows where rows come
 * from. Today it runs `queryOperators` over the local fixture; when the real
 * endpoint exists, the `useMemo` below becomes a fetch and everything else in
 * this file and every component under it stays as it is.
 *
 *   today:  filters -> queryOperators(OPERATORS_BY_PLAY, query) -> OperatorPage
 *   later:  filters -> fetchOperators(query)                    -> OperatorPage
 *
 * That works because `OperatorPage` is already shaped like a server response —
 * `total` is independent of `items.length`, and the filter-bar counts arrive
 * with the payload instead of being recomputed in the view. The only additions
 * a real request needs are `isLoading` and `error` alongside `page`; no
 * component below has to be restructured to receive them.
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

export function useOperatorDirectory() {
  const [query, setQuery] = useState<OperatorQuery>(DEFAULT_QUERY);
  const [columns, setColumns] = useColumnPreferences();

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

  const setSearch = useCallback(
    (search: string) => patch({ search }),
    [patch],
  );
  const setPlay = useCallback((play: string) => patch({ play }), [patch]);
  const setStatus = useCallback(
    (status: OperatorStatus | "") => patch({ status }),
    [patch],
  );
  const setCounty = useCallback((county: string) => patch({ county }), [patch]);

  const toggleQuick = useCallback(
    (key: QuickFilterKey) => {
      setQuery((current) => ({
        ...current,
        quick: current.quick === key ? "" : key,
        page: 1,
      }));
    },
    [],
  );

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
    setColumns,
    clearFilters,
    exportCsv,
  };
}
