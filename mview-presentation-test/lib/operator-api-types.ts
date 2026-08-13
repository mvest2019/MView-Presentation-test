/**
 * The operator API's wire contract — request shapes, response shapes, and the
 * constants derived from them.
 *
 * Deliberately separate from `operator-api.ts`, which is `server-only` because it
 * holds the `fetch` and the API host. The payload builder and the record→row
 * mapper in `operator-search.ts` run in the client bundle and need these types,
 * so importing them from the server-only module would drag the fetcher into the
 * browser graph — which is exactly what the build refuses to do.
 *
 * Every shape here was read off the live dev host, not inferred from the docs.
 */

/* ==========================================================================
   GET /api/v1/operators/playtypes
   ========================================================================== */

/**
 * Live response:
 *   { "playtypes": ["BARNETT SHALE", "EAGLE FORD SHALE", "GRANITE WASH",
 *                   "HAYNESVILLE/BOSSIER SHALE", "PERMIAN BASIN"] }
 *
 * A bare array of strings under one key — not `{ id, name }` objects, and not a
 * top-level array. Values arrive upper-cased.
 */
export interface OperatorPlayTypesResponse {
  playtypes: string[];
}

/* ==========================================================================
   GET /api/v1/operators/counties
   ========================================================================== */

/**
 * Live response:
 *   { "counties": ["ANDERSON", "ANDREWS", …, "ZAVALA"] }
 *
 * Same shape as the play types endpoint — one key, a flat array of upper-case
 * strings. 255 entries, and NOT the canonical list of 254 Texas counties:
 *
 *  · 14 are not counties at all but Railroad Commission offshore and bay
 *    districts — `BRAZOS-LB`, `GALVESTON-SB`, `HIGH IS-LB`, `MATGRDA IS-SB`,
 *    `MUSTANG IS-LB`, `N PADRE IS-LB`, `SABINE PASS` and friends, where LB/SB
 *    are Large and Small Bay and IS is Island.
 *  · 12 real counties are missing because no operator reports there — Bailey,
 *    Burnet, Collin, Comal, El Paso, Gillespie, Hall, Lamar, Llano, Mason,
 *    Parmer, Randall.
 *  · `DE WITT` is spelled with a space, where the county is normally `DeWitt`.
 *
 * This list is authoritative for filtering regardless: `county` in the search
 * payload matches these values, case-sensitively, so the filter has to offer
 * exactly what the endpoint knows about.
 */
export interface OperatorCountiesResponse {
  counties: string[];
}

/* ==========================================================================
   POST /api/v1/operators/search
   ========================================================================== */

/**
 * Endpoint paths, defined once. Joined to the base URL by whoever makes the
 * call — `lib/operator-api.ts` on the server, `use-operator-directory.ts` in the
 * browser — so neither hard-codes a path of its own.
 */
export const OPERATOR_ENDPOINTS = {
  playTypes: "/api/v1/operators/playtypes",
  counties: "/api/v1/operators/counties",
  search: "/api/v1/operators/search",
} as const;

/**
 * Where the browser should ask for an operator's logo: our own origin, not the
 * API's.
 *
 * The upstream logo response sets `Cross-Origin-Resource-Policy: same-origin`, so
 * an `<img>` pointing at `operator_logo` directly is fetched and then refused by
 * the browser. `app/api/operators/[number]/logo/route.ts` re-serves the same bytes
 * from here, which makes the embed same-origin.
 *
 * ONE PLACE, SO THE ROUTE AND THE ROW CANNOT DISAGREE. When the upstream header is
 * fixed this function becomes `record.operator_logo` and the handler is deleted.
 */
export function operatorLogoPath(operatorNumber: string): string {
  return `/api/operators/${encodeURIComponent(operatorNumber)}/logo`;
}

/**
 * The operator API host as seen from the browser.
 *
 * Read from `NEXT_PUBLIC_OPERATOR_API_BASE_URL`, which `next.config.ts` inlines
 * at build time. Server-side code must keep using `OPERATOR_API_BASE_URL` via
 * `lib/operator-api.ts` instead of this.
 */
export function publicOperatorApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_OPERATOR_API_BASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_OPERATOR_API_BASE_URL is not set (see next.config.ts).",
    );
  }
  return url.replace(/\/+$/, "");
}

/**
 * Sort fields the API honours, established by probing.
 *
 * An unrecognised `sort.propertyName` does NOT error — it silently falls back to
 * a default ordering, so a typo is invisible. `operator_name`,
 * `cleaned_operator_name` and `status` each return byte-identical results to a
 * deliberately bogus field name, which is why sorting by operator name is absent:
 * the endpoint does not support it.
 */
export const OPERATOR_SORT_FIELDS = {
  oil: "oil_produced_current_quarter",
  gas: "gas_produced_current_quarter",
  cty: "countie_count",
} as const;

