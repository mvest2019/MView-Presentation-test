/**
 * The Operator Listing's filter state, its translation into an API payload, and
 * the mapping from API records to table rows.
 *
 * Pure functions and types only — no React, no `fetch`, no `server-only`. This is
 * the single place payloads are built (so no filter can be dropped when another
 * one changes) and the single place API field names are translated into the
 * shapes the table renders.
 */

import {
  MASKED,
  OPERATOR_SORT_FIELDS,
  TEMP_MEMBER_ID,
  operatorLogoPath,
  type OperatorSearchRecord,
  type OperatorSearchRequest,
} from "./operator-api-types";

/** The four quick-filter pills. Order is the order they render in. */
export const QUICK_FILTERS = {
  activeInLast90Days: "Active in last 90 days",
  topProducers: "Top 10 producers",
  moreThan5Counties: "Active in >5 counties",
  moreThan10Counties: "Active in >10 counties",
} as const;

/** Keys match the API's payload properties exactly, so no lookup table is needed. */
export type QuickFilterKey = keyof typeof QUICK_FILTERS;

export const QUICK_FILTER_KEYS = Object.keys(QUICK_FILTERS) as QuickFilterKey[];

/** Sentinel for the Play Type select's default option. */
export const ALL_PLAYS = "*";

/** Table columns the API can sort by. Operator name is absent — see below. */
export type OperatorSortKey = keyof typeof OPERATOR_SORT_FIELDS;

export function isSortableByApi(key: string): key is OperatorSortKey {
  return key in OPERATOR_SORT_FIELDS;
}

export type OperatorStatusFilter = "active" | "inactive" | "";

/** Everything the listing's controls hold. One object, one source of truth. */
export interface OperatorFilters {
  searchText: string;
  /**
   * The selected play type, or `ALL_PLAYS` for the default option. Sent as the
   * payload's `playtype`; the values come from `/operators/playtypes`, which
   * already returns them upper-cased.
   */
  play: string;
  /** All four flags always present, so an unselected filter sends `false`. */
  quick: Record<QuickFilterKey, boolean>;
  status: OperatorStatusFilter;
  /** Title case as the dropdown lists it; upper-cased when the payload is built. */
  county: string;
  sortKey: OperatorSortKey;
  sortDir: "asc" | "desc";
  page: number;
}

export const PAGE_SIZE = 10;

/** The API's documented default sort, and the listing's initial state. */
export const DEFAULT_FILTERS: OperatorFilters = {
  searchText: "",
  play: ALL_PLAYS,
  quick: {
    activeInLast90Days: false,
    topProducers: false,
    moreThan5Counties: false,
    moreThan10Counties: false,
  },
  status: "active",
  county: "",
  sortKey: "oil",
  sortDir: "desc",
  page: 1,
};

/**
 * Filter state -> the complete request body.
 *
 * Always emits every field. The four booleans are spread from `quick`, so an
 * unselected filter is sent as `false` rather than omitted, and changing one
 * filter cannot drop another.
 *
 * Key order matches the contract sample exactly. JSON objects are unordered so
 * this makes no difference to the server, but it means a captured payload can be
 * diffed line-for-line against the spec without reordering it first.
 */
export function buildOperatorSearchPayload(
  filters: OperatorFilters,
  visitorId: string,
): OperatorSearchRequest {
  return {
    page: filters.page,
    search_text: filters.searchText.trim(),
    pageSize: PAGE_SIZE,
    sort: {
      // The sorted column's own API property — see `OPERATOR_SORT_FIELDS`.
      propertyName: OPERATOR_SORT_FIELDS[filters.sortKey],
      type: filters.sortDir,
    },
    activeInLast90Days: filters.quick.activeInLast90Days,
    topProducers: filters.quick.topProducers,
    moreThan5Counties: filters.quick.moreThan5Counties,
    moreThan10Counties: filters.quick.moreThan10Counties,
    // Case-sensitive upstream: "MIDLAND" matches, "Midland" returns nothing.
    county: filters.county ? filters.county.toUpperCase() : "",
    // TEMPORARY stand-in until auth supplies the real member id — see
    // `TEMP_MEMBER_ID`. This is what keeps rows 4-10 unmasked under a quick
    // filter; anonymous (`0`) would gate them.
    member_id: TEMP_MEMBER_ID,
    status: filters.status,
    // Same casing rule as county. The play types endpoint already returns upper
    // case, so this is belt-and-braces: if it ever returned title case, passing
    // the value through verbatim would silently return zero rows.
    playtype:
      filters.play === ALL_PLAYS ? "" : filters.play.trim().toUpperCase(),
    visitorId,
  };
}

/* --------------------------------------------------------------------------
   API record -> table row
   -------------------------------------------------------------------------- */

/**
 * One row as the table renders it.
 *
 * Production figures stay strings: the API pre-formats them with units
 * (`"57,323.230 (MBBL)"`), so there is nothing left to format and no number to
 * round. `counties` is a string for the same reason — a gated row sends `"****"`
 * where the count would be.
 */
