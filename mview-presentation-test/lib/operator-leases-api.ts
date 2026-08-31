import { publicOperatorApiBaseUrl, TEMP_MEMBER_ID } from "./operator-api-types";

/**
 * The operator detail page's two lease reads.
 *
 *   `POST /api/v1/operators/leases` → the lease table
 *   `POST /api/v1/operators/wells`  → the wells belonging to one lease
 *
 * NOT `server-only`. Both are driven by controls the visitor operates — a search
 * field, a county filter, page buttons, a lease row — so they run in the browser
 * against `NEXT_PUBLIC_OPERATOR_API_BASE_URL`, the same way the production chart does.
 *
 * THE TWO ENDPOINTS DISAGREE ABOUT THE OPERATOR'S KEY, and neither is a typo:
 * `/leases` wants `operator_no`, `/wells` wants `operator_number`. Sending the wrong
 * one gets `400 VALIDATION_ERROR` naming the field it wanted. Established by probing,
 * not assumed.
 *
 * `member_id` IS AN ACCESS GATE ON `/wells`. Without it every value in every row comes
 * back as the literal `*****` — field names intact, contents redacted. With any member
 * id the rows are real. `/leases` returns real rows either way. `TEMP_MEMBER_ID` is the
 * same development stand-in the rest of the operator API uses, and carries the same
 * warning: it must not reach production without real authentication behind it.
 *
 * ONE SEARCH FIELD COVERS NAME AND NUMBER. `lease_number` is not restricted to numbers
 * despite its name — "SPRABERRY" returns the six leases whose names contain it, and
 * "15400" returns the one with that number. So the UI needs a single search box, not
 * two, and the filtering happens upstream rather than over a page of already-fetched
 * rows.
 *
 * THE VALUES ARE STRINGS, WITH SENTINELS. Volumes arrive comma-grouped (`"43,676,926"`)
 * or as the literal `"NO RPT"`; production dates as `"MM-YYYY"` or as `"00-0000"`;
 * a well's status as a real status or the literal string `"Null"`. Each of those three
 * sentinels becomes `null` here, at the boundary, so nothing downstream has to know
 * them and no sentinel is ever mistaken for a zero. A well with no reported volume is
 * not a well that produced nothing.
 */

/** Rows per page, for both tables. Pagination appears only past this. */
export const LEASE_PAGE_SIZE = 10;

const REQUEST_TIMEOUT_MS = 15000;

export interface LeaseRecord {
  leaseNumber: string;
  leaseName: string;
  county: string;
  districtCode: string;
  status: string | null;
  /** Lifetime reported oil in barrels, or null when the API reports none. */
  oil: number | null;
  /** Lifetime reported gas in Mcf, or null when the API reports none. */
  gas: number | null;
}

export interface WellRecord {
  apiNo: string;
  wellNumber: string;
  /**
   * The lease this well sits on. A well has no name of its own in the response —
   * the RRC identifies one as its lease's name plus its well number, which is what
   * the design's "Well name" column shows, so the table composes the two. Both
   * halves are the API's own fields; nothing is invented.
   */
  leaseName: string;
  status: string | null;
  county: string;
  oil: number | null;
  gas: number | null;
  /** First reported production, already formatted (`"Jan 1998"`), or null. */
  productionStart: string | null;
}

export interface PagedResult<T> {
  rows: T[];
  /** Rows matching the filters across every page, for the pager. */
  total: number;
  /**
   * True when the reader has no account and the rows were never fetched.
   *
   * DISTINCT FROM AN EMPTY RESULT, which is why it is not simply `rows: []`. "This
   * lease has no wells on record" and "these wells need an account" are different
   * facts, and the drawer draws them differently. Only `/wells` can return it.
   */
  locked?: boolean;
}

/* ---------------------------------------------------------------- parsing */

const NUMERIC = /^[\d,]+(\.\d+)?$/;
const MONTH_YEAR = /^(\d{2})-(\d{4})$/;

