import "server-only";

import { publicOperatorApiBaseUrl, TEMP_MEMBER_ID } from "./operator-api-types";

/**
 * `POST /api/v1/operators/details` — the operator detail endpoint.
 *
 * SERVER-ONLY, AND DELIBERATELY SO. The four sections this feeds — hero, condition
 * matrix, company information, production metrics — are the page's first paint and
 * its `generateMetadata` source, so the read has to happen before HTML is produced.
 * Fetching it from the browser on scroll would leave the hero (the LCP element)
 * empty at first paint and would put `seo_operator_name` out of reach of the title
 * and canonical, which are rendered on the server.
 *
 * ONE CALL, NOT FOUR. The whole response is 3.8 KB and carries every field all four
 * sections need. Splitting it per section would mean calling the same endpoint four
 * times per page view. Instead it is read once and cached, and Next's request
 * deduplication means `generateMetadata` and the page body share a single upstream
 * call even though both await it.
 *
 * The heavy sections below the fold — the 254-path map, the 84-row county table, the
 * 40-row lease table — are fixture-backed and have no endpoint of their own. They are
 * deferred by rendering, not by fetching; see `DeferredSection`.
 */

/** Exactly the documented payload. */
export interface OperatorDetailsRequest {
  operator_no: string;
  member_id: string;
}

/** One `{ county }` entry in the full county list. */
export interface OperatorDetailsCounty {
  county: string;
}

/** A top-producing county, with its real lifetime BOE. */
export interface OperatorDetailsTopCounty {
  county: string;
  totalBOE: number;
}

/** A month-over-month or year-over-year comparison. */
/**
 * A month-on-month or year-on-year comparison.
 *
 * NULLABLE THROUGHOUT, like the block that holds it: an operator with nothing to
 * compare returns every field null rather than omitting the object.
 */
export interface OperatorDetailsComparison {
  month: string | null;
  month_label: string | null;
  boe: number | null;
  change_percent: number | null;
  direction: "up" | "down" | null;
}

export interface OperatorDetailsRecord {
  OperatorName: string;
  operator_name_url: string;
  OperatorNo: string;
  start_productiondate: string;
  end_productiondate: string;
  leaseCount: number;
  operator_location: string;
  operator_contact_no: string;
  operator_address: string;
  cleaned_operator_name: string;
  /** Marketing alias — not always present. */
  seo_operator_name?: string;
  seo_operator_url?: string;
  defaultCounty: string;
  counties: OperatorDetailsCounty[];
  top_producing_counties: OperatorDetailsTopCounty[];
  /** Pre-formatted with units by the API, e.g. `"1,907,873.826 (MBBL)"`. */
  Totaloilproduction: string;
  Totalgasproduction: string;
  TotalBOEproduction: string;
  Current_Year_BOE_Prod: string;
  Previous_Year_BOE_Prod: string;
  status: string;
  statewide_rank: number;
}

/**
 * The condition matrix's four blocks.
 *
 * Every field here is measured and dated by the API. This is what replaced the
 * hardcoded cards the page used to show for one operator only.
 *
 * NOTE WHAT IS ABSENT. `producing_leases` carries a count and a total and no
 * historical comparison, so the design's "▼ 214 / 12 mo" chip on that card has no
 * source. It is hidden rather than computed — see `buildConditionCards`.
 */
export interface OperatorCondition {
  /** ISO date the whole block was computed for. */
  as_of: string;
  /**
   * EVERY FIELD HERE CAN BE NULL, and the type says so because the live response
   * does. An operator with no filed production — a services company, say — returns
   * the block with `month`, `boe`, `mmboe` and both comparisons all null. Modelling
   * them as required is what made the detail page crash with
   * `Cannot read properties of null (reading 'toFixed')` the moment the route stopped
   * being limited to thirty major producers.
   */
  latest_monthly_boe: {
    month: string | null;
    month_label: string | null;
    boe: number | null;
    mmboe: number | null;
    mom: OperatorDetailsComparison;
    yoy: OperatorDetailsComparison;
  };
  producing_leases: {
    count: number;
    total_leases: number;
  };
  new_permits_90d: {
    count: number;
    prior_quarter_count: number;
    change: number;
    direction: "up" | "down";
    count_365d: number;
  };
  completions_90d: {
    count: number;
    count_365d: number;
    producing_count: number;
    prior_quarter_count: number;
    change_vs_prior_quarter: number;
    same_quarter_last_year_count: number;
    change_vs_same_quarter_last_year: number;
    direction_vs_same_quarter_last_year: "up" | "down";
  };
}

export interface OperatorDetailsResponse {
  operator_details: OperatorDetailsRecord[];
  /** Absent if the endpoint cannot compute it; the section then renders empty. */
  operator_condition?: OperatorCondition;
}

/** How long a detail read stays warm. Production is filed monthly, not hourly. */
const REVALIDATE_SECONDS = 1800;
const REQUEST_TIMEOUT_MS = 10000;

function isDetailsResponse(value: unknown): value is OperatorDetailsResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as OperatorDetailsResponse;
  return (
    Array.isArray(body.operator_details) && body.operator_details.length > 0
  );
}

/**
 * Read one operator's detail, or null when the endpoint has nothing for it.
 *
 * Returns null rather than throwing on a bad status or an unrecognised body: the
 * page's own fixture still covers identity and the heavier sections, so a failed
 * read should thin the page out, not take it down. A genuine fault is logged with
 * the operator number so it is traceable.
 */
export async function fetchOperatorDetails(
  operatorNumber: string,
): Promise<OperatorDetailsResponse | null> {
  const payload: OperatorDetailsRequest = {
    operator_no: operatorNumber,
    // Same temporary stand-in the search integration uses. When real auth lands
    // this becomes the session's member id in one place.
    member_id: String(TEMP_MEMBER_ID),
  };

  try {
    const response = await fetch(
      `${publicOperatorApiBaseUrl()}/api/v1/operators/details`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // Cached and tagged, so repeat views cost no upstream call and the whole
        // operator surface can be revalidated together.
        next: { revalidate: REVALIDATE_SECONDS, tags: ["operators"] },
      },
    );

    if (!response.ok) {
      console.error("[operator-detail] details responded", {
        operatorNumber,
        status: response.status,
      });
      return null;
    }

    const body: unknown = await response.json();

    // TEMPORARY — remove after inspecting. Server-side only (this module is
    // `server-only`), so it prints in the `next dev` terminal, never the browser.
    console.log(
      `[operator-details-api] ${operatorNumber}`,
      JSON.stringify(body, null, 2),
    );

    if (!isDetailsResponse(body)) {
      console.error("[operator-detail] unexpected details body", {
        operatorNumber,
      });
      return null;
    }

    return body;
  } catch (error) {
    console.error("[operator-detail] details fetch failed", {
      operatorNumber,
      error,
    });
    return null;
  }
}