export interface OperatorRow {
  /** Stable list key. Falls back to the position when the number is masked. */
  key: string;
  name: string;
  operatorNumber: string;
  /** Figure only, unit stripped — `"57,323.230"`. */
  oil: string;
  /** The unit that came with it — `"MBBL"`. Empty on a gated row. */
  oilUnit: string;
  gas: string;
  gasUnit: string;
  counties: string;
  /** `leaseCount` — `"****"` on a gated row. */
  leases: string;
  /** `end_productiondate`, e.g. `"May 2026"`. */
  lastProduction: string;
  status: string;
  /** `null` on a gated row, which has no slug to link to. */
  href: string | null;
  /**
   * Where to request the logo, or null when there is nothing worth requesting —
   * a gated row (whose operator number is masked, so there is no logo to name) or
   * a record that carried no `operator_logo`.
   *
   * This is OUR path, not the API's URL. The upstream response sets
   * `Cross-Origin-Resource-Policy: same-origin`, so a browser refuses to display it
   * cross-origin; `operatorLogoPath` points at the route handler that re-serves the
   * bytes from our own origin. See the note there.
   *
   * A value here means "ask for it", not "it exists": the endpoint 404s for every
   * operator without a logo, so whatever renders this must still handle failure.
   */
  logoUrl: string | null;
  /** Two initials, for the tile shown when there is no logo to show. */
  monogram: string;
  /** True when this row came back as `"****"` behind the sign-in gate. */
  masked: boolean;
}

/**
 * Initials of the first two words of the operator's name — "Pioneer Natural RES
 * USA, Inc" becomes "PN". The same rule the operator comparison tools use, so one
 * operator gets the same tile everywhere it appears.
 */
function monogramOf(name: string): string {
  const words = name.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * Splits the API's pre-formatted figure into number and unit.
 *
 *   "57,323.230 (MBBL)"  ->  { value: "57,323.230", unit: "MBBL" }
 *   "****"               ->  { value: "****",       unit: ""     }
 *
 * The unit is repeated on every row upstream, which reads as noise down a column
 * where it never varies — it belongs in the header. Anything that does not match
 * the `figure (UNIT)` shape passes through untouched, so an unexpected format
 * still renders rather than silently blanking.
 */
function splitUnit(raw: string): { value: string; unit: string } {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  return match
    ? { value: match[1].trim(), unit: match[2].trim() }
    : { value: raw, unit: "" };
}

function isMasked(value: unknown): boolean {
  return value === MASKED;
}

/** Renders a possibly-masked numeric field without printing `undefined`. */
function numericCell(value: number | typeof MASKED): string {
  return isMasked(value) ? MASKED : String(value);
}

export function toOperatorRow(
  record: OperatorSearchRecord,
  index: number,
): OperatorRow {
  const masked = isMasked(record.operator_number);

  // `operator_name_url` is the API's own slug and is what the detail route will
  // key on; `seo_operator_url` is a marketing alias that is not always present.
  const slug = record.operator_name_url;
  const oil = splitUnit(record.oil_produced_current_quarter);
  const gas = splitUnit(record.gas_produced_current_quarter);

  return {
    key: masked ? `masked-${index}` : record.operator_number,
    name: record.cleaned_operator_name,
    operatorNumber: record.operator_number,
    oil: oil.value,
    oilUnit: oil.unit,
    gas: gas.value,
    gasUnit: gas.unit,
    counties: numericCell(record.countie_count),
    leases: numericCell(record.leaseCount),
    lastProduction: record.end_productiondate,
    status: record.status,
    href: masked || !slug ? null : `/operators/${slug}`,
    logoUrl:
      masked || !record.operator_logo
        ? null
        : operatorLogoPath(record.operator_number),
    monogram: monogramOf(record.cleaned_operator_name),
    masked,
  };
}

export function toOperatorRows(records: OperatorSearchRecord[]): OperatorRow[] {
  return records.map(toOperatorRow);
}

/* --------------------------------------------------------------------------
   Paging maths, driven by the API's own count
   -------------------------------------------------------------------------- */

export interface OperatorResultPage {
  rows: OperatorRow[];
  /** `total_count` from the API — never derived from `rows.length`. */
  total: number;
  page: number;
  pageCount: number;
  /** 0-based index of the first row on this page, for "Showing x–y". */
  from: number;
  /** Units for the production column headers, taken from the rows themselves. */
  units: { oil: string; gas: string };
}

/**
 * What the headers say before any row has arrived.
 *
 * The units are read from the response rather than assumed, but the first render
 * has no rows to read, and a header that gained "(MBBL)" on load would shift the
 * column. These are the units the endpoint has returned on every observed
 * response; live data overrides them the moment it lands.
 */
const OBSERVED_UNITS = { oil: "MBBL", gas: "MMCF" } as const;

/** First real unit down the column — gated rows carry none. */
function columnUnit(rows: OperatorRow[], key: "oilUnit" | "gasUnit"): string {
  return rows.find((row) => row[key])?.[key] ?? "";
}

export function toResultPage(
  records: OperatorSearchRecord[],
  total: number,
  page: number,
): OperatorResultPage {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), pageCount);
  const rows = toOperatorRows(records);

  return {
    rows,
    total,
    page: clamped,
    pageCount,
    from: (clamped - 1) * PAGE_SIZE,
    units: {
      oil: columnUnit(rows, "oilUnit") || OBSERVED_UNITS.oil,
      gas: columnUnit(rows, "gasUnit") || OBSERVED_UNITS.gas,
    },
  };
}

/** The starting page, before the first response. Units are the observed defaults. */
export const EMPTY_RESULT_PAGE: OperatorResultPage = {
  rows: [],
  total: 0,
  page: 1,
  pageCount: 1,
  from: 0,
  units: { ...OBSERVED_UNITS },
};
