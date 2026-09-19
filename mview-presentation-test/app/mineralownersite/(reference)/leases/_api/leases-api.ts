import { leaseRouteSlug } from "../_lib/lease-routes";
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
 * FOUR MINUTES, FOR THE LEASE REPORT ALONE.
 *
 * Every other call here answers in seconds. This one assembles a lease's whole
 * filing history and the model past it, and on a lease the service has nothing
 * built for that has been measured at OVER TWO MINUTES — after which it is
 * sub-second until the cache goes cold again.
 *
 * At the shared 60s ceiling the read was cut off mid-flight and the page said
 * "could not load this lease report. Check your connection" — which is a lie
 * about the reader's connection and about the service, and it invites a retry
 * that gets cut off in exactly the same place. A long wait with a card that
 * says it may be a long wait is the honest version.
 */
const REPORT_TIMEOUT_MS = 240_000;

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
export async function fetchLeaseList(signal?: AbortSignal): Promise<LeaseList> {
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

  const t = first.totals ?? {};

  return {
    leases: wire.map(toLeaseRecord),
    ownerName: first.owner_name ?? "",
    /** What the SERVICE says the record holds, whatever the cap let through. */
    total: first.page_info?.total ?? wire.length,
    /* OFF THE FIRST PAGE, because `totals` describes the whole record and every
       page carries the same copy of it — see `LeaseTotals`. */
    totals: {
      leaseCount: num(t.lease_count),
      wellCount: num(t.well_count),
      reservoirCount: num(t.reservoir_count),
      counties: num(t.counties),
      operators: num(t.operators),
      deviatedCount: num(t.deviated_count),
      gasToDate: num(t.gas_to_date),
      ownerValue: num(t.owner_value),
      appraisedValue: num(t.appraised_value),
      /* NOT `num()`: 0 is not a year, and the caption drops the phrase rather
         than printing "0 roll". */
      rollYear:
        typeof t.roll_year === "number" && t.roll_year > 0 ? t.roll_year : null,
      rosterNote: t.roster_note ?? "",
    },
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
      Array.from({ length: Math.min(CONCURRENCY, to - start + 1) }, (_, i) =>
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
  /** The record's own headline figures — see `LeaseTotals`. */
  totals: LeaseTotals;
}

/**
 * THE WHOLE RECORD'S FIGURES, which are NOT the sum of the leases on screen.
 *
 * Every one of these comes from the service's `totals` block rather than being
 * added up here, and that distinction is the point: `totals` describes the
 * entire record — all 782 leases — while the list this page holds is whatever
 * the paging and the filters left in it. Summing the rows would quietly change
 * the headline every time a reader typed in the search box.
 *
 * `rollYear` is nullable because the county column's caption names it ("all 4
 * interests, 2025 roll") and a caption that says "undefined roll" is worse than
 * one that omits the year.
 */
export interface LeaseTotals {
  /** How many leases are on the record. */
  leaseCount: number;
  wellCount: number;
  reservoirCount: number;
  counties: number;
  operators: number;
  /** Wells drilled sideways — the "2 drilled sideways" caption. */
  deviatedCount: number;
  /** MCF filed to date, gross, across every lease. */
  gasToDate: number;
  /** The owner's share of the model's valuation, in dollars. */
  ownerValue: number;
  /** The county's appraised value for the same interests, in dollars. */
  appraisedValue: number;
  /** The appraisal year the county figure is quoted from. */
  rollYear: number | null;
  /** The service's own sentence about the roster count, when it sends one. */
  rosterNote: string;
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
  totals?: {
    lease_count?: number;
    well_count?: number;
    reservoir_count?: number;
    counties?: number;
    operators?: number;
    deviated_count?: number;
    gas_to_date?: number;
    owner_value?: number;
    appraised_value?: number;
    roll_year?: number;
    roster_note?: string;
  };
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
 *   `slug` is CHOSEN, because a lease the service identifies by `lease_id`
 *   (`"08_46924"`) opens on that id, while a lease with only a number opens on
 *   `<number>-<name>`. See `leaseRouteSlug`.
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
    id: wire.lease_id,
    number,
    /* THE SLUG IS THE ID WHEN THERE IS ONE — `08_46924`. The number alone
       cannot address a lease on the service (see `LeaseRecord.id`), and a row
       whose URL cannot name what it opened is a row that opens somebody else's
       lease. */
    slug: leaseRouteSlug(wire.lease_id, number, name),
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
   * ── WHERE HISTORY ENDS, DECIDED ONCE ──
   *
   * The response says it three ways and they do not always agree:
   *
   *   `history_end_label`  "May 2026" — the month the backend prints
   *   `seam`               a COUNT of filed months, so `seam - 1` is an index
   *   `forecast`           a flag on every month
   *
   * THEY DISAGREED BY ONE ON A REAL RECORD (seen 2026-09-17): the label said
   * May 2026 while `seam` made June 2026 the last filed month. Binding them
   * independently — the label to the captions, `seam` to the chart — made the
   * page contradict itself: the tile read "through May 2026" and the basis line
   * "solid to May 2026" while the solid line ran a month further and the table
   * window started a month late. The extra month was also the one that dragged
   * the curve to zero at the join, because it is a month the operators have not
   * filed yet.
   *
   * SO THE LABEL GOVERNS, and the index is resolved FROM it. It is the
   * backend's own statement of where the history it is willing to stand behind
   * ends, it is what every caption on the page prints, and a chart that
   * disagrees with its own caption is worse than one that stops a month early.
   *
   * THE OTHER TWO ARE FALLBACKS, in order of how much they know: the `forecast`
   * flags, which are per-month, then `seam`. A record with nothing modelled
   * leaves every month filed. Nothing here is ever a hard-coded guess — the
   * solid/dashed join is the one thing on this chart a reader cannot check for
   * themselves.
   */
  const fromLabel = wire.history_end_label
    ? months.findIndex((month) => month.short === wire.history_end_label)
    : -1;

  const fromFlags = (() => {
    const first = months.findIndex((month) => month.forecast);
    return first === -1 ? months.length - 1 : first - 1;
  })();

  const fromSeam =
    typeof wire.seam === "number" && wire.seam > 0 && wire.seam <= months.length
      ? wire.seam - 1
      : -1;

  const lastPostedIndex = Math.max(
    0,
    fromLabel >= 0 ? fromLabel : fromFlags >= 0 ? fromFlags : fromSeam,
  );

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
    /* READ OFF THE MONTH THE LINE ACTUALLY ENDS ON. It is the backend's own
       string either way — `months[].short` is the same vocabulary as
       `history_end_label` — but taking it from the resolved index is what
       guarantees the caption names the month the chart stops at, whichever of
       the three sources above won. */
    historyEndLabel: months[lastPostedIndex]?.short ?? "",
    blendedInterest: num(totals.blended_interest),
    owner: wire.owner ?? "",
    note: wire.note ?? "",
  };
}

/* ============================================================================
   THE JUMP LIST
   ============================================================================ */

/** One lease as the report header's "jump to a lease" list prints it. */
export interface LeasePickerEntry {
  /**
   * The service's own identifier — `08_46924`. It is NOT a URL segment: the
   * module's routes are `46924-howard-glasscock-east-unit`, built by
   * `leaseSlug`. Kept because it is the only stable key on a row (two leases
   * can share a name, and an unnumbered unit has no number to key on) and
   * because it is what the lease-report call will want when that is wired.
   */
  id: string;
  name: string;
  /** Null for a unit filed without one, the same rule as `LeaseRecord`. */
  number: string | null;
  county: string;
  /** The owner's share of this lease, dollars. */
  value: number;
}

export interface LeasePickerList {
  /** Whose record it is — "Apache Corporation". */
  owner: string;
  /** How many leases the record holds: the "of 782" in "Lease 3 of 782". */
  total: number;
  leases: LeasePickerEntry[];
}

interface WirePickerEntry {
  lease_id?: string;
  lease_name?: string;
  lease_number?: string | number | null;
  county?: string;
  owner_value?: number;
}

interface WirePicker {
  owner?: string;
  total?: number;
  picker?: WirePickerEntry[];
}

/**
 * EVERY LEASE ON THE RECORD, AS A LIST OF NAMES — what the report header's
 * dropdown drops and what its "Lease n of m" counts.
 *
 * ── ONE CALL, NO PAGING ──
 *
 * Unlike `/leases`, this endpoint is not paged: the whole record comes back in
 * one body, `total` agreeing with the array's length (782 leases, 97KB, checked
 * against the dev service). So there is no `fetchPages` here and no cap — the
 * service decides how much a record is, not this function.
 *
 * ── IT IS A SEPARATE CALL FROM `fetchLeaseList` ON PURPOSE ──
 *
 * The two answer the same question at different weights. The list carries
 * eighteen fields per lease because the table sorts and filters on them, and it
 * costs 79 requests to assemble. The dropdown needs five fields and needs them
 * before a reader has finished reading the heading. Opening a header dropdown
 * should not pay for a table that is not on the page.
 *
 * `total` IS TAKEN FROM THE SERVICE, NOT FROM THE ARRAY. They agree today; if
 * the endpoint ever starts truncating, a count that silently followed the array
 * would report the truncation as the size of the record. The array falls back
 * to its own length only when `total` is missing altogether.
 */
export async function fetchLeasePicker(
  signal?: AbortSignal,
): Promise<LeasePickerList> {
  const wire = await request<WirePicker>(
    "/api/leases/picker",
    "your leases",
    signal,
  );

  const leases = (Array.isArray(wire.picker) ? wire.picker : []).map(
    (entry): LeasePickerEntry => ({
      id: entry.lease_id ?? "",
      name: entry.lease_name ?? "",
      /* An empty string is not a lease number — the fixture's own rule for its
         two unnumbered units, and the row prints the name alone for them. */
      number: entry.lease_number ? String(entry.lease_number) : null,
      county: entry.county ?? "",
      value: num(entry.owner_value),
    }),
  );

  return {
    owner: wire.owner ?? "",
    total: typeof wire.total === "number" ? wire.total : leases.length,
    leases,
  };
}

/* ============================================================================
   ONE LEASE'S REPORT
   ============================================================================ */

/** One month on the lease's filed-and-modelled series. */
export interface WireReportMonth {
  short?: string;
  label?: string;
  gas_share?: number;
  oil_share?: number;
  cash_share?: number;
  /** The same three at the whole lease, for the panel's "lease" scope. */
  gas_net?: number;
  oil_net?: number;
  cash_gross?: number;
  forecast?: boolean;
}

/** One month of the twelve the model puts ahead of the last filing. */
export interface WireReportAhead {
  label?: string;
  gas?: number;
  oil?: number;
  cash?: number;
  low?: number;
  high?: number;
}

/** A running total, filed against modelled, for the cumulative curve. */
export interface WireReportCumulative {
  short?: string;
  filed_gas?: number;
  proj_gas?: number;
  forecast?: boolean;
}

/**
 * THE LEASE REPORT AS THE SERVICE SENDS IT.
 *
 * Only the fields the report actually prints are declared, and every one is
 * optional: this is a 163KB document assembled from several records, any of
 * which can be thin for a given lease, and a required field here would turn a
 * missing ratio into a page that does not render. `degraded_sources` is the
 * service saying so itself.
 */
export interface WireLeaseReport {
  owner?: string;
  history_end_label?: string;
  lease?: {
    lease_id?: string;
    lease_name?: string;
    label?: string;
    lease_number?: string | null;
    county?: string;
    operator_name?: string;
    acres?: number;
    lease_status?: string;
    interest?: number;
    interest_label?: string;
    owner_value?: number;
    owner_value_low?: number;
    owner_value_high?: number;
    gross_value?: number;
    appraised_value?: number;
    next_month_label?: string;
    next_month_low?: number;
    next_month_high?: number;
    quarter_low?: number;
    quarter_high?: number;
    reservoirs?: { name?: string }[];
    well_count?: number;
    producing_wells?: number;
    well_types?: string[];
    first_prod_label?: string;
    last_posted_label?: string;
    last_posted_gas?: number;
    months_posted?: number;
    gas_to_date?: number;
    oil_to_date?: number;
    gas_to_date_share?: number;
    oil_to_date_share?: number;
    reserves_gas_share?: number;
    reserves_oil_share?: number;
    months?: WireReportMonth[];
    seam?: number;
    year?: {
      from_label?: string;
      to_label?: string;
      gas_avg_d?: number;
      gas_lo_d?: number;
      gas_hi_d?: number;
      oil_avg_d?: number;
      oil_lo_d?: number;
      oil_hi_d?: number;
      peak_label?: string;
      trough_label?: string;
      rev_hi_label?: string;
      rev_hi?: number;
      rev_lo_label?: string;
      rev_lo?: number;
      yield_bbl_per_mmcf?: number | null;
      decline_pct?: number | null;
      gas_total?: number;
      oil_total?: number;
      cash_total?: number;
    };
    ratios?: {
      season?: { month?: string; pct?: number; percent?: number }[];
      per_acre_share?: number;
      realised_gas?: number | null;
      realised_oil?: number | null;
      half_label?: string | null;
      half_months?: number | null;
      lag_months?: number;
      acres_per_well?: number;
      oil_share_pct?: number;
    };
    price_test?: { at_deck?: number; down20?: number; up20?: number };
    cumulative?: WireReportCumulative[];
    /**
     * What the model wanted against what the state filed, for the last posted
     * month. AT THE OWNER'S SHARE in `posted`/`expected`, and at the whole
     * lease in the `_gross` pair.
     *
     * THERE IS NO PERCENTAGE HERE. The miss is the ratio of the two, worked out
     * where it is printed — see `modelMissPercent`.
     */
    vs_model?: {
      short?: string;
      posted?: number;
      expected?: number;
      posted_gross?: number;
      expected_gross?: number;
    }[];
    vs_model_note?: string;
    standing?: {
      rank_value?: number;
      of?: number;
      share_value_pct?: number;
      rank_gas?: number;
      share_gas_pct?: number;
      rank_month?: number;
      share_month_pct?: number;
    };
    ahead?: WireReportAhead[];
  };
}

/**
 * ONE LEASE'S WHOLE REPORT — the figures, the series, the twelve months ahead,
 * the ratios and where it stands on the record. 163KB on a long-lived lease.
 *
 * `id` IS THE SERVICE'S KEY, `02_269507`, which is also the lease's whole URL
 * segment — see `leaseRouteSlug`. The report page reads it straight back off
 * the route.
 *
 * ── IT IS CALLED FROM THE BROWSER, DELIBERATELY ──
 *
 * This read was on the server for a while, which made the page arrive complete
 * but put the one call the module exists for outside DevTools entirely: the
 * Network tab showed a 265KB document and no lease request at all, so there was
 * no way to see its status, its size or its timing without reading a terminal.
 * A call you cannot watch is a call you cannot debug. It goes through the
 * forwarder like every other call here, so `member_id` still comes off the
 * session cookie and never off the page.
 *
 * ── THE FIRST READ OF A COLD LEASE IS SLOW ──
 *
 * Over two minutes when the service has nothing built for it, and under a
 * second on every read after — which is the other half of the argument for
 * fetching it here: a reader watches a loading state rather than a blank tab.
 *
 * A LEASE NOT ON THE RECORD COMES BACK 404 `LEASES_LEASE_NOT_HELD`, which the
 * caller turns into `notFound()` rather than an error card: the service is
 * answering correctly, and "could not load" would invite a retry that can never
 * succeed.
 */
export async function fetchLeaseReport(
  id: string,
  signal?: AbortSignal,
): Promise<WireLeaseReport> {
  return request<WireLeaseReport>(
    `/api/leases/lease?id=${encodeURIComponent(id)}`,
    "this lease report",
    signal,
    REPORT_TIMEOUT_MS,
  );
}

/* ============================================================================
   THE ROCK ONE LEASE PRODUCES FROM
   ============================================================================ */

/** One month on a reservoir's filed-and-modelled series. */
export interface WireReservoirMonth {
  label?: string;
  short?: string;
  /** Whole-reservoir volumes — a volume is a fact about the rock, not a share. */
  gas?: number;
  oil?: number;
  cash_gross?: number;
  /** The owner's own cash, which is the one figure that IS a share. */
  cash_share?: number;
  forecast?: boolean;
}

/** One well as the reservoir's table and map read it. */
export interface WireReservoirWell {
  api10?: string;
  well_number?: string;
  lease_id?: string;
  lease_label?: string;
  profile?: string | null;
  depth_ft?: number | null;
  perf_top_ft?: number | null;
  perf_bottom_ft?: number | null;
  gas_filed?: number;
  oil_filed?: number;
  cash_filed?: number;
  gas_projected?: number;
  share_pct?: number | null;
  active?: boolean;
  first_prod_label?: string | null;
}

/** The same well again, with where the hole actually is. */
export interface WireReservoirMapWell {
  api10?: string;
  well_number?: string;
  label?: string;
  /**
   * WHICH LEGEND SYMBOL THIS WELL IS — "Gas", "Plugged Oil", "Injection /
   * Disposal from Oil". It matches `description` on a row of
   * `GET /api/v1/map/legends`, which is how the map draws the same mark the
   * legend explains rather than a shape of its own invention.
   */
  icon?: string | null;
  profile?: string | null;
  lat?: number | null;
  lon?: number | null;
  bh_lat?: number | null;
  bh_lon?: number | null;
  deviated?: boolean;
  lateral_ft?: number | null;
  bearing_compass?: string | null;
  depth_ft?: number | null;
}

export interface WireReservoir {
  reservoir_key?: string;
  name?: string | null;
  basis?: string | null;
  basis_note?: string | null;
  lease_count?: number;
  well_count?: number;
  operators?: string[];
  gas_to_date?: number;
  oil_to_date?: number;
  gas_forecast?: number;
  oil_forecast?: number;
  cash_filed?: number;
  cash_projected?: number;
  first_cycle_label?: string | null;
  last_cycle_label?: string | null;
  depth_min?: number | null;
  depth_max?: number | null;
  depth_avg?: number | null;
  perf_top_ft?: number | null;
  perf_bottom_ft?: number | null;
  open_ft_total?: number | null;
  gas_per_open_ft?: number | null;
  yield_bbl_per_mmcf?: number | null;
  decline_pct?: number | null;
  depleted_pct?: number | null;
  peak_label?: string | null;
  peak_gas?: number | null;
  recent_avg_gas?: number | null;
  first_well_label?: string | null;
  last_well_label?: string | null;
  deviated_count?: number;
  avg_lateral_ft?: number | null;
  profiles?: { name?: string; wells?: number }[];
  share_of_portfolio_gas?: number;
  /** `seam` is the COUNT of filed months, so the last of them is `seam - 1`. */
  seam?: number;
  series?: WireReservoirMonth[];
  wells?: WireReservoirWell[];
  insights?: string[];
  stats?: { label?: string; value?: string; sub?: string }[];
  map?: {
    wells?: WireReservoirMapWell[];
    deviated_count?: number;
    note?: string | null;
  };
}

/**
 * `GET /leases/reservoirs`.
 *
 * THERE IS NO LEASE BLOCK ON THIS PAYLOAD, and this type used to declare one.
 * The service sends the lease's IDENTIFIERS — `lease_id`, `lease_number`,
 * `district_code` — and nothing else about the lease: no county, no operator,
 * no acreage, no interest. Everything else it sends is about the ROCK.
 *
 * That is a reasonable thing for a reservoir endpoint to do. The cost was that
 * the tab guarded on `wire.lease` before rendering, so it read every successful
 * response as "no named reservoir on this lease" and the tab never drew for any
 * lease at all. The lease record now comes from the lease report, which is
 * already in hand on the page that renders this tab.
 */
export interface WireReservoirs {
  /** The owner the report was built for. */
  owner?: string;
  lease_id?: string;
  lease_number?: string | number | null;
  district_code?: string | null;
  /** When the service built this, for the freshness line. */
  built_at?: string;
  reservoirs?: WireReservoir[];
}

/**
 * THE RESERVOIR REPORT — one lease's rock, its wells and its monthly series.
 *
 * ── `reservoir_key` NARROWS IT, AND IS WORTH PASSING ──
 *
 * Omitted, the service returns every reservoir the lease produces from. Passed,
 * it returns the one — a third of the bytes on a three-reservoir lease. The key
 * is the reservoir's own name as the service spells it (`TREND AREA`,
 * `GLORIETA`), matched without regard to case, and `__unknown` where the
 * filings name no reservoir at all.
 *
 * THE TAB PASSES THE KEY IT WAS GIVEN AND FALLS BACK TO THE FIRST RESERVOIR
 * RETURNED. A lease whose reservoir the lease report could not name — its own
 * `reservoirs[0].name` is null on some leases — would otherwise have no key to
 * ask with, and asking for everything is a correct answer to "which rock is
 * this", where guessing a key is not.
 *
 * ── THE SERIES CAN BE EMPTY, AND THAT IS AN ANSWER ──
 *
 * `series` and `months` come back `[]` with `seam: -1` whenever the reservoir
 * is a roster-column guess rather than an allocated one — `CONSOLIDATED` on
 * `08_46924` has 138 wells, real depths, and not one allocated month. The rock
 * is real; its production is not attributed. A chart drawn from that is a chart
 * of nothing, so the card says so instead.
 */
export async function fetchLeaseReservoirs(
  id: string,
  reservoirKey?: string | null,
  signal?: AbortSignal,
): Promise<WireReservoirs> {
  const params = new URLSearchParams({ id });
  if (reservoirKey) params.set("reservoir_key", reservoirKey);

  return request<WireReservoirs>(
    `/api/leases/reservoirs?${params}`,
    "this reservoir report",
    signal,
    REPORT_TIMEOUT_MS,
  );
}

/* ============================================================================
   WHERE ONE LEASE'S WELLS ARE
   ============================================================================ */

/** What the lease's own ground summary counts. */
export interface WireLeaseGround {
  acres?: number;
  wells?: number;
  surface_holes?: number;
  bottom_holes?: number;
  paths_measured?: number;
  paths_estimated?: number;
  neighbours?: number;
  outline_note?: string | null;
}

/** Wells within a radius of this lease's own wells. */
export interface WireNeighbourBand {
  /** Miles — 1, 3 or 5. */
  band?: number;
  wells?: number;
  operators?: number;
  producing?: number;
  nearest_mi?: number | null;
}

export interface WireLeaseMap {
  owner?: string;
  lease_id?: string;
  map?: {
    wells?: WireReservoirMapWell[];
    deviated_count?: number;
    note?: string | null;
  };
  ground?: WireLeaseGround;
  neighbour_bands?: WireNeighbourBand[];
  neighbour_note?: string | null;
}

/**
 * WHERE THIS LEASE'S WELLS SIT ON THE GROUND.
 *
 * ── A SEPARATE CALL FROM THE LEASE REPORT, AND ONLY THE LEASE TAB MAKES IT ──
 *
 * The report payload carries the figures; this carries the geometry — 138 holes
 * with their surface and bottom coordinates, the survey grade behind each path,
 * and the neighbour counts the ring pills show. It is 112KB on this lease and
 * nothing above the map needs it, so it is fetched by the lease tab alone. A
 * reader on the reservoir or well tab never pays for it.
 *
 * ── THE WELLS ARE THE SAME SHAPE THE RESERVOIR MAP USES ──
 *
 * `WireReservoirMapWell`, deliberately: both endpoints describe a hole the same
 * way, and one type means one mapping and one chance to get the `[lon, lat]`
 * order right. What this one does NOT carry is where each well is perforated —
 * that is the reservoir's question, and the reservoir call answers it.
 */
export async function fetchLeaseMap(
  id: string,
  signal?: AbortSignal,
): Promise<WireLeaseMap> {
  return request<WireLeaseMap>(
    `/api/leases/lease-map?id=${encodeURIComponent(id)}`,
    "where these wells are",
    signal,
    REPORT_TIMEOUT_MS,
  );
}

/* ============================================================================
   THE TWELVE-PAGE MONTHLY REPORT
   ============================================================================ */

/** One month in the picker. `filed` says whether it was ever posted. */
export interface WireMonthOption {
  cycle?: string;
  label?: string;
  filed?: boolean;
}

/** A pre-formatted tile. `value` and `sub` are rendered verbatim. */
export interface WireMonthlyStat {
  label?: string;
  value?: string;
  sub?: string;
  tone?: "up" | "down" | "warn";
}

/** One month on the revenue band. */
export interface WireMonthlyRevenue {
  cycle?: string;
  label?: string;
  gas_cash?: number;
  oil_cash?: number;
  /** Where the filed record ends — see the note on the revenue page. */
  forecast?: boolean;
}

/** One lease as the month itself reports it — page 5. */
export interface WireMonthlyRow {
  lease_id?: string;
  label?: string;
  county?: string;
  operator_name?: string;
  /** A STRING here; `lease_analysis[].reservoirs` is an ARRAY. */
  reservoir?: string;
  interest_label?: string;
  gas_gross?: number;
  oil_gross?: number;
  gas_share?: number;
  oil_share?: number;
  cash_share?: number;
  /** Null where either month is absent — a lease that has not filed has not
   *  fallen 100%. */
  change_pct?: number | null;
  reported?: boolean;
  wells?: number;
}

/** The lease's own shape and its trailing twelve filed months — page 4. */
export interface WireMonthlyAnalysis {
  lease_id?: string;
  label?: string;
  county?: string;
  operator_name?: string;
  reservoirs?: string[];
  acres?: number;
  wells?: number;
  well_note?: string;
  completion_span?: string;
  past_operators?: string[];
  interest_label?: string;
  lease_cash?: number;
  owner_cash?: number;
  month_gas?: number;
  month_oil?: number;
  month_gas_d?: number;
  month_oil_d?: number;
  reported?: boolean;
  year?: {
    months?: number;
    gas_avg_d?: number;
    gas_lo_d?: number;
    gas_hi_d?: number;
    oil_avg_d?: number;
    oil_lo_d?: number;
    oil_hi_d?: number;
    peak_label?: string;
    peak_gas_d?: number;
    trough_label?: string;
    trough_gas_d?: number;
    rev_hi_label?: string;
    rev_hi?: number;
    rev_lo_label?: string;
    rev_lo?: number;
    gas_share_pct?: number;
  };
}

export interface WireMonthly {
  owner?: string;
  label?: string;
  cycle?: string;
  prev_label?: string;
  filed?: boolean;
  built_at?: string;

  totals?: {
    leases?: number;
    reporting?: number;
    gas_gross?: number;
    oil_gross?: number;
    gas_share?: number;
    oil_share?: number;
    cash_share?: number;
  };

  available?: WireMonthOption[];
  pages?: { no?: number; title?: string; lead?: string }[];

  /* page 1 */
  summary?: { heading?: string; bullets?: string[] }[];
  /** Null where the model carries nothing twelve months back. */
  vs_year_ago_pct?: number | null;
  year_ago_label?: string;
  top_lease?: {
    lease_id?: string;
    label?: string;
    share_pct?: number;
    gas_pct?: number;
  };

  /* page 2 */
  stats?: WireMonthlyStat[];
  insights?: string[];
  note?: string;

  /* page 3 */
  revenue?: WireMonthlyRevenue[];
  revenue_note?: string;

  /* pages 4 and 5 — one row per lease each, joined on `lease_id` */
  lease_analysis?: WireMonthlyAnalysis[];
  rows?: WireMonthlyRow[];

  /* page 6 */
  outlook?: {
    months?: number;
    from_label?: string;
    to_label?: string;
    gas_start_d?: number;
    gas_end_d?: number;
    gas_change_pct?: number | null;
    oil_start_d?: number;
    oil_end_d?: number;
    oil_change_pct?: number | null;
    cash_start?: number;
    cash_end?: number;
    cash_change_pct?: number | null;
    oil_share_pct?: number;
    gas_share_pct?: number;
    bullets?: string[];
    note?: string;
  };

  /* page 7 */
  development?: {
    probability?: number;
    /** Ordered BEST first; the chip prints worst first. */
    probability_label?: string;
    verdict?: string;
    rings?: {
      radius_mi?: number;
      permits?: number;
      /** The "LEASES" column binds to this — the names differ. */
      neighbours?: number;
      operators?: number;
      producing?: number;
    }[];
    bullets?: string[];
    /** How the ring counts were reached — counted once each across the whole
     *  portfolio rather than once per lease. */
    note?: string;
  };

  /* page 8 */
  operators?: {
    name?: string;
    number?: string | number;
    leases?: number;
    lease_names?: string[];
    counties?: string[];
    tenure_label?: string;
    first_label?: string;
    cum_gas?: number;
    cum_oil?: number;
    owner_value?: number;
    share_pct?: number;
    overview?: string;
    insight?: string;
    month_gas?: number;
    month_oil?: number;
    wells?: number;
  }[];

  /* page 10 */
  commodities?: {
    label?: string;
    unit?: string;
    /** Pre-formatted to the contract's own decimals — do not re-round. */
    display?: string;
    change_pct?: number;
    as_of?: string;
    desc?: string;
    means?: string;
  }[];
  commodity_note?: string;

  /* page 11 */
  news?: {
    operator?: string;
    mine?: boolean;
    title?: string;
    body?: string;
    when?: string;
  }[];
  news_note?: string;

  /* page 12 */
  years?: {
    year?: string | number;
    gas_share?: number;
    oil_share?: number;
    cash_share?: number;
    months?: number;
    filed_months?: number;
    whole?: boolean;
  }[];
  method?: { no?: number; title?: string; text?: string }[];
  disclaimer?: string[];
}

/**
 * THE WHOLE MONTHLY REPORT — all twelve pages, one read.
 *
 * ── ONE CALL, AND IT IS A BIG ONE ──
 *
 * A megabyte raw on a 782-lease record, 111KB on the wire after brotli, and
 * 94% of it is the two per-lease arrays. It scales with how many leases the
 * owner holds, not with the report: a ten-lease owner is a few KB.
 *
 * ── DO NOT FIRE IT BESIDE THE OTHER `/leases` READS ON A COLD CACHE ──
 *
 * They share one cached record per owner, and each cold request starts its own
 * build — so two in flight together is the build done twice, not once shared.
 * A cold read is 100 seconds and more; every read after it is sub-second. This
 * is why the tab fetches on OPEN rather than with the page.
 *
 * ── `month` IS `YYYYMM`, AND A MONTH NEVER FILED IS A 404 ──
 *
 * Omitted, the service picks the newest month actually filed. Asked for a month
 * that was never filed, it answers 404 `LEASES_MONTH_NOT_FILED` and names the
 * months that were, so the picker can correct itself. That is deliberately not
 * a page of zeroes, which reads as a portfolio that stopped.
 *
 * THE UPSTREAM QUERY IS STRICT — an unknown parameter is a 400 rather than an
 * ignored field, which is why the forwarder's allowlist for this endpoint is
 * load-bearing rather than defensive.
 */
export async function fetchMonthlyReport(
  month?: string | null,
  signal?: AbortSignal,
): Promise<WireMonthly> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const query = params.toString();

  return request<WireMonthly>(
    `/api/leases/monthly${query ? `?${query}` : ""}`,
    "your monthly report",
    signal,
    REPORT_TIMEOUT_MS,
  );
}

