/**
 * Compare Operator Production — the view models the page renders.
 *
 * NO `server-only` HERE, DELIBERATELY. These types cross the wire: the route
 * handlers return them and the client hooks consume them, so both sides have to be
 * able to import the file. The reading and mapping live in
 * `operator-production-api.ts`, which IS server-only — this is the shape it
 * produces, nothing more.
 *
 * UNITS ARE FIXED AT THIS BOUNDARY, once, because the two upstream endpoints
 * disagree with each other and neither matches what the page prints:
 *
 *   ·  `/compare-operators-production_info`  raw barrels / raw Mcf
 *   ·  `/compare-operators-production`       THOUSANDS of barrels / Mcf
 *   ·  what the page renders                 MILLIONS (`formatMillions`)
 *
 * Measured, not assumed: summing the series endpoint over a range wide enough to
 * cover the whole record comes to exactly 1/1000th of the info endpoint's total
 * (1,094,832 against 1,094,847,119 — a ratio of 1000.01). Everything below is in
 * millions so a figure from one endpoint can sit beside a figure from the other
 * without a reader having to know which produced it.
 */

/** One operator's identity, shared by the cards, the tiles and the chart legend. */
export interface ProductionIdentity {
  /** Display spelling, cased through the shared directory lookup. */
  name: string;
  /** The regulator's filed spelling — what the payload has to send back. */
  filedName: string;
  operatorNumber: string;
  /** Same-origin logo path, or null when the record carries none. */
  logoUrl: string | null;
  /** Two initials, for when there is no logo. */
  monogram: string;
  /** Statewide production rank, or null when the response omits it. */
  rankStatewide: number | null;
}

/**
 * One operator's figures.
 *
 * EVERY VOLUME IS LIFETIME, NOT WINDOWED — see `operator-production-api.ts`. The
 * duration in the payload is ignored by this endpoint, which is measurable: asking
 * for 2024 alone returns the same totals as 2015–2024. The county, district and
 * play-type filters ARE applied. Naming these `total*` rather than `cum*` is the
 * point: they are the operator's whole filed record within the selected acreage.
 */
export interface ProductionOperator extends ProductionIdentity {
  /** Millions of barrels, across the filed record within the filtered acreage. */
  oilTotal: number;
  /** Millions of Mcf. */
  gasTotal: number;
  /** Millions of BOE, as the API computes it. */
  boeTotal: number;
  /**
   * The oil/gas split BY RAW VOLUME, and the pair sums to 100.
   *
   * NOT the share of BOE. Pioneer reads 26.2% oil here against 82% of its BOE,
   * because BOE converts gas at 15:1 and this does not. Labelling it as a BOE
   * share would be wrong by a factor of three.
   */
  oilPercent: number;
  gasPercent: number;
  /** Counties in scope — the filter's count, or all of them when unfiltered. */
  countyCount: number;
  /** Counties the operator actually reports production from. */
  producingCountyCount: number;
  leaseCount: number;
  activeLeaseCount: number;
  /** `2026-07` as the API sends it, or "" when absent. */
  latestProductionDate: string;
  /** Average per lease, in whole barrels and Mcf — small numbers, not millions. */
  avgOilPerLease: number;
  avgGasPerLease: number;
  /** Most-active counties, highest first. `boe` in millions. */
  topCounties: { county: string; boe: number }[];
}

/** One "who leads on what" tile. */
export interface ProductionLeader extends ProductionIdentity {
  /** The figure this tile is about. Units depend on which tile — see below. */
  value: number;
  /** Leases the efficiency figure was computed from; null on the other tiles. */
  leaseCount: number | null;
}

/**
 * The four tiles, each null when the response omits it.
 *
 * `highestOil`/`highestGas` carry millions; `mostEfficient` carries MBOE per lease
 * exactly as the API computed it, and `widestFootprint` a county count. The tiles
 * label their own units, which is why one type serves all four.
 */
export interface ProductionLeaders {
  highestOil: ProductionLeader | null;
  highestGas: ProductionLeader | null;
  mostEfficient: ProductionLeader | null;
  widestFootprint: ProductionLeader | null;
}

