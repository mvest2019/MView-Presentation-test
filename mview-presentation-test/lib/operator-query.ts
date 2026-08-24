/**
 * Filtering, sorting, paginating and formatting for the operator directory.
 *
 * Pure functions over an operator array — no React, no DOM, no fetch. This is
 * the logic a real `GET/POST /operators` endpoint would run server-side, so
 * when that endpoint arrives this module is what it replaces, and every
 * component that renders an `OperatorPage` carries on unchanged.
 *
 * Behaviour is ported from the prototype's `opFilteredRows` / `opChipCounts`,
 * including two details worth stating because they look like bugs and are not:
 *
 *  · The quick-filter counts are computed with the quick filter itself set
 *    aside, so a pill reports how many rows it *would* match. The status counts
 *    additionally set the status filter aside, for the same reason.
 *  · Under "all plays" an operator appears once, at its best rank across every
 *    play it is in, and the list is ordered by cumulative production.
 */

import {
  ALL_PLAYS,
  QUICK_FILTERS,
  type Operator,
  type OperatorPage,
  type OperatorQuery,
  type OperatorStatus,
  type QuickFilterKey,
} from "./operator-types";
import { lastProductionBucket } from "./operator-mock-data";

const QUICK_KEYS = Object.keys(QUICK_FILTERS) as QuickFilterKey[];

/**
 * Cache of scoped rows, keyed by source then play.
 *
 * PERFORMANCE. `scopeRows` depends only on the source and the selected play —
 * not on the search term, the status, the quick filter or the sort. Without this
 * cache, every keystroke in the search box rebuilt the statewide list from
 * scratch: 850 operators pushed through a `Map` to de-duplicate, then sorted.
 * Measured at 25ms of blocking main-thread work per keystroke on desktop, which
 * scales to several hundred milliseconds on a mid-tier phone and puts INP in
 * the "needs improvement" band.
 *
 * Safe to hand out the same array on every call because nothing downstream
 * mutates it: `narrow` and `applyQuick` use `filter`, and `sortRows` copies with
 * a spread before sorting. A `WeakMap` on the source means a different dataset —
 * the real API's payload, later — gets its own entry and the old one is
 * collectable.
 */
const scopeCache = new WeakMap<object, Map<string, Operator[]>>();

/**
 * The candidate rows for a play selection.
 *
 * For a single play that is the play's own ranked list. For "all plays" the
 * same operator turns up in many plays, so it is de-duplicated to its best
 * (lowest) rank and the result is ordered by production — the prototype's
 * `opScopeRows`.
 */
function scopeRows(
  operatorsByPlay: Readonly<Record<string, Operator[]>>,
  play: string,
): Operator[] {
  let byPlay = scopeCache.get(operatorsByPlay);
  if (!byPlay) {
    byPlay = new Map<string, Operator[]>();
    scopeCache.set(operatorsByPlay, byPlay);
  }

  const cached = byPlay.get(play);
  if (cached) return cached;

  const computed = computeScopeRows(operatorsByPlay, play);
  byPlay.set(play, computed);
  return computed;
}

/** Case and punctuation folded away, for comparing play names across sources. */
function foldPlayName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const foldedIndexCache = new WeakMap<object, Map<string, string>>();

/**
 * The row-data key for a play name, or `null` if this dataset has no rows for it.
 *
 * Needed because the play *names* and the play *rows* currently come from two
 * different sources. `/api/v1/operators/playtypes` returns upper-case names
 * ("PERMIAN BASIN"); the row data keys them in title case ("Permian Basin"). An
 * exact lookup would send every option to an empty table, so names are matched
 * with case and punctuation folded away.
 *
 * Folding closes the gap for three of the five API values. "EAGLE FORD SHALE"
 * and "HAYNESVILLE/BOSSIER SHALE" have no counterpart at all in the current row
 * data and correctly resolve to `null` — see the note in `app/operators/page.tsx`.
 * This function stops being necessary once rows and names come from the same API.
 */
export function resolvePlayKey(
  operatorsByPlay: Readonly<Record<string, Operator[]>>,
  play: string,
): string | null {
  if (play === ALL_PLAYS) return null;
  if (Object.prototype.hasOwnProperty.call(operatorsByPlay, play)) return play;

  let index = foldedIndexCache.get(operatorsByPlay);
  if (!index) {
    index = new Map<string, string>();
    for (const key of Object.keys(operatorsByPlay)) {
      index.set(foldPlayName(key), key);
    }
    foldedIndexCache.set(operatorsByPlay, index);
  }

  return index.get(foldPlayName(play)) ?? null;
}

function computeScopeRows(
  operatorsByPlay: Readonly<Record<string, Operator[]>>,
  play: string,
): Operator[] {
  if (play !== ALL_PLAYS) {
    const key = resolvePlayKey(operatorsByPlay, play);
    return key ? operatorsByPlay[key] : [];
  }

  const best = new Map<string, Operator>();
  for (const rows of Object.values(operatorsByPlay)) {
    for (const operator of rows) {
      const existing = best.get(operator.name);
      if (!existing || operator.playRank < existing.playRank) {
        best.set(operator.name, operator);
      }
    }
  }
  return [...best.values()].sort((a, b) => b.boe - a.boe);
}