/** Whether this deployment can send the report, and how. */
export interface MonthlyEmailState {
  /** `"smtp"` — how it would go out. */
  transport: string;
  can_send: boolean;
  /** Why, in the service's own words. Shown when it cannot. */
  note: string;
}

/**
 * CAN THIS DEPLOYMENT EMAIL THE REPORT AT ALL?
 *
 * Asked on render so the button can be labelled honestly rather than promising
 * a send to a server with no SMTP behind it. `can_send: false` arrives with a
 * `note` saying why, and the note is what the disabled button explains.
 */
export async function fetchMonthlyEmailState(
  signal?: AbortSignal,
): Promise<MonthlyEmailState> {
  return request<MonthlyEmailState>(
    "/api/leases/monthly-email",
    "the email settings",
    signal,
  );
}

/**
 * SEND THE MONTHLY REPORT TO THE SIGNED-IN READER.
 *
 * ── THE PAGE CHOOSES THE MONTH AND NOT THE RECIPIENT ──
 *
 * `to` is never sent from here. The forwarder fills it from the session's own
 * address, because the body of this request names who receives a private
 * portfolio and a page must not be able to answer that question. See the POST
 * handler for the reasoning.
 *
 * `month` is the `YYYYMM` on screen; omitted, the service sends the newest
 * month it has filed.
 */
