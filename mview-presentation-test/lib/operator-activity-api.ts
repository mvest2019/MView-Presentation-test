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

/**
 * The units the volume columns carry, printed in the headers.
 *
 * DEFECT 141 — UPPERCASE. These read "bbl" and "Mcf" while every other unit on the
 * profile was already capitalised — MBBL, MMCF, MMBBL, BCF, BOE, all of them the
 * API's own spelling. Two lowercase ones among them read as a different kind of
 * label rather than as the same kind of unit, which is what the snaps ringed.
 */
export const OIL_UNIT = "BBL";
export const GAS_UNIT = "MCF";
export const BOE_UNIT = "BOE";

export interface WellPermitRecord {
  /** API-14. Null on a permit filed before a well was assigned one. */
  apiNo: string | null;
  leaseName: string;
  county: string;
  status: string;
  /**
   * e.g. Directional, Horizontal — EXACTLY as the endpoint spelled it, trimmed only.
   *
   * CASING VARIES UPSTREAM AND IS NOT NORMALISED HERE. This doc used to say it was,
   * which was wrong and cost a defect: Apache's filings carry `Horizontal` and
   * `HORIZONTAL` and both `Vertical` and `VERTICAL`. The table has always passed this
   * through `titleCase` on the way to the cell, so the inconsistency was invisible
   * until defect 131's filter tried to group by it. Anything grouping or comparing
   * these values must fold the case itself.
   */
  wellboreProfile: string;
  /** Already formatted (`"Jul 3, 2025"`), or null when the API sent nothing. */
  submittedDate: string | null;
  approvedDate: string | null;
  /**
   * The same two dates as `YYYY-MM-DD`, for comparison rather than display.
   *
   * THE DISPLAY STRING CANNOT BE COMPARED. "Jul 3, 2025" sorts before "Mar 1, 2019"
   * alphabetically, so the date filters need something ordered. This shape is also
   * exactly what `<input type="date">` produces, so the filter compares two strings
   * and never constructs a Date — no timezone to shift the boundary by a day.
   *
   * Null on the same rows the display fields are null on: a permit filed before a
   * decision has no approved date, and an unparseable date is not silently turned
   * into one.
   */
  submittedOn: string | null;
  approvedOn: string | null;
  /** `New Permit` or `New Completion`. Not a column, but it keys the row. */
  activityType: string;
}

export interface CountyProductionRecord {
  county: string;
  /** Barrels. */
  oil: number;
  /** The figure exactly as the endpoint wrote it, e.g. `416.192`. */
  oilText: string;
  /** The unit the endpoint named for it, e.g. `MMBBL`. Empty if it named none. */
  oilUnit: string;
  /** Mcf. */
  gas: number;
  gasText: string;
  gasUnit: string;
  /** Barrels of oil equivalent, as the endpoint reports it. */
  boe: number;
  boeText: string;
  boeUnit: string;
  /** The API's own percentage — not recomputed here. */
  shareOfOperator: number;
}

export interface ActivityResult<T> {
  rows: T[];
  total: number;
  /**
   * True when the reader has no account, so some or all of the answer was withheld.
   *
   * TWO READS RETURN IT, and they are gated differently — the flag means "a gate
   * applied", not "there is nothing here":
   *
   *   filings (`/api/operators/recent-wells-permits`)  no rows at all; the upstream
   *                                                    call is skipped entirely
   *   county production (`/api/operators/production-by-county`)  every row present,
   *                                                    with oil and gas masked
   *
   * Distinct from an empty result on purpose: "this operator has filed nothing
   * lately" and "filings need an account" are different sentences, and the sections
   * draw them differently.
   */
  locked?: boolean;
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
    /* STRIPPED OF EVERYTHING BUT THE NUMBER, not just commas. This endpoint sends
       `"416.192 (MMBBL)"`, and `Number("416.192 (MMBBL)")` is NaN — so every county's
       oil, gas and BOE was falling through to the zero below and the whole table read
       0. Measured on Diamondback: Martin, Midland, Pecos and Reeves all showed 0
       against 416.192, 178.359, 91.571 and 73.601 MMBBL. */
    const parsed = Number(value.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * The endpoint's own rendering of a volume, split from the unit it named.
 *
 * `"416.192 (MMBBL)"` -> `{ text: "416.192", unit: "MMBBL" }`. Both are carried to the
 * table rather than reformatted: the figure is printed exactly as sent, and the column
 * is headed with the unit the response actually used. The alternative was what was
 * there — a hardcoded `bbl` over a number the API measured in MMBBL, which is a
 * thousandfold mislabel even once the parse is fixed.
 */
function volumeText(value: unknown): { text: string; unit: string } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { text: value.toLocaleString("en-US"), unit: "" };
  }
  if (typeof value !== "string") return { text: "", unit: "" };
  const match = /^\s*([^()]*?)\s*(?:\(([^)]*)\))?\s*$/.exec(value);
  return { text: (match?.[1] ?? value).trim(), unit: (match?.[2] ?? "").trim() };
}

