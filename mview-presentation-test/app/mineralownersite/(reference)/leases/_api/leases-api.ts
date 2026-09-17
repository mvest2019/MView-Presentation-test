import { leaseSlug } from "../_lib/lease-routes";
import type { LeaseRecord } from "../_lib/lease-types";
import { monthNumber } from "../_lib/months";

/**
 * MY LEASES' ENTIRE API LAYER — every backend call the module makes, in one
 * file, in its own folder, exactly as the claim flow arranges `_api/claim-api.ts`
 * and the invite flow `_api/invite-api.ts`.
 *
 * ── IT CALLS `/api/leases/*` ON OUR OWN ORIGIN, NEVER THE BACKEND ──
 *
 * The service lives on `MINERALVIEW_API_BASE_URL`, which is server-only on
 * purpose, and every call needs a `member_id` this page must not be trusted to
 * choose. `app/api/leases/[endpoint]/route.ts` supplies both. What this module
 * knows is the same-origin path and the shape that comes back.
 *
 * ── WIRE SHAPES IN, VIEW SHAPES OUT ──
 *
 * The response is snake_case, carries both scopes of every figure, and is 523
 * months long. Each fetcher maps to a small camelCase view type here, so a
 * renamed field reaches ONE file — and so the components never learn a wire
 * shape they would then depend on.
 *
 * ONE PLAIN FUNCTION PER ENDPOINT, no generic client: `fetchLeaseFinancials`
 * knows what `financials` returns and says so in its return type. A wrapper
 * that took a path and gave back `unknown` would move that knowledge into every
 * call site.
 *
 * ── ERRORS ARRIVE IN ONE ENVELOPE AND LEAVE AS ONE ERROR TYPE ──
 *
 * The backend's own errors, the forwarder's not-signed-in, a dead network and a
 * response that is not the shape we expect all surface as `LeasesApiError` with
 * a `code` a panel can branch on and a `message` readable enough to show.
 */

/* ============================================================================
   ERRORS
   ============================================================================ */

export class LeasesApiError extends Error {
  /** The backend's error code — or a transport code of our own
   *  (`UNREACHABLE`, `BAD_SHAPE`). */
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "LeasesApiError";
    this.code = code;
    this.status = status;
  }
}

/** The one envelope every error uses. */
interface ErrorEnvelope {
  error?: { statusCode?: number; code?: string; message?: string };
}

/* ============================================================================
   THE VIEW SHAPES
   ============================================================================ */

/** One scope's three monthly streams, index-aligned with each other. */
export interface FinancialsStreams {
  /** MCF per month. */
  gas: number[];
  /** Barrels per month. */
  oil: number[];
  /** Dollars per month. */
  cash: number[];
}

/** One scope's three headline figures, in the units the tiles print. */
export interface FinancialsTotals {
  /** Dollars cleared on every month already filed. */
  cashFiled: number;
  /** MCF of gas on every month already filed. */
  gasFiled: number;
  /** Filed months plus the model, to the end of the curve. */
  cashProjection: number;
}

/**
 * `GET /api/v1/leases/financials`, as the panel reads it.
 *
 * BOTH SCOPES ARRIVE AS REAL ARRAYS rather than one set and a multiplier. The
 * fixture this replaced stored the owner's figures and divided by a single
 * blended decimal to get the lease's, which is an approximation the moment two
 * leases have different decimals — and the backend sends both, so there is
 * nothing to approximate. "Full lease" and "Your share" are now two answers
 * from the same response instead of one answer and a sum.
 */
export interface LeaseFinancials {
  /** Whole lease, before any decimal interest is applied. */
  lease: FinancialsStreams;
  /** The member's own share. */
  share: FinancialsStreams;
  totals: { lease: FinancialsTotals; share: FinancialsTotals };
  /** The month number index 0 maps to — see `months.ts`. */
  firstMonth: number;
  /** Index of the last month anybody has actually FILED. */
  lastPostedIndex: number;
  /** How many months the arrays hold, filed and modelled together. */
  length: number;
  /** `"June 2026"` — the long label of `lastPostedIndex`, the backend's own. */
  historyEndLabel: string;
  /** The production-weighted decimal across the record, 0–1. */
  blendedInterest: number;
  /** The roll owner these figures belong to. */
  owner: string;
  /** The backend's own sentence about what the volumes are net of. */
  note: string;
}