/**
 * The request body — exactly the thirteen fields the endpoint accepts, no more.
 *
 * Three behaviours were established by probing rather than assumed, because each
 * is easy to get silently wrong:
 *
 *  · `status` takes `"active"`, `"inactive"` or `""`. The empty string means "all
 *    statuses": 3,095 active + 21,649 inactive = 24,744, exactly what `""`
 *    returns. That maps onto the filter's existing default option.
 *  · `county` is CASE-SENSITIVE and wants upper case. `"MIDLAND"` returns 137
 *    records; `"Midland"` and `"midland"` both return 0.
 *  · `playtype` is likewise case-sensitive and upper case, and the property name
 *    itself matters: spelled `playType` it is silently ignored and the full 3,095
 *    come back. Measured filtering — BARNETT SHALE 901, PERMIAN BASIN 1,243,
 *    EAGLE FORD SHALE 853, GRANITE WASH 381, HAYNESVILLE/BOSSIER SHALE 365.
 *    `""` means all play types. An unrecognised value returns 0 rather than an
 *    error, so a casing slip looks like "no results", not like a bug.
 */
export interface OperatorSearchRequest {
  page: number;
  search_text: string;
  pageSize: number;
  sort: { propertyName: string; type: "asc" | "desc" };
  activeInLast90Days: boolean;
  topProducers: boolean;
  moreThan5Counties: boolean;
  moreThan10Counties: boolean;
  county: string;
  member_id: number;
  status: "active" | "inactive" | "";
  /** Upper case, or `""` for all. Note the all-lowercase property name. */
  playtype: string;
  visitorId: string;
}

/**
 * ============================================================================
 * TEMPORARY — replace with the signed-in member's id when auth lands.
 *
 * `member_id` is the API's access gate. With `0` (anonymous) any query that uses
 * a quick filter comes back with rows 4-10 replaced by `"****"`; with a member id
 * the same query returns all ten intact. Verified against the dev host:
 * `activeInLast90Days: true` gives 7 masked rows at `0` and 0 masked at `3448`,
 * with an identical `total_count` of 2,748 — so it changes what a visitor may
 * see, not what matches.
 *
 * 3448 is a stand-in supplied for development. It means every visitor is
 * currently treated as that member, which is exactly what real authentication
 * has to replace — this must not reach production as-is.
 * ============================================================================
 */
export const TEMP_MEMBER_ID = 3448;

/**
 * The placeholder the API substitutes for every field of a gated row.
 *
 * Rows 4–10 come back with `"****"` in *every* property — including the numeric
 * `countie_count` / `leaseCount` / `Total_Production_BOE` and the `*_month_year`
 * arrays — whenever one of the four quick-filter booleans is true and `member_id`
 * is 0. Verified: search, county, status and paging never mask, and re-running
 * the same gated query with `member_id: 1` returns all ten rows intact. It is a
 * sign-in gate on the quick filters, not an error.
 */
export const MASKED = "****";

/** One record as returned by the search endpoint. */
export interface OperatorSearchRecord {
  operator_number: string;
  operator_name: string;
  operator_name_url: string;
  cleaned_operator_name: string;
  /** Absent on some records — not every operator has an SEO alias. */
  seo_operator_name?: string;
  seo_operator_url?: string;
  end_productiondate: string;
  /** Pre-formatted with units by the API, e.g. `"57,323.230 (MBBL)"`. */
  oil_produced_current_quarter: string;
  gas_produced_current_quarter: string;
  oil_produced_previous_quarter: string;
  gas_produced_previous_quarter: string;
  /** Numbers normally; the literal `"****"` on a gated row. */
  countie_count: number | typeof MASKED;
  leaseCount: number | typeof MASKED;
  Total_Production_BOE: number | typeof MASKED;
  current_quarter_month_year: string[] | typeof MASKED;
  previous_quarter_month_year: string[] | typeof MASKED;
  status: string;
  /**
   * An absolute URL to the operator's logo on the API host, e.g.
   * `https://mview-dev-api.mineralview.com/api/v1/operators/020528/logo`.
   *
   * IT IS A TEMPLATE, NOT A PROMISE. The value is built from the operator number
   * and comes back populated on every record, including operators that have no
   * logo — the endpoint then answers 404 with
   * `{"error":{"message":"No logo for operator 020528"}}`. So a non-empty
   * `operator_logo` does NOT mean an image exists, and the only way to find out is
   * to request it. Whatever renders this has to fall back on error; see
   * `OperatorRow.logoUrl`.
   *
   * Optional because it is not part of the payload contract we were given, and a
   * response without it must not break the mapping.
   */
  operator_logo?: string | null;
}

export interface OperatorSearchResponse {
  result: OperatorSearchRecord[];
  total_count: number;
}