const MONTH_NAMES = [
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

/** A comma-grouped volume, or null for `"NO RPT"` and anything else unparseable. */
function toVolume(value: unknown): number | null {
  if (typeof value !== "string" || !NUMERIC.test(value)) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** `"01-1998"` → `"Jan 1998"`. `"00-0000"` and anything malformed → null. */
function toMonthYear(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = MONTH_YEAR.exec(value);
  if (!match) return null;
  const month = MONTH_NAMES[Number(match[1]) - 1];
  return month ? `${month} ${match[2]}` : null;
}

/** A real status, or null for the literal `"Null"` the API sends for unknown. */
function toStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "Null" ? null : trimmed;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* ---------------------------------------------------------------- requests */

/**
 * The caller's signal, with a timeout of our own folded in, so a hung host cannot
 * leave a table spinning forever. `AbortSignal.any` is guarded because losing the
 * timeout is survivable; losing the caller's cancellation is not.
 */
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
 * The two reads here no longer share a host: `/leases` is public and goes straight
 * to the operator API, while `/wells` is account-only and has to pass through
 * `app/api/operators/wells/` so a server can decide who is asking. Deriving the
 * host from the path shape keeps that to one rule rather than a second `post`.
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

/** `total_count` when the API sends one, else the row count we actually received. */
function totalOf(payload: unknown, fallback: number): number {
  const value = (payload as { total_count?: unknown }).total_count;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function fetchOperatorLeases(
  {
    operatorNumber,
    search,
    county,
    page,
  }: {
    operatorNumber: string;
    /** Matches lease name OR lease number upstream. Empty means unfiltered. */
    search: string;
    /** A county name as the API spells it, or empty for all. */
    county: string;
    page: number;
  },
  signal?: AbortSignal,
): Promise<PagedResult<LeaseRecord>> {
  const payload = await post(
    "/api/v1/operators/leases",
    {
      operator_no: operatorNumber,
      page,
      pagesize: LEASE_PAGE_SIZE,
      lease_number: search,
      county,
      /* NO `status` (requested). It was pinned to "Active", which filtered the table
         down to 4,542 of Diamondback's leases while the panel above it reported 5,596
         Leases on Record — the same page disagreeing with itself. Omitting the key
         returns the whole lease book, which is the figure the rest of the page uses.
         The Status COLUMN is unaffected: it reads `status` off each row of the
         response, so every lease still shows its own. */
      member_id: TEMP_MEMBER_ID,
    },
    signal,
  );

  const raw = (payload as { operator_leases?: unknown }).operator_leases;
  const list = Array.isArray(raw) ? raw : [];

  const rows: LeaseRecord[] = list.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      leaseNumber: toText(record.lease_number),
      leaseName: toText(record.lease_name),
      county: toText(record.county),
      districtCode: toText(record.district_code),
      status: toStatus(record.status),
      oil: toVolume(record.Total_Production_Oil),
      gas: toVolume(record.Total_Production_Gas),
    };
  });

  return { rows, total: totalOf(payload, rows.length) };
}

/**
 * Wells, filtered.
 *
 * The endpoint takes `county`, `well_number`, `status` and `district_code` alongside
 * `lease_number`. Every one is sent, empty when unused, because the API treats an
 * absent key and an empty one alike and a payload that always has the same shape is
 * easier to reason about than one that grows keys conditionally. The drilldown fills
 * in `lease_number` — the number of whichever lease row was clicked — and leaves the
 * rest empty.
 */
export async function fetchLeaseWells(
  {
    operatorNumber,
    leaseNumber,
    county = "",
    wellNumber = "",
    status = "",
    districtCode = "",
    page,
  }: {
    operatorNumber: string;
    leaseNumber: string;
    county?: string;
    wellNumber?: string;
    status?: string;
    districtCode?: string;
    page: number;
  },
  signal?: AbortSignal,
): Promise<PagedResult<WellRecord>> {
  const payload = await post(
    /*
     * THROUGH THIS SITE'S OWN ORIGIN — see `app/api/operators/wells/route.ts`.
     * `/wells` is account-only upstream (every field comes back `*****` at
     * `member_id: 0`), and a browser cannot say who is asking, so the handler pins
     * the member id from the session cookie. `member_id` is therefore absent from
     * this body: it is not the client's to send.
     */
    "/api/operators/wells",
    {
      operator_number: operatorNumber,
      county,
      lease_number: leaseNumber,
      well_number: wellNumber,
      status,
      district_code: districtCode,
      page,
      pagesize: LEASE_PAGE_SIZE,
    },
    signal,
  );

  // The gate's answer, before anything is parsed: no rows were fetched, so there is
  // nothing to map and nothing to count.
  if ((payload as { locked?: unknown }).locked === true) {
    return { rows: [], total: 0, locked: true };
  }

  const raw = (payload as { operator_wells?: unknown }).operator_wells;
  const list = Array.isArray(raw) ? raw : [];

  const rows: WellRecord[] = list.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      apiNo: toText(record.api_no),
      wellNumber: toText(record.well_number),
      leaseName: toText(record.lease_name),
      status: toStatus(record.status),
      // `well_county` is the well's own county; `county` on the same row is the
      // lease's. They agree in every row sampled, but the well's is the truthful
      // one for a well table.
      county: toText(record.well_county) || toText(record.county),
      oil: toVolume(record.totalOilProduction),
      gas: toVolume(record.totalGasProduction),
      productionStart: toMonthYear(record.production_start_date),
    };
  });

  return { rows, total: totalOf(payload, rows.length) };
}
