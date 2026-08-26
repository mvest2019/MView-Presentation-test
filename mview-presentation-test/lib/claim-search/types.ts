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
  /** Per-lease appraised values, aligned with `leases` by index. */
  leaseValues: number[] | null;
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
  items: { r: OwnerRow; county: string; key: string }[];
}

/* ---------- client-side view shapes ---------- */

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
  owner: string;
  county: string;
  props: number;
  value: number;
  leases: string[];
  addresses: string[];
  merged: number;
  when: string;
}