/**
 * `"07/15/2025"` or `"2025-07-15"` → `"2025-07-15"`, for ordering and comparison.
 *
 * Returns null rather than the raw string when it cannot parse one: unlike the display
 * formatter below, an un-comparable value here has to be excluded from a range rather
 * than compared as text and silently mis-filtered.
 */
export function filingDateKey(value: unknown): string | null {
  const raw = optional(value);
  if (raw === null) return null;

  const us = US_DATE.exec(raw);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;

  const iso = ISO_DATE.exec(raw);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  return null;
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

/**
 * `/api/v1/...` is upstream; anything else is one of this site's own handlers.
 *
 * The two reads here no longer share a host: production-by-county is public and
 * goes straight to the operator API, while the filings feed passes through
 * `app/api/operators/recent-wells-permits/` so a server can decide who is asking.
 * Deriving the host from the path shape keeps that to one rule.
 */
function endpointUrl(path: string): string {
  return path.startsWith("/api/v1/")
    ? `${publicOperatorApiBaseUrl()}${path}`
    : path;
}

async function post(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(endpointUrl(path), {
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
    /* THROUGH THIS SITE'S OWN ORIGIN — see the route handler for why the filings
       feed is account-only while everything else on the profile is not. */
    "/api/operators/recent-wells-permits",
    { operator_number: operatorNumber },
    signal,
  );

  // The gate's answer, before anything is parsed: no rows were fetched.
  if ((payload as { locked?: unknown }).locked === true) {
    return { rows: [], total: 0, locked: true };
  }

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
      submittedOn: filingDateKey(record.submit_date),
      approvedOn: filingDateKey(record.approved_date),
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
    /* THROUGH THIS SITE'S OWN ORIGIN, as of the county gate. This used to call
       `/api/v1/operators/production-by-county` directly — the endpoint sends
       `access-control-allow-origin: *` and takes no `member_id`, so the browser
       could. It cannot any more: oil and gas are withheld from a signed-out reader,
       and a mask applied anywhere but the server leaves the real figures in the
       reader's network tab. See the route handler. */
    "/api/operators/production-by-county",
    { operator_no: operatorNumber },
    signal,
  );

  const raw = (payload as { counties?: unknown }).counties;
  const list = Array.isArray(raw) ? raw : [];

  const rows: CountyProductionRecord[] = list.map((entry) => {
    const record = entry as Record<string, unknown>;
    const oil = volumeText(record.total_production_oil);
    const gas = volumeText(record.total_production_gas);
    const boe = volumeText(record.total_production_boe);
    return {
      county: text(record.county),
      oil: numeric(record.total_production_oil),
      oilText: oil.text,
      oilUnit: oil.unit,
      gas: numeric(record.total_production_gas),
      gasText: gas.text,
      gasUnit: gas.unit,
      boe: numeric(record.total_production_boe),
      boeText: boe.text,
      boeUnit: boe.unit,
      shareOfOperator: numeric(record.county_share_of_operator),
    };
  });

  // This endpoint sends no `total_count`, so the row count IS the total.
  /* `locked` rides on the response rather than being inferred from a `"****"` in the
     rows: the rows still arrive (county and BOE are free), so unlike the filings feed
     there is no "no rows" signal to read the gate off. §4 rule 2. */
  return {
    rows,
    total: rows.length,
    locked: (payload as { locked?: unknown }).locked === true,
  };
}
