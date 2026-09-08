import type { LeaseRecord } from "./lease-types";

/**
 * SORTING AND SEARCHING THE LEASE LIST — pure functions over an array.
 *
 * WHY THIS IS NOT IN THE COMPONENT. The prototype sorted by reordering live
 * `<tr>` nodes and searched by setting `style.display` on them, then rebuilt the
 * grid view from the table's current DOM to keep the two in step. That is one
 * source of truth by construction, and it is also why sorting could not be
 * tested, deep-linked or reused.
 *
 * Here the list IS the source of truth: the toolbar owns a sort key and a query,
 * these functions turn those into an array, and the table and the grid render
 * the same array. The two views cannot disagree because there is only one list,
 * and the sort comparators can be reasoned about without a DOM.
 *
 * EVERY FUNCTION RETURNS A NEW ARRAY. `Array.prototype.sort` mutates, and the
 * array being sorted is the module-level `leaseRecords` fixture — sorting it in
 * place would permanently reorder the record for every other consumer in the
 * process, which on a server component means for every subsequent request.
 */

export type LeaseSortKey = "value" | "name" | "updated" | "county" | "newest";

/** The sort control's options, in the design's own order and wording. */
export const leaseSortOptions: { value: LeaseSortKey; label: string }[] = [
  { value: "value", label: "Production value — high to low" },
  { value: "name", label: "Lease name — A to Z" },
  { value: "updated", label: "Recently updated" },
  { value: "county", label: "County — A to Z" },
  { value: "newest", label: "Newest added" },
];

export const defaultLeaseSort: LeaseSortKey = "value";

/**
 * TWO ORDERINGS THAT ARE NOT DERIVABLE FROM A LEASE RECORD, held as the
 * prototype held them: lease numbers, most recent first.
 *
 * `updated` is the last production posting and `newest` is when the claim was
 * added. Neither timestamp is in the record — `membersclaimedleases` has both
 * columns, so these two arrays are the placeholder until the fixture carries
 * real dates, and a lease missing from either list sorts to the end rather than
 * to the front (see `orderIndex`).
 */
const RECENTLY_UPDATED_ORDER = [
  "305892",
  "423065",
  "74318",
  "508936",
  "267145",
  "578204",
  "619473",
  "391756",
  "480329",
  "65081",
];

const NEWEST_ADDED_ORDER = [
  "619473",
  "578204",
  "391756",
  "480329",
  "65081",
  "508936",
  "267145",
  "423065",
  "74318",
  "305892",
];

/**
 * Position in a hand-held ordering, with unknown sorting LAST.
 *
 * `indexOf` returns -1 for a lease that is not listed, and -1 sorts before
 * everything — so a lease added to the fixture but not to the arrays above
 * would silently jump to the top of "Recently updated". `Infinity` puts it at
 * the bottom, which is the honest place for "we do not know when".
 */
function orderIndex(order: string[], leaseNumber: string): number {
  const index = order.indexOf(leaseNumber);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

const COMPARATORS: Record<
  LeaseSortKey,
  (a: LeaseRecord, b: LeaseRecord) => number
> = {
  value: (a, b) => b.mvestimate - a.mvestimate,
  name: (a, b) => a.name.localeCompare(b.name) || a.number.localeCompare(b.number),
  /* County A–Z, then the most valuable lease first inside each county — the
     prototype's own tie-break, and the useful one: an alphabetical list of four
     Cedar Bend leases in arbitrary value order tells the reader nothing. */
  county: (a, b) => a.county.localeCompare(b.county) || b.mvestimate - a.mvestimate,
  updated: (a, b) =>
    orderIndex(RECENTLY_UPDATED_ORDER, a.number) -
    orderIndex(RECENTLY_UPDATED_ORDER, b.number),
  newest: (a, b) =>
    orderIndex(NEWEST_ADDED_ORDER, a.number) -
    orderIndex(NEWEST_ADDED_ORDER, b.number),
};

export function sortLeases(
  leases: LeaseRecord[],
  key: LeaseSortKey,
): LeaseRecord[] {
  return [...leases].sort(COMPARATORS[key]);
}

/**
 * THE FIELDS THE SEARCH BOX LOOKS AT — the four its placeholder promises
 * ("name, number, county, or operator") plus the play and field, because they
 * are on the row and a reader who can see "Barnett Shale" will type it.
 *
 * DELIBERATELY NOT "every cell in the row", which is what the prototype matched
 * against (`tr.textContent`). That made the money columns searchable, so typing
 * "410" matched three unrelated leases on their county appraised value, and
 * typing "0" matched all ten on their oil volume.
 */
function searchableText(lease: LeaseRecord): string {
  return [
    lease.name,
    lease.number,
    lease.county,
    lease.operator,
    lease.play,
    lease.field,
  ]
    .join(" ")
    .toLowerCase();
}

/** An empty or whitespace-only query matches everything. */
export function filterLeases(
  leases: LeaseRecord[],
  query: string,
): LeaseRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return leases;
  return leases.filter((lease) => searchableText(lease).includes(needle));
}

/** Sort, then filter. The one entry point the toolbar needs. */
export function selectLeases(
  leases: LeaseRecord[],
  { sort, query }: { sort: LeaseSortKey; query: string },
): LeaseRecord[] {
  return filterLeases(sortLeases(leases, sort), query);
}