/* ============================================================================
   THE CALLS
   ============================================================================ */

/** 60s, matching the forwarder's own ceiling on the upstream call. */
const TIMEOUT_MS = 60_000;

/**
 * The whole filing history and the model past it, at both scopes.
 *
 * `signal` so an effect can cancel on unmount without the abort being reported
 * as an outage — see the re-throw below.
 */
export async function fetchLeaseFinancials(
  signal?: AbortSignal,
): Promise<LeaseFinancials> {
  const wire = await request<WireFinancials>(
    "/api/leases/financials",
    "your lease financials",
    signal,
  );
  return toFinancials(wire);
}

/**
 * EVERY LEASE ON THE RECORD, as the list and the plain-English list read them.
 *
 * ── IT PAGES, AND IT COLLECTS EVERY PAGE ──
 *
 * The list is paged and this member's record holds 782 leases, so one call is
 * never the answer. The first request reports `total_pages` and the rest follow
 * in bounded batches — see `PAGE_SIZE` for why that is 79 requests and not 8,
 * and `CONCURRENCY` for why they do not all go at once.
 *
 * WHY ALL OF THEM RATHER THAN THE FIRST PAGE. The table's sort, its search, its
 * five filter dropdowns and its own pagination are all client-side over the set
 * they are given — that is what `LeaseListPanel` is. Hand it the first 10 of 782
 * leases and every one of those controls quietly answers a different question
 * from the one it appears to: "All counties" would list the counties of the
 * first ten, and a search would miss a lease the reader knows they own. A wrong
 * answer delivered confidently is worse than a slow one.
 *
 * THE CAP IS A GUARD, NOT A PAGE SIZE. `MAX_PAGES` stops a record far larger
 * than any seen from opening hundreds of requests; when it bites, the list is
 * short and `total` says so, which is the honest half-answer. Moving sort and
 * filtering server-side is the real fix and is a change to the panel, not to
 * this call.
 */
export async function fetchLeaseList(
  signal?: AbortSignal,
): Promise<LeaseList> {
  const first = await request<WireLeaseList>(
    `/api/leases/leases?page=1&page_size=${PAGE_SIZE}`,
    "your leases",
    signal,
  );

  const totalPages = Math.min(
    Math.max(1, first.page_info?.total_pages ?? 1),
    MAX_PAGES,
  );

  /* THE REMAINING PAGES, A FEW AT A TIME. At `page_size` 10 a record of 782
     leases is 79 requests, and `Promise.all` over all of them would open 78 at
     once: the browser queues them six deep per origin anyway, but our forwarder
     does not — it would put 78 concurrent reads on the upstream service in one
     burst. `CONCURRENCY` keeps that to a steady handful. */
  const rest = await fetchPages(2, totalPages, signal);

  const wire = [first, ...rest].flatMap((page) =>
    Array.isArray(page.leases) ? page.leases : [],
  );

  return {
    leases: wire.map(toLeaseRecord),
    ownerName: first.owner_name ?? "",
    /** What the SERVICE says the record holds, whatever the cap let through. */
    total: first.page_info?.total ?? wire.length,
    rollYear: first.totals?.roll_year ?? null,
  };
}

/**
 * How many leases to ask for per request.
 *
 * TEN, WHICH IS THE SERVICE'S OWN DEFAULT — asked for (2026-09-17) after the
 * trade-off was put plainly: the service caps `page_size` at 100, and at 100
 * this member's 782 leases arrive in 8 requests against 79 at ten. The set that
 * ends up on screen is identical either way; the difference is how long the
 * list takes to fill. Raise this constant to trade back.
 */
const PAGE_SIZE = 10;
/**
 * 200 pages · 10 = 2,000 leases — the same ceiling as before the page size
 * changed, so the guard still bites at the same number of LEASES rather than at
 * the same number of requests. See the note on `fetchLeaseList`.
 */
const MAX_PAGES = 200;
/**
 * How many of those requests are in flight at once.
 *
 * The browser already queues same-origin requests about six deep, but our
 * forwarder is a server and does not: without this, 78 pages would land on the
 * upstream service simultaneously. Six keeps the pipe full without being a
 * burst, and it is what makes a ten-per-page read reasonable at all.
 */
const CONCURRENCY = 6;

/**
 * Pages `from`..`to` inclusive, at most `CONCURRENCY` in flight, in page order.
 *
 * ORDER IS PRESERVED because the list is rendered in the order the service
 * returns it — the default sort is the service's, and a set assembled out of
 * order would reshuffle on every load.
 */
