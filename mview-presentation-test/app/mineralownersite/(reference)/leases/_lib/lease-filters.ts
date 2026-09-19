import { leaseRecords } from "./lease-records";
import type { LeaseRecord } from "./lease-types";
import { wellsForLease } from "./well-records";

/**
 * THE FIVE DROPDOWN FILTERS ABOVE THE TABLE.
 *
 * ── EVERY OPTION LIST IS BUILT FROM THE RECORDS, NEVER TYPED ──
 *
 * A filter offering a county this owner holds nothing in is worse than no
 * filter: it returns an empty table and the reader cannot tell whether that is
 * the truth or a bug. So each list is the distinct values actually present, in
 * the order the records give them, and a record with one county offers one
 * county. That also means adding a lease in a new county populates the dropdown
 * with no edit here.
 *
 * ── "LEASE TYPE" COMES FROM THE WELL, NOT THE LEASE ──
 *
 * What a lease is approved to produce is a fact the state files against the
 * WELL — there is no such field on a lease — so it is read off the well master.
 * A lease with wells of two types would list both, which is why the match is a
 * `some` rather than an equality.
 *
 * ── AN EMPTY STRING IS "ALL" ──
 *
 * Not `null`, not a sentinel object: the value goes straight into a native
 * `<select>`, whose values are strings, and "" is the one string no real county,
 * operator or reservoir can collide with.
 */

export interface LeaseFilters {
  county: string;
  operator: string;
  reservoir: string;
  status: string;
  type: string;
}

export const emptyLeaseFilters: LeaseFilters = {
  county: "",
  operator: "",
  reservoir: "",
  status: "",
  type: "",
};

/**
 * The types the wells on one lease are approved to produce.
 *
 * THE RECORD'S OWN FIELD FIRST, the well roster second. A lease from the
 * service carries `types`; a fixture lease does not, and its wells are keyed by
 * slug in `well-records.ts`, which answers the same question. Neither source is
 * more correct than the other — they are the same fact reaching the page by two
 * routes, and a lease knows which one it arrived by.
 */
function leaseTypes(lease: LeaseRecord): string[] {
  if (lease.types) return lease.types;
  return [...new Set(wellsForLease(lease.slug).map((well) => well.type))];
}

function distinct(values: string[]): string[] {
  return [...new Set(values)]
    .filter((value) => value !== "")
    .sort((a, b) => a.localeCompare(b));
}

export interface LeaseFilterOptions {
  county: string[];
  operator: string[];
  reservoir: string[];
  status: string[];
  type: string[];
}

/**
 * What each dropdown offers, derived FROM THE LEASES ON SCREEN.
 *
 * IT USED TO BE A MODULE CONSTANT built from the fixture, which was correct for
 * exactly as long as the fixture was the only set anyone saw. It no longer is:
 * the list shows the member's own leases when the record is claimed and the
 * sample set when it is not, and a dropdown offering counties from a third set
 * is a filter that can return nothing for a value it just offered.
 *
 * EMPTY VALUES ARE DROPPED rather than offered as a blank row — a lease with no
 * reservoir named on its filing should not put an unselectable gap in the list.
 */
export function leaseFilterOptionsFor(leases: LeaseRecord[]): LeaseFilterOptions {
  return {
    county: distinct(leases.map((lease) => lease.county)),
    operator: distinct(leases.map((lease) => lease.operator)),
    reservoir: distinct(leases.map((lease) => lease.reservoir)),
    status: distinct(leases.map((lease) => lease.status)),
    type: distinct(leases.flatMap(leaseTypes)),
  };
}

/** The fixture's own options, for a caller that still shows the fixture. */
export const leaseFilterOptions = leaseFilterOptionsFor(leaseRecords);

export function applyLeaseFilters(
  leases: LeaseRecord[],
  filters: LeaseFilters,
): LeaseRecord[] {
  return leases.filter(
    (lease) =>
      (!filters.county || lease.county === filters.county) &&
      (!filters.operator || lease.operator === filters.operator) &&
      (!filters.reservoir || lease.reservoir === filters.reservoir) &&
      (!filters.status || lease.status === filters.status) &&
      (!filters.type || leaseTypes(lease).includes(filters.type)),
  );
}

/** How many dropdowns are narrowing the list — the count on the Filters button. */
export function activeFilterCount(filters: LeaseFilters): number {
  return Object.values(filters).filter(Boolean).length;
}
