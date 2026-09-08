/**
 * WHAT THE CLAIM FLOW WORKS IN — the shapes the five steps consume.
 *
 * These are NOT the backend's shapes. `/api/v1/owners/*` serves index-aligned
 * parallel arrays (`leases`, `leaseNumbers`, `operators`, `interestValues`,
 * `leaseValues`), which is the right wire format and the wrong thing to hand a
 * component: every consumer would have to re-zip them and every consumer would
 * have to get the alignment right. `claim-api.ts` zips them once, here.
 */

/** One lease, zipped out of the backend's parallel arrays. */
export interface FlowLease {
  /** Lease or unit name as the roll spells it. */
  name: string;
  /**
   * RRC lease number. `null` outside the record's own county — see
   * `OwnerLeaseSet` for why the statewide rows are thinner.
   *
   * LEADING ZEROS ARE SIGNIFICANT: `015896` and `15896` are different leases,
   * so this is a string and is never parsed to a number.
   */
  number: string | null;
  operator: string | null;
  county: string;
  /** Appraised value on the roll, whole dollars. */
  value: number;
  /** Decimal interest as filed, e.g. 0.007753 — NOT a percentage. */
  decimal: number | null;
  /**
   * ⚠ INFERRED, NOT SERVED. No owners endpoint carries a producing flag, and
   * the flow's step 4 splits the set into producing and inactive. The
   * inference is `value > 0`, which follows the design's own definition of
   * inactive — "no recent volumes and a ~$0 modeled forward owner-share PV".
   *
   * It is a proxy and the UI says so. If the backend ever serves a real status,
   * this is the one field to replace.
   */
  producing: boolean;
}

/** A roll record: one name at one address in one county. */
export interface OwnerRecord {
  name: string;
  /** Mailing address as the roll holds it. May be empty. */
  address: string;
  county: string;
  leaseCount: number;
  appraisedValue: number;
  /** Distinct operators across this record's leases. */
  operatorCount: number;
  /** This record's own leases, with full per-lease detail. */
  leases: FlowLease[];
}

/**
 * EVERYTHING THE NAME HOLDS, STATEWIDE — `allLeases` from `/same-name`.
 *
 * WHY THIS IS SEPARATE FROM THE RECORD. A county view under-reports: the
 * backend's own example is a name showing 19 leases in Archer that holds 22
 * across two counties, and a claim takes all 22. Steps 4 and 5 have to count
 * what the claim will actually take, so they read this and not the record.
 *
 * THE ROWS ARE THINNER OUTSIDE THE RECORD'S COUNTY, and that is the endpoint's
 * shape, not a shortcut here: `allLeases` carries only lease names and values
 * per county. Number, operator and interest exist on the picked record alone,
 * so `claim-api.ts` enriches the rows it can and leaves the rest `null` — which
 * the lease table renders as an em dash rather than inventing.
 */
export interface OwnerLeaseSet {
  leases: FlowLease[];
  leaseCount: number;
  appraisedValue: number;
  countyCount: number;
  /** "Archer, Young" — for the summary line on step 4. */
  countyList: string;
}

/** What `/same-name` returns once a record has been picked. */
export interface SameNameResult {
  /** The picked record, address-verified. `null` if the backend found none. */
  selected: OwnerRecord | null;
  /** The same name at OTHER addresses — each needs a mailed code to attach. */
  others: OwnerRecord[];
  /** Everything that name holds, statewide. */
  all: OwnerLeaseSet;
}

/** `GET /owners/counties`, with the cold-start case surfaced. */
export interface CountyIndex {
  totalOwners: number;
  counties: { name: string; owners: number }[];
  /**
   * The tally is still being computed (cold start). The dropdown works; the
   * counts are all zero and must not be printed as if they were real.
   */
  pending: boolean;
}