async function fetchPages(
  from: number,
  to: number,
  signal?: AbortSignal,
): Promise<WireLeaseList[]> {
  const pages: WireLeaseList[] = [];
  for (let start = from; start <= to; start += CONCURRENCY) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENCY, to - start + 1) },
        (_, i) =>
          request<WireLeaseList>(
            `/api/leases/leases?page=${start + i}&page_size=${PAGE_SIZE}`,
            "your leases",
            signal,
          ),
      ),
    );
    pages.push(...batch);
  }
  return pages;
}

export interface LeaseList {
  leases: LeaseRecord[];
  /** The roll owner these leases belong to. */
  ownerName: string;
  /** How many leases the service says the record holds. */
  total: number;
  /** The appraisal year the county column is quoted from. */
  rollYear: number | null;
}

/* ============================================================================
   THE WIRE, AND THE MAPPING
   ============================================================================ */

interface WireLease {
  lease_id?: string;
  label?: string;
  lease_number?: string | null;
  county?: string;
  operator_name?: string;
  acres?: number;
  lease_status?: string;
  /** `"15.64276 (1564.276%)"` — the decimal, then the same thing as a percent. */
  interest_label?: string;
  owner_value?: number;
  appraised_value?: number;
  well_count?: number;
  well_types?: string[];
  reservoirs?: { name?: string }[];
  first_prod_label?: string;
  last_posted_label?: string;
  last_posted_gas?: number;
  gas_to_date?: number;
  oil_to_date?: number;
}

interface WireLeaseList {
  leases?: WireLease[];
  owner_name?: string;
  totals?: { roll_year?: number };
  page_info?: { total?: number; total_pages?: number };
}

/**
 * ONE WIRE LEASE INTO THE RECORD THE TABLE ALREADY PRINTS.
 *
 * `LeaseRecord` is unchanged apart from `types` — the eleven columns were built
 * against the design and the service happens to carry all of them, so the
 * mapping is a rename rather than a redesign.
 *
 * THREE FIELDS NEED MORE THAN A RENAME:
 *
 *   `slug` is BUILT, because the service identifies a lease by `lease_id`
 *   (`"08_46924"`) and this app's URLs are `<number>-<name>`. See `leaseSlug`.
 *
 *   `decimalInterest` is PARSED off `interest_label`, which carries the decimal
 *   and its percentage in one string. The leading number is the decimal the
 *   column formats; the parenthesis is the same value said again.
 *
 *   `reservoir` is the FIRST of `reservoirs`. The column is one name wide and
 *   every lease in the sampled pages carried exactly one; a lease with two
 *   would show the first, which is the column's existing behaviour for the
 *   fixture too.
 */
function toLeaseRecord(wire: WireLease): LeaseRecord {
  const name = wire.label ?? "";
  /* An empty string is not a lease number — the fixture's own rule for the two
     unnumbered units, and the column prints the name alone for them. */
  const number = wire.lease_number ? String(wire.lease_number) : null;

  return {
    number,
    slug: leaseSlug(number, name),
    name,
    status: wire.lease_status ?? "",
    acres: num(wire.acres),
    firstPosting: wire.first_prod_label ?? "",
    mvestimate: num(wire.owner_value),
    countyAppraised: num(wire.appraised_value),
    county: wire.county ?? "",
    operator: wire.operator_name ?? "",
    reservoir: wire.reservoirs?.[0]?.name ?? "",
    wells: num(wire.well_count),
    decimalInterest: parseInterest(wire.interest_label),
    types: Array.isArray(wire.well_types) ? wire.well_types : [],
    production: {
      gasMcf: num(wire.gas_to_date),
      oilBbl: num(wire.oil_to_date),
    },
    lastPosted: {
      month: wire.last_posted_label ?? "",
      gasMcf: num(wire.last_posted_gas),
    },
  };
}

