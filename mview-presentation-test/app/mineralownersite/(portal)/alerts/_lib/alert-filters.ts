import { alertCounts } from "./alert-counts";
import type { AlertCategory } from "./alert-types";

/**
 * THE FILTER ROW, AND THE ONE PREDICATE BEHIND IT.
 *
 * `alertFilters` is the five pills, with their counts read from `alertCounts` so
 * a pill can never claim a number the list does not contain.
 *
 * `matchesAlertFilter` is the whole of `alApply()` from the reference — category
 * AND search, one row at a time — and it lives here rather than in the inbox
 * component for the usual reason: it is a pure question about one record, so it
 * can be reasoned about (and, later, tested) without rendering anything.
 */

/** `all` is not an `AlertCategory` — it is the absence of a category filter. */
export type AlertFilter = "all" | AlertCategory;

export interface AlertFilterOption {
  value: AlertFilter;
  label: string;
  count: number;
}

/**
 * The five pills in the design's order.
 *
 * "Models & forecasts" IS THE LABEL, not "Model". v37 · D2 (Ryan): the original
 * read "Model", which told the reader nothing about what was in the bucket. The
 * key stays `model` because it is the record's own value; only the words changed.
 */
export const alertFilters: AlertFilterOption[] = [
  { value: "all", label: "All", count: alertCounts.total },
  { value: "money", label: "Money", count: alertCounts.byCategory.money },
  {
    value: "activity",
    label: "Activity",
    count: alertCounts.byCategory.activity,
  },
  {
    value: "community",
    label: "Community",
    count: alertCounts.byCategory.community,
  },
  {
    value: "model",
    label: "Models & forecasts",
    count: alertCounts.byCategory.model,
  },
];

/**
 * THE FOUR FIELDS FILTERING NEEDS — and deliberately not the whole record.
 *
 * The inbox filters in the browser but the alert ROWS are rendered on the
 * server, so what crosses into the client bundle is this slim shape plus the
 * finished markup. An `AlertRecord` carries nine explainers' worth of prose;
 * none of it is searched, and none of it needs to be downloaded to decide
 * whether a row is visible. `AlertRecord` satisfies this type structurally, so
 * the inbox can be handed records directly in a server context too.
 */
export interface AlertFilterFields {
  category: AlertCategory;
  headline: string;
  meta: string;
  keywords: string;
}

/**
 * Does this alert survive the current category AND the current search?
 *
 * BOTH GATES, ALWAYS — the reference is explicit that the two combine rather
 * than replace each other, and the empty-state line it shows says so ("clear it
 * or switch the filter back to All"). A search that silently reset the category
 * would strand a reader who had narrowed to Money and then typed a lease name.
 *
 * The search reads `headline`, `meta` and `keywords`; see the note on `keywords`
 * in `alert-types.ts` for why that is the index and not the rendered prose.
 */
export function matchesAlertFilter(
  alert: AlertFilterFields,
  filter: AlertFilter,
  query: string,
): boolean {
  if (filter !== "all" && alert.category !== filter) return false;

  const term = query.trim().toLowerCase();
  if (!term) return true;

  return `${alert.headline} ${alert.meta} ${alert.keywords}`
    .toLowerCase()
    .includes(term);
}