export async function sendMonthlyReport(month?: string | null): Promise<void> {
  const res = await fetch("/api/leases/monthly-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(month ? { month } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text();
  if (res.ok) return;

  let envelope: ErrorEnvelope = {};
  try {
    envelope = (text ? JSON.parse(text) : {}) as ErrorEnvelope;
  } catch {
    /* fall through to the status */
  }
  throw new LeasesApiError(
    envelope.error?.code ?? "HTTP_ERROR",
    res.status,
    envelope.error?.message ?? "The report could not be sent.",
  );
}

/* ============================================================================
   ONE WELL
   ============================================================================ */

/** One filing on a wellbore — the state's own paperwork for it. */
export interface WireWellCompletion {
  spud_label?: string | null;
  drilled_label?: string | null;
  recompleted_label?: string | null;
  first_prod_label?: string | null;
  permit_label?: string | null;
  permit_type?: string | null;
  permit_number?: string | null;
  filing_purpose?: string | null;
  filing_welltype?: string | null;
  perf_top?: number | null;
  perf_bottom?: number | null;
  fracced?: boolean;
  reservoir?: string | null;
  tracking_no?: string | null;
  /** The scanned packet, where one was captured. */
  packet_url?: string | null;
}

/** One entry in the lease's own well list — every well, however it is paged. */
export interface WireWellPick {
  api10?: string;
  well_number?: string;
  label?: string;
  reservoir?: string | null;
  active?: boolean;
  gas_filed?: number;
}

export interface WireWell {
  api10?: string;
  well_number?: string;
  well_name?: string;
  label?: string;
  lease_id?: string;
  lease_label?: string;
  reservoir?: string | null;
  county?: string;
  field_name?: string;
  well_type?: string;
  status?: string;
  profile?: string | null;
  operator_name?: string;
  completion_operator?: string;

  /* the hole */
  depth_ft?: number | null;
  depth_basis?: string | null;
  tvd_ft?: number | null;
  md_ft?: number | null;
  perf_top_ft?: number | null;
  perf_bottom_ft?: number | null;
  perf_thickness_ft?: number | null;
  lateral_ft?: number | null;
  bearing_deg?: number | null;
  bearing_compass?: string | null;
  elevation_ft?: number | null;
  spud_label?: string | null;
  first_prod_label?: string | null;
  age_years?: number | null;

  /* what it has made */
  gas_filed?: number;
  oil_filed?: number;
  gas_projected?: number;
  oil_projected?: number;
  cash_filed?: number;
  cash_projected?: number;
  filed_months?: number;
  projected_months?: number;
  last_filed_label?: string | null;
  peak_gas?: number | null;
  peak_gas_label?: string | null;
  recent_avg_gas?: number | null;
  gas_per_open_ft?: number | null;
  yield_bbl_per_mmcf?: number | null;
  decline_pct?: number | null;
  depleted_pct?: number | null;
  oil_depleted_pct?: number | null;

  /* against the others in the same rock */
  reservoir_wells?: number;
  rank_in_reservoir?: number;
  peer_gas_per_open_ft?: number | null;
  gas_per_open_ft_vs_peers_pct?: number | null;
  open_interval_share_pct?: number | null;
  share_of_reservoir_gas?: number;
  share_of_lease_gas?: number;

  /**
   * THE WELL'S OWN MONTH-BY-MONTH RECORD, filed then modelled.
   *
   * `WireReservoirMonth` deliberately: the reservoir endpoint sends the same
   * eight fields under the same names, and one type means one mapping. Empty
   * with `seam: -1` where the allocation store holds no row for the wellbore —
   * see `note`.
   */
  series?: WireReservoirMonth[];
  /** The COUNT of filed months, so the last of them is `seam - 1`. */
  seam?: number;

  completions?: WireWellCompletion[];
  completion_count?: number;
  /** Wells within one, three and five miles. */
  neighbour_bands?: { band?: number; wells?: number }[];
  map?: { wells?: WireReservoirMapWell[]; note?: string | null };
  insights?: string[];
  stats?: { label?: string; value?: string; sub?: string }[];
  note?: string | null;
  active?: boolean;
}

export interface WireWells {
  owner?: string;
  lease_id?: string;
  lease_number?: string | null;
  district_code?: string | null;
  wells?: WireWell[];
  /** EVERY well on the lease, paging aside — how another page is reached. */
  picker?: WireWellPick[];
}

/**
 * ONE WELL'S REPORT — the hole, its filings, what it has made and where it is.
 *
 * ── `api10` PICKS THE WELL, AND THE LIST COMES BACK ANYWAY ──
 *
 * Narrowed to one well the response is 27KB. `picker[]` is in it either way and
 * lists every well on the lease — 138 on this one — because the list is paged
 * and a reader jumping to a well on page 3 has to be able to find it without
 * walking the pages.
 *
 * ── A WELL CAN HAVE FILINGS AND NO PRODUCTION ──
 *
 * `series` comes back empty with `seam: -1` where the allocation store holds no
 * row for the wellbore: the paperwork, the depths and the perforations are all
 * real, and the volumes simply are not split out from the lease total. The
 * service says so in `note`, and the page prints that rather than drawing an
 * empty chart.
 */
export async function fetchLeaseWells(
  id: string,
  api10?: string | null,
  signal?: AbortSignal,
): Promise<WireWells> {
  const params = new URLSearchParams({ id });
  if (api10) params.set("api10", api10);

  return request<WireWells>(
    `/api/leases/wells?${params}`,
    "this well report",
    signal,
    REPORT_TIMEOUT_MS,
  );
}

/* ============================================================================
   TRANSPORT
   ============================================================================ */

async function request<T>(
  url: string,
  what: string,
  signal?: AbortSignal,
  timeoutMs: number = TIMEOUT_MS,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
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

/**
 * `GET /leases/explainers` — THE DRAWER BEHIND EVERY TILE.
 *
 * ── ONE ENDPOINT, THREE REPORTS ──
 *
 * `tab` picks which set comes back: seven for the lease report, six for the
 * reservoir, six for the well. Each entry is keyed — `lease_value`,
 * `reservoir_open`, `well_best_month` — and a tile opens the entry whose key it
 * names.
 *
 * ONLY THE TILES READ FROM HERE. The value band's own "How it is built" pill
 * keeps the panel `explainers-lease.ts` composes, by request: the band is the
 * same on all three reports and its explanation was not the thing being
 * changed. The service's seventh lease key, `lease_value_built`, is therefore
 * fetched and not opened by anything — left in place rather than filtered out,
 * because the pill is where it belongs the day that changes.
 *
 * ── THE SHAPE IS THE DRAWER'S OWN ──
 *
 * `tone`, `title`, `subtitle`, `stats`, `sections`, `whatToDo`, `tags`,
 * `footnote` are the fields `ExplainerDrawer` already renders, under the same
 * names. That is not a coincidence to rely on blindly — `tone` is still checked
 * against the four the drawer knows, because an unknown one would colour the
 * rule with a class that does not exist — but it does mean the mapping is a
 * transcription rather than a translation.
 *
 * `charts` is sent too, on the entries that have a trend behind them — the
 * valuation panel carries two. Its fields are `ExplainerChart`'s, down to the
 * `gas` / `oil` / `cash` tone.
 */
export interface WireExplainerStat {
  label?: string;
  value?: string;
  sub?: string;
}

/**
 * A bullet under "what this is built on".
 *
 * BOTH FORMS ARE SENT. Most are plain strings; a handful arrive as
 * `{lead, text, tail}` — the rows that quote the record itself, where the name
 * at the front and the figure at the end are what a reader scans for. That is
 * `ExplainerBullet` exactly, which is why it is carried rather than flattened.
 */
export type WireExplainerBullet =
  string | { lead?: string; text?: string; tail?: string };

export interface WireExplainerSection {
  heading?: string;
  /** A paragraph. The third section sends `bullets` instead. */
  body?: string;
  bullets?: WireExplainerBullet[];
  /** The small right-hand note on the heading — "154 posted months". */
  aside?: string;
}

/** A trend under "what it means for you". Only some entries carry any. */
export interface WireExplainerChart {
  title?: string;
  window?: string;
  labels?: string[];
  values?: number[];
  unit?: string;
  /** "gas" | "oil" | "cash" — checked, not trusted. */
  tone?: string;
  footnote?: string;
}

export interface WireExplainer {
  /** What a tile names to open this one — `lease_value`, `well_open`. */
  key?: string;
  /** "money" | "activity" | "models" | "record" — checked, not trusted. */
  tone?: string;
  title?: string;
  subtitle?: string;
  stats?: WireExplainerStat[];
  sections?: WireExplainerSection[];
  charts?: WireExplainerChart[];
  whatToDo?: string;
  tags?: string[];
  footnote?: string;
}

export interface WireExplainers {
  owner?: string;
  lease_id?: string;
  tab?: string;
  scope?: string;
  reservoir_key?: string | null;
  api10?: string | null;
  explainers?: WireExplainer[];
}

/** Which report's drawers to read, and what the tab needs to name its subject. */
export interface ExplainerQuery {
  /** The service's lease key — `08_46924`. */
  id: string;
  tab: "lease" | "reservoir" | "well";
  /** Lease tab only: "share" reads at the owner's decimal, "lease" whole. */
  scope?: "share" | "lease";
  /** Reservoir tab: which rock. */
  reservoirKey?: string | null;
  /** Well tab: which hole. */
  api10?: string | null;
}

export async function fetchLeaseExplainers(
  query: ExplainerQuery,
  signal?: AbortSignal,
): Promise<WireExplainers> {
  const params = new URLSearchParams({ id: query.id, tab: query.tab });
  if (query.scope) params.set("scope", query.scope);
  if (query.reservoirKey) params.set("reservoir_key", query.reservoirKey);
  if (query.api10) params.set("api10", query.api10);

  return request<WireExplainers>(
    `/api/leases/explainers?${params}`,
    "how these figures are built",
    signal,
  );
}
