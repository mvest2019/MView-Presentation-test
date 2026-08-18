/**
 * Two more of the operator detail page's reads.
 *
 *   `POST /api/v1/operators/recent-wells-permits` → permit and completion filings
 *   `POST /api/v1/operators/production-by-county`  → lifetime volumes per county
 *
 * NOT `server-only`. Both sections are deferred and fetch when approached, so these
 * run in the browser against `NEXT_PUBLIC_OPERATOR_API_BASE_URL`, the same way the
 * lease tables and the production chart do.
 *
 * THE TWO ENDPOINTS DISAGREE ABOUT THE OPERATOR'S KEY, as `/leases` and `/wells`
 * already do: recent-wells-permits wants `operator_number`, production-by-county wants
 * `operator_no`. Established by probing; both are honoured as spelled.
 *
 * NEITHER SUPPORTS SERVER-SIDE PAGINATION. `page` and `pagesize` are accepted and
 * ignored — Pioneer returns all 1,892 filings whichever way they are sent, and
 * production-by-county carries no `total_count` at all. So both callers paginate the
 * complete response client-side, which is why each fetcher returns the whole set once
 * and the components slice it. Sending a page parameter that does nothing would imply
 * a guarantee the API does not make.
 *
 * THE UNITS ARE BARRELS AND MCF, and the response does not say so. It was worth
 * pinning down rather than guessing: production-by-county reports MIDLAND oil as
 * 714,981,764, and `/production-graph` for MIDLAND across its full history sums to the
 * same figure — which this app already labels bbl, and gas Mcf, everywhere else. So
 * these are raw barrels, NOT thousands of barrels; a header reading "MBBL" would
 * understate every number by a factor of a thousand.
 */
import { publicOperatorApiBaseUrl } from "./operator-api-types";

/** Rows per page. Both tables paginate past this, and neither shows a pager under it. */
export const ACTIVITY_PAGE_SIZE = 10;

const REQUEST_TIMEOUT_MS = 20_000;

/** The units the volume columns carry, printed in the headers. */
export const OIL_UNIT = "bbl";
export const GAS_UNIT = "Mcf";
export const BOE_UNIT = "BOE";

export interface WellPermitRecord {
  /** API-14. Null on a permit filed before a well was assigned one. */
  apiNo: string | null;
  leaseName: string;
  county: string;
  status: string;
  /** e.g. Directional, Horizontal. Casing varies upstream; normalised for display. */
  wellboreProfile: string;
  /** Already formatted (`"Jul 3, 2025"`), or null when the API sent nothing. */
  submittedDate: string | null;
  approvedDate: string | null;
  /** `New Permit` or `New Completion`. Not a column, but it keys the row. */
  activityType: string;
}

export interface CountyProductionRecord {
  county: string;
  /** Barrels. */
  oil: number;
  /** Mcf. */
  gas: number;
  /** Barrels of oil equivalent. */
  boe: number;
  /** The API's own percentage — not recomputed here. */
  shareOfOperator: number;
}

export interface ActivityResult<T> {
  rows: T[];
  total: number;
}

/* ---------------------------------------------------------------- parsing */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** A trimmed string, or null — so a missing value can render as a dash, not "". */
function optional(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed === "" ? null : trimmed;
}

function numeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * `"07/15/2025"` or `"2025-07-15"` → `"Jul 15, 2025"`.
 *
 * The API sends US-ordered dates on the two filing columns and ISO on
 * `most_recent_date`, so both shapes are accepted. Anything else is returned unchanged
 * rather than dropped: an unparseable date the API sent is still information, whereas
 * a null would silently claim there was no date at all.
 */
export function formatFilingDate(value: unknown): string | null {
  const raw = optional(value);
  if (raw === null) return null;

  const us = US_DATE.exec(raw);
  if (us) {
    const month = MONTHS[Number(us[1]) - 1];
    return month ? `${month} ${Number(us[2])}, ${us[3]}` : raw;
  }

  const iso = ISO_DATE.exec(raw);
  if (iso) {
    const month = MONTHS[Number(iso[2]) - 1];
    return month ? `${month} ${Number(iso[3])}, ${iso[1]}` : raw;
  }
  return raw;
}

/* ---------------------------------------------------------------- requests */

function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!signal) return timeout;
  return typeof AbortSignal.any === "function"
    ? AbortSignal.any([signal, timeout])
    : signal;
}

async function post(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${publicOperatorApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: withTimeout(signal),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

export async function fetchRecentWellsPermits(
  operatorNumber: string,
  signal?: AbortSignal,
): Promise<ActivityResult<WellPermitRecord>> {
  const payload = await post(
    "/api/v1/operators/recent-wells-permits",
    { operator_number: operatorNumber },
    signal,
  );

  const raw = (payload as { results?: unknown }).results;
  const list = Array.isArray(raw) ? raw : [];

  const rows: WellPermitRecord[] = list.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      apiNo: optional(record.api),
      leaseName: text(record.lease_name),
      county: text(record.county),
      status: text(record.status),
      wellboreProfile: text(record.wellbore_profile),
      submittedDate: formatFilingDate(record.submit_date),
      approvedDate: formatFilingDate(record.approved_date),
      activityType: text(record.activity_type),
    };
  });

  const reported = (payload as { total_count?: unknown }).total_count;
  return {
    rows,
    total:
      typeof reported === "number" && Number.isFinite(reported)
        ? reported
        : rows.length,
  };
}

export async function fetchCountyProduction(
  operatorNumber: string,
  signal?: AbortSignal,
): Promise<ActivityResult<CountyProductionRecord>> {
  const payload = await post(
    "/api/v1/operators/production-by-county",
    { operator_no: operatorNumber },
    signal,
  );

  const raw = (payload as { counties?: unknown }).counties;
  const list = Array.isArray(raw) ? raw : [];

  const rows: CountyProductionRecord[] = list.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      county: text(record.county),
      oil: numeric(record.total_production_oil),
      gas: numeric(record.total_production_gas),
      boe: numeric(record.total_production_boe),
      shareOfOperator: numeric(record.county_share_of_operator),
    };
  });

  // This endpoint sends no `total_count`, so the row count IS the total.
  return { rows, total: rows.length };
}
