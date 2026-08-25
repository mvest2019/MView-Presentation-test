/**
 * Shared shapes for the Find Your Record page (`/claim`) and its API.
 *
 * THE API CONTRACT LIVES HERE. The UI only ever talks to these four
 * endpoints (see `lib/claim-search/api.ts`); today they are implemented by
 * Next route handlers over the prebuilt index in `public/owners/`, and the
 * backend team can replace them behind `NEXT_PUBLIC_CLAIM_API_BASE_URL`
 * without touching a single component:
 *
 *   GET /api/claim/meta                          → ClaimMeta
 *   GET /api/claim/search?name&lease&county      → SearchResponse
 *   GET /api/claim/lease-owners?county&lease     → LeaseOwnersResponse
 *   GET /api/claim/same-name?county&name&address → SameNameResponse
 *   POST /api/address-correction {owner, county, oldAddress, newAddress}
 */

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

/* ---------- server-side index shapes (implementation detail) ---------- */

/** `public/owners/manifest.json` — county → {file slug, roll year, row count}. */
export type Manifest = Record<string, { f: string; y?: number; n: number }>;

/** `public/owners/<slug>.json` — one county's full roll. */
export interface CountyChunk {
  county: string;
  year?: number;
  owners: OwnerRow[];
}

/** A first-letter bucket row (`name_<b>` / `lease_<b>`): `[text, county, cnt?]`. */
export type BucketRow = [string, string, ...unknown[]];

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