/** Everything `/compare-operators-production_info` supplies. */
export interface ProductionInfo {
  operators: ProductionOperator[];
  leaders: ProductionLeaders;
  /** What the response says it found, which can differ from `operators.length`. */
  totalOperators: number;
  /**
   * True when the volumes came back withheld because the reader has no account.
   *
   * WHY IT IS A FLAG AND NOT AN ABSENT FIELD. The endpoint sends the literal
   * `"****"` in place of each volume and everything else on the record intact —
   * rank, the oil/gas split, county and lease counts. So the comparison still has
   * real content to draw; it is only the volumes that must not be printed. Parsing
   * turns `"****"` into 0, which is why this cannot be inferred downstream: a
   * withheld volume and a genuine zero are indistinguishable by then, and printing
   * "0.0M bbl" for a withheld figure is the worst of the three outcomes.
   */
  locked: boolean;
}

/** One year of one operator's output, in millions. */
export interface ProductionPoint {
  year: number;
  oil: number;
  gas: number;
  boe: number;
}

/**
 * One operator's series.
 *
 * ALIGNED TO `years`, WITH GAPS FILLED. The endpoint omits a year an operator did
 * not report in, so two operators can come back with different year lists. A chart
 * that indexed those directly would draw one operator's 2019 above another's 2021.
 * Every series here is the same length as `years`, with a missing year as zero.
 */
export interface ProductionSeriesOperator extends ProductionIdentity {
  points: ProductionPoint[];
}

/** Everything `/compare-operators-production` supplies. */
export interface ProductionSeries {
  /** Ascending, and the union of every year any selected operator reported in. */
  years: number[];
  operators: ProductionSeriesOperator[];
  /** True when the annual volumes were withheld — see `ProductionInfo.locked`. */
  locked: boolean;
}

/**
 * One line on the chart.
 *
 * WHY THE CHART DOES NOT TAKE `ProductionSeriesOperator` DIRECTLY. It needs three
 * parallel arrays it can slice by year index and hand straight to the geometry —
 * `boe[range.start..range.end]` — where the response gives it an array of points with
 * all three volumes on each. Pivoting once here beats pivoting inside a `useMemo` that
 * re-runs on every brush drag.
 *
 * IT ALSO KEEPS THE CHART OFF THE FIXTURE'S TYPE. `CompareOperator` carries leases,
 * counties and production dates the chart has never drawn, and building one from a
 * series response would mean inventing zeros for all of it. This is the four fields a
 * line actually needs.
 */
export interface ProductionChartSeries {
  /** Stable identity for React keys — the operator number where there is one. */
  key: string;
  /** Full display name, for the accessible description. */
  name: string;
  /** Short label for the legend and table headers. */
  label: string;
  color: string;
  /** All three in millions, each the same length as the chart's year axis. */
  oil: number[];
  gas: number[];
  boe: number[];
}

/**
 * The applied filter set — the one object both endpoints are driven from.
 *
 * WHY IT IS A SINGLE VALUE. Both requests take the same filters, and the page must
 * not fire either one on a keystroke: the user edits a draft, presses Apply, and
 * this is what Apply produces. Serialised, it is also the cache key both hooks use,
 * so re-applying an identical set costs nothing and neither endpoint is called
 * twice for the same question.
 */
export interface ProductionFilters {
  /** Filed operator names — the payload's `search_text`. Empty means none chosen. */
  operators: string[];
  counties: string[];
  districtCodes: string[];
  playTypes: string[];
  fromYear: number;
  toYear: number;
}

/**
 * The option lists the filter bar offers, read on the server and passed in.
 *
 * ALL THREE ARE SERVER-SUPPLIED, from cached endpoint reads, so the browser makes no
 * request to populate a dropdown and ships no code to build one.
 *
 * NO YEAR LIST. The year range is no longer a control (requested) — the window is
 * fixed at the default and only reaches the payload, so there is nothing to offer.
 */
export interface ProductionFilterOptions {
  counties: string[];
  playTypes: string[];
  districtCodes: string[];
}