function applyQuick(rows: Operator[], quick: QuickFilterKey): Operator[] {
  switch (quick) {
    case "top10":
      return [...rows].sort((a, b) => b.boe - a.boe).slice(0, 10);
    case "recent":
      return rows.filter(
        (row) => lastProductionBucket(row.name, row.playRank - 1) === "90d",
      );
    case "cty5":
      return rows.filter((row) => row.counties > 5);
    case "cty10":
      return rows.filter((row) => row.counties > 10);
  }
}

function sortRows(rows: Operator[], query: OperatorQuery): Operator[] {
  if (!query.sortKey) return rows;
  const direction = query.sortDir;
  return [...rows].sort((a, b) => {
    switch (query.sortKey) {
      case "name":
        return direction * a.name.localeCompare(b.name);
      case "oil":
        return direction * (a.oilBbl - b.oilBbl);
      case "gas":
        return direction * (a.gasMcf - b.gasMcf);
      default:
        return direction * (a.counties - b.counties);
    }
  });
}

/**
 * Everything except the quick filter and, optionally, the status filter.
 *
 * NOTE ON COUNTY: `query.county` is deliberately not applied. The fixture
 * carries a *count* of counties per operator, not which counties they are, so
 * there is nothing to match against. The select and its applied-filter tag are
 * wired and hold state; narrowing switches on when the API supplies per-county
 * operator lists. Faking it here would mean inventing data.
 */
function narrow(
  rows: Operator[],
  query: OperatorQuery,
  options: { includeStatus: boolean },
): Operator[] {
  let result = rows;

  const search = query.search.trim().toLowerCase();
  if (search) {
    result = result.filter((row) => row.name.toLowerCase().includes(search));
  }

  if (options.includeStatus && query.status) {
    result = result.filter((row) => row.status === query.status);
  }

  return result;
}

/** Run a query and return one page of rows plus the filter-bar counts. */
export function queryOperators(
  operatorsByPlay: Readonly<Record<string, Operator[]>>,
  query: OperatorQuery,
): OperatorPage {
  const scoped = scopeRows(operatorsByPlay, query.play);

  // Base for the quick-filter counts: every other filter applied, quick not.
  const quickBase = narrow(scoped, query, { includeStatus: true });
  const quickCounts = Object.fromEntries(
    QUICK_KEYS.map((key) => [key, applyQuick(quickBase, key).length]),
  ) as Record<QuickFilterKey, number>;

  // Base for the status counts: status set aside as well, so both options keep
  // reporting a useful number once one of them is selected.
  const statusBase = narrow(scoped, query, { includeStatus: false });
  const statusCounts: Record<OperatorStatus, number> = {
    active: 0,
    inactive: 0,
  };
  for (const row of statusBase) statusCounts[row.status] += 1;

  const filtered = sortRows(
    query.quick ? applyQuick(quickBase, query.quick) : quickBase,
    query,
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  // Clamp rather than trust the incoming page — narrowing the filters while
  // deep in a list would otherwise land on an empty page.
  const page = Math.min(Math.max(1, query.page), pageCount);
  const from = (page - 1) * query.pageSize;

  return {
    items: filtered.slice(from, from + query.pageSize),
    total,
    page,
    pageSize: query.pageSize,
    pageCount,
    from,
    quickCounts,
    statusCounts,
  };
}

/**
 * Every row the current filters match, ignoring pagination — what Export CSV
 * writes out. Same pipeline as `queryOperators`, minus the slice.
 */
export function queryAllMatching(
  operatorsByPlay: Readonly<Record<string, Operator[]>>,
  query: OperatorQuery,
): Operator[] {
  const scoped = scopeRows(operatorsByPlay, query.play);
  const narrowed = narrow(scoped, query, { includeStatus: true });
  return sortRows(
    query.quick ? applyQuick(narrowed, query.quick) : narrowed,
    query,
  );
}

/**
 * Compact production figures — `2.37B`, `10.3M`, `450K`. The prototype's
 * `opBoeFmt`, which keeps the column narrow enough to stay on one line.
 */
export function formatProduction(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) {
    return `${Math.round(value / 1e3).toLocaleString("en-US")}K`;
  }
  return String(value);
}

const CSV_HEADER = [
  "Rank",
  "Operator Name",
  "Operator No. (illustrative)",
  "Play",
  "Play rank",
  "Oil Produced bbl (illustrative)",
  "Gas Produced Mcf (illustrative)",
  "Counties",
  "Status (illustrative)",
];

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** The filtered set as CSV text. Illustrative columns stay labelled. */
export function toCsv(rows: Operator[]): string {
  const lines = [CSV_HEADER.join(",")];
  rows.forEach((row, index) => {
    lines.push(
      [
        index + 1,
        csvCell(row.name),
        row.operatorNo,
        csvCell(row.play),
        row.playRank,
        row.oilBbl,
        row.gasMcf,
        row.counties,
        row.status === "active" ? "Active" : "Inactive",
      ].join(","),
    );
  });
  return lines.join("\n");
}
