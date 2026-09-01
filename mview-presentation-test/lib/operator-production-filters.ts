import type { ProductionFilters } from "./operator-production-shape";

/**
 * The applied filter set, as a URL query — one codec, used by both ends.
 *
 * NOT `server-only`. The client builds the query and the route handler parses it, so
 * a single module owning both directions is the only way the two cannot drift. A
 * filter added here appears on both sides at once; a filter added in two places is a
 * filter that silently stops being applied on one of them.
 *
 * WHY A GET AND A QUERY STRING RATHER THAN A POST. Both upstream reads are pure, so
 * this app's own routes are GETs — which makes them cacheable by the browser and by
 * a shared cache, so re-applying a filter set someone already asked for costs
 * nothing. The upstream calls really are POSTs; that is an upstream detail and does
 * not need to reach the client. It matches `/api/operators/compare`, which takes its
 * operator names the same way.
 *
 * ARRAYS ARE REPEATED KEYS, not a joined string. County names contain spaces and
 * `DE WITT` has one in the middle; operator names contain commas, periods and
 * ampersands. Any separator would eventually collide with a value, and repeated keys
 * are what `URLSearchParams` already does correctly in both directions.
 */

/**
 * The earliest year the series endpoint returns anything for — measured by asking
 * for 1990 and getting 1997 back as the first entry.
 */
export const YEAR_FLOOR = 1997;

/**
 * The default window: ten years ending on the last complete one.
 *
 * Ten because that is the span the page's copy and its structured data describe, and
 * because a decade is what makes a trend line readable. It ends on the last COMPLETE
 * year — production posts on a lag, so the current year is always a partial bar and
 * charting it reads as a collapse rather than as an incomplete year.
 */
export const DEFAULT_WINDOW_YEARS = 10;

/** Filter keys, defined once so the two directions cannot disagree on spelling. */
const KEYS = {
  operator: "operator",
  county: "county",
  district: "district",
  play: "play",
  from: "from",
  to: "to",
} as const;

/** The window the page opens on: the ten complete years before `currentYear`. */
export function defaultProductionWindow(currentYear: number): {
  fromYear: number;
  toYear: number;
} {
  const toYear = Math.max(currentYear - 1, YEAR_FLOOR);
  return {
    fromYear: Math.max(toYear - (DEFAULT_WINDOW_YEARS - 1), YEAR_FLOOR),
    toYear,
  };
}

/** An empty filter set for a given year — no operators chosen, nothing scoped. */
export function emptyProductionFilters(currentYear: number): ProductionFilters {
  return {
    operators: [],
    counties: [],
    districtCodes: [],
    playTypes: [],
    ...defaultProductionWindow(currentYear),
  };
}

function clean(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value !== "");
}

/** The filter set as a query string, for this app's own route handlers. */
export function productionFiltersToQuery(filters: ProductionFilters): string {
  const params = new URLSearchParams();
  for (const name of clean(filters.operators))
    params.append(KEYS.operator, name);
  for (const county of clean(filters.counties))
    params.append(KEYS.county, county);
  for (const code of clean(filters.districtCodes))
    params.append(KEYS.district, code);
  for (const play of clean(filters.playTypes)) params.append(KEYS.play, play);
  params.set(KEYS.from, String(filters.fromYear));
  params.set(KEYS.to, String(filters.toYear));
  return params.toString();
}

/**
 * A query string back into a filter set.
 *
 * THE YEARS ARE CLAMPED AND ORDERED HERE, not trusted. This is a public route: a
 * hand-written `from=3000&to=1` must not reach the upstream endpoint, and swapping a
 * reversed pair is friendlier than rejecting it.
 */
export function productionFiltersFromQuery(
  params: URLSearchParams,
  currentYear: number,
): ProductionFilters {
  const fallback = defaultProductionWindow(currentYear);
  const ceiling = Math.max(currentYear, YEAR_FLOOR + DEFAULT_WINDOW_YEARS);

  const year = (raw: string | null, absent: number): number => {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) return absent;
    return Math.min(Math.max(parsed, YEAR_FLOOR), ceiling);
  };

  const from = year(params.get(KEYS.from), fallback.fromYear);
  const to = year(params.get(KEYS.to), fallback.toYear);

  return {
    operators: clean(params.getAll(KEYS.operator)),
    counties: clean(params.getAll(KEYS.county)),
    districtCodes: clean(params.getAll(KEYS.district)),
    playTypes: clean(params.getAll(KEYS.play)),
    fromYear: Math.min(from, to),
    toYear: Math.max(from, to),
  };
}

/**
 * A stable key for one filter set — the cache key both hooks use.
 *
 * SORTED, so the same scope reached in a different order is one entry: picking
 * Midland then Martin and picking Martin then Midland ask the same question and must
 * not cost two requests. JSON rather than a joined string for the reason given at the
 * top of this file — the values contain every separator worth choosing.
 */
export function productionFiltersKey(filters: ProductionFilters): string {
  return JSON.stringify([
    [...clean(filters.operators)].sort(),
    [...clean(filters.counties)].sort(),
    [...clean(filters.districtCodes)].sort(),
    [...clean(filters.playTypes)].sort(),
    filters.fromYear,
    filters.toYear,
  ]);
}

/**
 * Is there anything to ask about?
 *
 * At least one operator. Every other filter narrows a comparison; the operators ARE
 * the comparison, and the endpoint answers an empty `search_text` with an empty
 * operator list — so asking would spend a round trip to be told what is already
 * known here.
 */
export function hasProductionSelection(filters: ProductionFilters): boolean {
  return clean(filters.operators).length > 0;
}

/** The fewest operators that make a comparison — see `canCompareProduction`. */
export const MIN_COMPARE_OPERATORS = 2;

/**
 * Is this a COMPARISON, as opposed to merely something to ask about?
 *
 * DEFECT 159 — "after selecting one operator apply button get enable, after at least
 * 2 operators selection need to enable the apply button". The page is called Compare
 * Operators Performance and its own lede says "Put two to four Texas operators side
 * by side"; one operator produces a chart with a single line and a "who leads" block
 * whose four tiles all name the same company.
 *
 * DELIBERATELY SEPARATE FROM `hasProductionSelection`, which the two route handlers
 * use to decide whether there is anything worth an upstream round trip. That question
 * still has the same answer at one operator, and widening it would turn a handler's
 * cheap guard into a product rule enforced in two places. This one is the button's
 * rule and belongs to the page.
 */
export function canCompareProduction(filters: ProductionFilters): boolean {
  return clean(filters.operators).length >= MIN_COMPARE_OPERATORS;
}
