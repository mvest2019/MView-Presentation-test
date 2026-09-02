/**
 * Shared shapes for the Find Your Record page (`/claim`) and its API.
 *
 * THE BACKEND SHIPPED (2026-08-25): the page is served by the real
 * `/api/v1/owners/*` endpoints on `NEXT_PUBLIC_CLAIM_API_BASE_URL` (the dev
 * API host by default), called straight from the browser — they send CORS.
 * `lib/claim-search/api.ts` maps each response into the types below, which
 * are what the components consume:
 *
 *   GET /owners/counties                          → ClaimMeta
 *   GET /owners/search?name&lease[&county]        → SearchResponse
 *       (statewide = OMIT county; the backend 404s on a literal "*")
 *   GET /owners/lease-owners?county&lease         → LeaseOwnersResponse
 *   GET /owners/same-name?county&name&address     → SameNameResponse
 *   POST /owners/address-correction               {…, visitorId | member_id}
 *   POST /owners/claim                            {member_id, mineralOwners[]}
 *
 * The same-origin stand-in handlers and the prebuilt index in `public/owners/`
 * that served the page before this are gone.
 */

/** An owner as the backend serves it — named fields, mapped in `api.ts`. */
export interface BackendOwner {
  name: string;
  county: string;
  leaseCount: number;
  appraisedValue: number;
  leases: string[] | null;
  /**
   * PER-LEASE ARRAYS, ALL INDEX-ALIGNED WITH `leases` (backend, 2026-08-27).
   * `leaseNumbers`, `operators` and `interestValues` arrived together and are
   * what the Lease Details table binds to; before them those columns could
   * only show "—".
   */
  leaseValues: number[] | null;
  leaseNumbers: string[] | null;
  operators: string[] | null;
  /** Decimal interest, e.g. 0.007753 — NOT a percentage. */
  interestValues: number[] | null;
  address: string | null;
  workingInterest: boolean;
  score: number | null;
  accounts: unknown;
}

/**
 * One owner row. Positional, straight from the index build:
 * `[name, propertyCount, appraisedValue, [leases], mailingAddress, 0, opflag,
 * accounts?]`. Only the first five are read; the tail is carried opaque.
 */
export type OwnerRow = [string, number, number, string[], string, ...unknown[]];

/** An owner row scored against the current query, tagged with its county. */
export interface ScoredOwner {
  r: OwnerRow;
  county: string;
  s: number;
  /** Per-lease appraised values (aligned with `r[3]`), when the API sent them. */
  leaseValues?: number[];
  /** Per-lease numbers, operators and decimal interests, same alignment. */
  leaseNumbers?: string[];
  operators?: string[];
  interestValues?: number[];
  /** True = working interest, false = royalty interest (the API's flag). */
  workingInterest?: boolean;
}

/** `GET /api/claim/meta` — hero stats and the county dropdown. */
export interface ClaimMeta {
  totalOwners: number;
  counties: { name: string; owners: number }[];
}

/** `GET /api/claim/search` — ranked matches, capped at 500. */
export interface SearchResponse {
  owners: ScoredOwner[];
}

/**
 * `GET /api/claim/lease-owners` — a lease's FULL membership from its county
 * roll (exact despaced-name match; `lease` is the despaced lease name).
 */
export interface LeaseOwnersResponse {
  owners: ScoredOwner[];
}

/**
 * `GET /api/claim/same-name` — every record in `county` with the same
 * despaced `name` at a different address than `address`, for the
 * "Is this you?" popup. `key` is `county|despacedName|despacedAddress`.
 */
export interface SameNameResponse {
  /**
   * CARRIES THE PER-LEASE ARRAYS TOO (2026-08-27). A record ticked through
   * the popup ends up in the working set, so if these were dropped here its
   * Lease Details row lost its lease number, operator and interest — the
   * bug that showed "—" for every record confirmed that way.
   */
  items: {
    r: OwnerRow;
    county: string;
    key: string;
    leaseValues?: number[];
    leaseNumbers?: string[];
    operators?: string[];
    interestValues?: number[];
    workingInterest?: boolean;
  }[];
}

/* ---------- client-side view shapes ---------- */

/**
 * `POST /owners/claim` — the result of claiming a set of owner names.
 *
 * PARTIAL SUCCESS IS NORMAL: the endpoint reports each name separately, so a
 * claim of three owners can come back with two filed and one rejected (most
 * often `OWNER_ALREADY_CLAIMED`). The UI has to show both halves rather than
 * treating the call as pass/fail.
 */
export interface ClaimResult {
  successful_owners: {
    ownername: string;
    claimed_leases_count: number;
    failed_leases_count: number;
  }[];
  failed_owners: {
    ownername: string;
    error: string;
    error_code: string;
    failed_lease_count: number;
  }[];
  summary: {
    total_owners_processed: number;
    total_successful_owners: number;
    total_failed_owners: number;
  };
  claimedAt: string;
}

/** One aggregated lease on the left panel, keyed `county|despacedName`. */
export interface LeaseAgg {
  key: string;
  n: string;
  c: string;
  /** Owners of this lease inside the current working set. */
  cnt: number;
  /** Sum of those owners' appraised values. */
  val: number;
}

/** The claimed-record payload stored for the signup flow to pick up. */
export interface MergedTx {
  /** The picked record's name — the claim's headline name. */
  owner: string;
  /**
   * EVERY distinct name across the claimed records, in pick order. Ticking
   * two records that are both you can still mean two spellings on the roll
   * ("Sturman W Carl" / "Sturman Wanda C"), and the card used to show only
   * the first, so a two-record claim read as a one-record claim.
   */
  owners: string[];
  /** How many roll records this claim covers (1 + merged). */
  records: number;
  county: string;
  props: number;
  value: number;
  leases: string[];
  addresses: string[];
  merged: number;
  when: string;
}