/** `"15.64276 (1564.276%)"` → `15.64276`. Anything unreadable is 0. */
function parseInterest(label: string | undefined): number {
  if (!label) return 0;
  const parsed = Number.parseFloat(label);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface WireMonth {
  cycle: string;
  short: string;
  forecast: boolean;
  gas_gross: number;
  oil_gross: number;
  cash_gross: number;
  gas_share: number;
  oil_share: number;
  cash_share: number;
}

interface WireFinancials {
  months?: WireMonth[];
  /** Count of FILED months, i.e. the index of the first modelled one. */
  seam?: number;
  history_end_label?: string;
  note?: string;
  owner?: string;
  totals?: {
    gas_gross?: number;
    cash_gross?: number;
    filed_gas_gross?: number;
    filed_cash_gross?: number;
    gas_share?: number;
    cash_share?: number;
    filed_gas_share?: number;
    filed_cash_share?: number;
    blended_interest?: number;
  };
}

/** A missing number is 0, not `NaN` — one absent field must not blank a chart. */
function num(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toFinancials(wire: WireFinancials): LeaseFinancials {
  const months = Array.isArray(wire.months) ? wire.months : [];
  if (months.length === 0) {
    throw new LeasesApiError(
      "BAD_SHAPE",
      200,
      "The leases service returned no months.",
    );
  }

  const lease: FinancialsStreams = { gas: [], oil: [], cash: [] };
  const share: FinancialsStreams = { gas: [], oil: [], cash: [] };
  for (const month of months) {
    lease.gas.push(num(month.gas_gross));
    lease.oil.push(num(month.oil_gross));
    lease.cash.push(num(month.cash_gross));
    share.gas.push(num(month.gas_share));
    share.oil.push(num(month.oil_share));
    share.cash.push(num(month.cash_share));
  }

  /*
   * `seam` IS A COUNT AND `lastPostedIndex` IS AN INDEX, so one is subtracted.
   * Verified against the dev response on 2026-09-17: `seam` was 402,
   * `months[401]` was `forecast: false` and `months[402]` the first
   * `forecast: true`.
   *
   * FALLING BACK TO THE FLAGS RATHER THAN TO A CONSTANT. If `seam` is missing
   * or out of range, the first `forecast: true` month says the same thing, and
   * a record with nothing modelled leaves every month filed. A hard-coded guess
   * here would draw the solid/dashed join in the wrong place, which is the one
   * thing on this chart a reader cannot check for themselves.
   */
  const seam =
    typeof wire.seam === "number" && wire.seam > 0 && wire.seam <= months.length
      ? wire.seam
      : (() => {
          const first = months.findIndex((month) => month.forecast);
          return first === -1 ? months.length : first;
        })();
  const lastPostedIndex = Math.max(0, seam - 1);

  const totals = wire.totals ?? {};

  return {
    lease,
    share,
    totals: {
      lease: {
        cashFiled: num(totals.filed_cash_gross),
        gasFiled: num(totals.filed_gas_gross),
        cashProjection: num(totals.cash_gross),
      },
      share: {
        cashFiled: num(totals.filed_cash_share),
        gasFiled: num(totals.filed_gas_share),
        cashProjection: num(totals.cash_share),
      },
    },
    /* From the first month's own label, so the axis cannot drift from the data
       even if the record ever starts somewhere other than 1993. */
    firstMonth: monthNumber(months[0].short),
    lastPostedIndex,
    length: months.length,
    /* The backend's label is preferred over one derived here: it is the same
       string the rest of its responses print, and a month formatted twice in
       two places is how "June 2026" and "Jun 2026" end up on one screen. */
    historyEndLabel:
      wire.history_end_label || months[lastPostedIndex]?.short || "",
    blendedInterest: num(totals.blended_interest),
    owner: wire.owner ?? "",
    note: wire.note ?? "",
  };
}

/* ============================================================================
   TRANSPORT
   ============================================================================ */

async function request<T>(
  url: string,
  what: string,
  signal?: AbortSignal,
): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    });
  } catch (cause) {
    /* A caller's own abort must not be reported as an outage — it re-throws so
       the effect that cancelled can recognise its own signal. */
    if (signal?.aborted) throw cause;
    throw new LeasesApiError(
      "UNREACHABLE",
      0,
      `Could not load ${what}. Check your connection and try again.`,
    );
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const envelope = (body ?? {}) as ErrorEnvelope;
    throw new LeasesApiError(
      envelope.error?.code ?? "HTTP_ERROR",
      res.status,
      envelope.error?.message ?? `Could not load ${what}.`,
    );
  }

  if (body === null || typeof body !== "object") {
    throw new LeasesApiError(
      "BAD_SHAPE",
      res.status,
      `The leases service sent back something unreadable for ${what}.`,
    );
  }

  return body as T;
}
