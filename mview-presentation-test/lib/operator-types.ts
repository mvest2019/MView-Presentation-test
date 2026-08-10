/**
 * Shapes for the Know Your Operators directory.
 *
 * This file is the durable half of the operator data layer. There is no
 * Operator API yet (see `operator-mock-data.ts`), so today `OperatorPage` is
 * produced by `queryOperators` running over a local fixture. It is shaped like
 * a paginated API response on purpose — `total` is carried separately from
 * `items.length`, and the filter-bar counts arrive alongside the rows rather
 * than being derived in the view. When the real endpoint lands, only the
 * function that produces an `OperatorPage` changes; nothing that consumes one
 * has to.
 *
 * Fields marked "illustrative" below are derived placeholders, not public
 * record. They carry an on-surface label wherever they render, which is the
 * prototype's own convention — never present them as reported figures.
 */

/** One row of the directory. */
export interface Operator {
  /** Operator name exactly as filed. Unique within a play. */
  name: string;
  /** RRC-style six-digit operator number. Illustrative. */
  operatorNo: number;
  /** Cumulative reported production, barrels of oil equivalent. Real. */
  boe: number;
  /** Oil produced, bbl. Illustrative — an oil/gas split of `boe`. */
  oilBbl: number;
  /** Gas produced, Mcf. Illustrative — the gas remainder of `boe`, at 6:1. */
  gasMcf: number;
  /** Reported lease count. Real. */
  leases: number;
  /** Number of Texas counties the operator is active in. Real. */
  counties: number;
  /** P-5 status. Illustrative. */
  status: OperatorStatus;
  /** The play this row was matched in. */
  play: string;
  /** 1-based rank of this operator within `play`, by reported production. */
  playRank: number;
}

export type OperatorStatus = "active" | "inactive";

/** The four quick-filter pills, in the order the design lists them. */
export const QUICK_FILTERS = {
  recent: "Active in last 90 days",
  top10: "Top 10 producers",
  cty5: "Active in >5 counties",
  cty10: "Active in >10 counties",
} as const;

export type QuickFilterKey = keyof typeof QUICK_FILTERS;

export function isQuickFilterKey(value: string): value is QuickFilterKey {
  return value in QUICK_FILTERS;
}

/** Sentinel for the Play type select's "all plays" option. */
export const ALL_PLAYS = "*";

export type OperatorSortKey = "name" | "oil" | "gas" | "cty";

/** Every filter the directory can apply, plus sort and pagination. */
export interface OperatorQuery {
  /** Free text over operator name. */
  search: string;
  /** A play name, or `ALL_PLAYS` for the de-duplicated statewide list. */
  play: string;
  /** At most one pill is active at a time — the design toggles them. */
  quick: QuickFilterKey | "";
  status: OperatorStatus | "";
  /**
   * A Texas county name. Held and shown as an applied tag, but it cannot
   * narrow the rows yet — see the note in `operator-query.ts`.
   */
  county: string;
  sortKey: OperatorSortKey | "";
  /** 1 ascending, -1 descending. */
  sortDir: 1 | -1;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export const DEFAULT_QUERY: OperatorQuery = {
  search: "",
  play: ALL_PLAYS,
  quick: "",
  status: "",
  county: "",
  sortKey: "",
  sortDir: -1,
  page: 1,
  pageSize: 10,
};

export const PAGE_SIZES = [10, 25, 50, 100] as const;

/** Which optional columns the table shows. Persisted client-side. */
export interface OperatorColumns {
  oil: boolean;
  gas: boolean;
  cty: boolean;
  status: boolean;
}

export const DEFAULT_COLUMNS: OperatorColumns = {
  oil: true,
  gas: true,
  cty: true,
  status: true,
};

/**
 * One page of results, plus the counts the filter bar needs.
 *
 * The counts are computed with the filter they describe held aside, so a pill
 * shows how many rows it *would* match rather than how many it currently
 * matches — the prototype's behaviour, and the only way the numbers stay
 * useful once a pill is already on.
 */
export interface OperatorPage {
  items: Operator[];
  /** Total matching rows across every page. */
  total: number;
  page: number;
  pageSize: number;
  /** Total pages, at least 1 even when empty. */
  pageCount: number;
  /** 0-based index of the first row on this page, for the "Showing x–y" line. */
  from: number;
  quickCounts: Record<QuickFilterKey, number>;
  statusCounts: Record<OperatorStatus, number>;
}
