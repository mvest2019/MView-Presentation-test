import { applyLeaseFilters, type LeaseFilters } from "./lease-filters";
import type { LeaseRecord } from "./lease-types";

/**
 * THE TOOLBAR'S SORT AND SEARCH, AS PURE FUNCTIONS.
 *
 * Kept out of the panel component so the list can be sorted and filtered
 * without rendering anything — the ordering is a property of the records, not
 * of the table that happens to be showing them.
 *
 * EVERY OPTION SORTS ON A FIELD THE FIXTURE ACTUALLY HOLDS. An option the data
 * cannot honour ("recently updated" against records with no updated-at) reads as
 * a working control and does nothing, which is worse than not offering it.
 */

/**
 * THE SORTABLE COLUMNS.
 *
 * ONE PER COLUMN THE TABLE ACTUALLY PRINTS, so a header can be clicked and a
 * preset can name the same thing. A key the table has no column for would be a
 * sort order nobody could see the effect of.
 */
export type LeaseSortColumn =
  | "name"
  | "mvestimate"
  | "county-value"
  | "county"
  | "operator"
  | "reservoir"
  | "wells"
  | "interest"
  | "gas"
  | "oil"
  | "posted";

export type SortDirection = "asc" | "desc";

export interface LeaseSort {
  column: LeaseSortColumn;
  direction: SortDirection;
}

/** What each column is called in a sentence — the select's fallback label. */
export const LEASE_COLUMN_LABEL: Record<LeaseSortColumn, string> = {
  name: "Lease",
  mvestimate: "MVestimate",
  "county-value": "County appraised",
  county: "County",
  operator: "Operator",
  reservoir: "Reservoir",
  wells: "Wells",
  interest: "Decimal interest",
  gas: "Gas",
  oil: "Oil",
  posted: "Last posted",
};

/**
 * THE NAMED ORDERS THE SELECT OFFERS — the five a reader asks for by name.
 *
 * They are the same `{column, direction}` a header click produces, so the two
 * controls drive one piece of state rather than two that can disagree. Click a
 * header into an order that has a name and the select shows that name; click
 * into one that does not and it shows the order spelled out. See `sortLabel`.
 */
export const leaseSortOptions: { value: string; label: string; sort: LeaseSort }[] = [
  {
    value: "value",
    label: "Production value — high to low",
    sort: { column: "mvestimate", direction: "desc" },
  },
  {
    value: "county-value",
    label: "County appraised — high to low",
    sort: { column: "county-value", direction: "desc" },
  },
  {
    value: "name",
    label: "Lease name — A to Z",
    sort: { column: "name", direction: "asc" },
  },
  {
    value: "gas",
    label: "Gas filed — high to low",
    sort: { column: "gas", direction: "desc" },
  },
  {
    value: "posted",
    label: "Last posted — newest first",
    sort: { column: "posted", direction: "desc" },
  },
];

export const defaultLeaseSort: LeaseSort = {
  column: "mvestimate",
  direction: "desc",
};

/**
 * Page sizes for the "Show" control.
 *
 * FIVE IS ON THE LIST because the pager has to be reachable: a ten-lease record
 * at twenty-five a page is one page, and a control nobody can ever see is a
 * control nobody has tested. The default is the design's own.
 */
export const leasePageSizes = [5, 10, 25, 50, 100] as const;
export const defaultLeasePageSize = 25;

/** "June 2026" -> a sortable number. Unparseable months sort last. */
function postedOrder(month: string): number {
  const time = Date.parse(`1 ${month}`);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * HOW EACH COLUMN COMPARES, ASCENDING. Direction is applied once, below.
 *
 * TEXT COLUMNS TIE-BREAK ON VALUE. Nine of the ten units share four names and
 * every one of them sits in the same county, so sorting on either without a
 * tie-break arrives in arbitrary order inside each group — which reads as a
 * sort that did not work. Value is the useful second key: it is the order the
 * reader came from.
 */
const COMPARATORS: Record<
  LeaseSortColumn,
  (a: LeaseRecord, b: LeaseRecord) => number
> = {
  name: (a, b) =>
    a.name.localeCompare(b.name) ||
    (a.number ?? "").localeCompare(b.number ?? ""),
  mvestimate: (a, b) => a.mvestimate - b.mvestimate,
  "county-value": (a, b) => a.countyAppraised - b.countyAppraised,
  county: (a, b) => a.county.localeCompare(b.county) || a.mvestimate - b.mvestimate,
  operator: (a, b) =>
    a.operator.localeCompare(b.operator) || a.mvestimate - b.mvestimate,
  reservoir: (a, b) =>
    a.reservoir.localeCompare(b.reservoir) || a.mvestimate - b.mvestimate,
  wells: (a, b) => a.wells - b.wells || a.mvestimate - b.mvestimate,
  interest: (a, b) => a.decimalInterest - b.decimalInterest,
  gas: (a, b) => a.production.gasMcf - b.production.gasMcf,
  oil: (a, b) => a.production.oilBbl - b.production.oilBbl,
  posted: (a, b) =>
    postedOrder(a.lastPosted.month) - postedOrder(b.lastPosted.month) ||
    a.mvestimate - b.mvestimate,
};

export function sortLeases(
  leases: LeaseRecord[],
  sort: LeaseSort,
): LeaseRecord[] {
  const compare = COMPARATORS[sort.column];
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...leases].sort((a, b) => sign * compare(a, b));
}

/** The preset this order has a name for, or null when it has none. */
export function presetKeyFor(sort: LeaseSort): string | null {
  return (
    leaseSortOptions.find(
      (option) =>
        option.sort.column === sort.column &&
        option.sort.direction === sort.direction,
    )?.value ?? null
  );
}

/** "Operator — Z to A" — how an unnamed order describes itself in the select. */
export function sortLabel(sort: LeaseSort): string {
  const column = LEASE_COLUMN_LABEL[sort.column];
  const textual = sort.column === "name" || sort.column === "county" ||
    sort.column === "operator" || sort.column === "reservoir";
  const ascending = textual ? "A to Z" : "low to high";
  const descending = textual ? "Z to A" : "high to low";
  return `${column} — ${sort.direction === "asc" ? ascending : descending}`;
}

/** What the search box matches on — the fields its placeholder names. */
function searchableText(lease: LeaseRecord): string {
  return [
    lease.name,
    lease.number ?? "",
    lease.county,
    lease.operator,
    lease.reservoir,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterLeases(
  leases: LeaseRecord[],
  query: string,
): LeaseRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return leases;
  return leases.filter((lease) => searchableText(lease).includes(needle));
}

/**
 * Sort, narrow, search — every lease that matches, in order.
 *
 * IT DOES NOT PAGE. Paging needs the number of matches to work out how many
 * pages there are, so cutting the list here would throw away the figure the
 * pager is built from. The panel slices; this decides what there is to slice.
 *
 * THE DROPDOWNS RUN BEFORE THE SEARCH BOX, which is the order a reader expects:
 * the filters say which leases are in play and the search box finds one among
 * them. Reversed, typing a lease name would pull back a lease the filters had
 * just excluded.
 */
export function selectLeases(
  leases: LeaseRecord[],
  {
    sort,
    filters,
    query,
  }: {
    sort: LeaseSort;
    filters: LeaseFilters;
    query: string;
  },
): LeaseRecord[] {
  const sorted = sortLeases(leases, sort);
  return filterLeases(applyLeaseFilters(sorted, filters), query);
}
