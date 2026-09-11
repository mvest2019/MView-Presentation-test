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

export type LeaseSortKey =
  | "value"
  | "county-value"
  | "name"
  | "gas"
  | "posted";

export const leaseSortOptions: { value: LeaseSortKey; label: string }[] = [
  { value: "value", label: "Production value — high to low" },
  { value: "county-value", label: "County appraised — high to low" },
  { value: "name", label: "Lease name — A to Z" },
  { value: "gas", label: "Gas filed — high to low" },
  { value: "posted", label: "Last posted — newest first" },
];

export const defaultLeaseSort: LeaseSortKey = "value";

/** Page sizes for the "Show:" control. The default is the design's own. */
export const leasePageSizes = [10, 25, 50, 100] as const;
export const defaultLeasePageSize = 25;

/** "June 2026" -> a sortable number. Unparseable months sort last. */
function postedOrder(month: string): number {
  const time = Date.parse(`1 ${month}`);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

const COMPARATORS: Record<
  LeaseSortKey,
  (a: LeaseRecord, b: LeaseRecord) => number
> = {
  value: (a, b) => b.mvestimate - a.mvestimate,
  "county-value": (a, b) => b.countyAppraised - a.countyAppraised,
  /* Nine of the ten units share four names, so an alphabetical list needs a
     tie-break or it arrives in arbitrary order inside each name. Value is the
     useful one — it is the order the reader came from. */
  name: (a, b) => a.name.localeCompare(b.name) || b.mvestimate - a.mvestimate,
  gas: (a, b) => b.production.gasMcf - a.production.gasMcf,
  posted: (a, b) =>
    postedOrder(b.lastPosted.month) - postedOrder(a.lastPosted.month) ||
    b.mvestimate - a.mvestimate,
};

export function sortLeases(
  leases: LeaseRecord[],
  key: LeaseSortKey,
): LeaseRecord[] {
  return [...leases].sort(COMPARATORS[key]);
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

/** Sort, then filter, then cut to the page size — the toolbar's whole job. */
export function selectLeases(
  leases: LeaseRecord[],
  {
    sort,
    query,
    pageSize,
  }: { sort: LeaseSortKey; query: string; pageSize: number },
): LeaseRecord[] {
  return filterLeases(sortLeases(leases, sort), query).slice(0, pageSize);
}
