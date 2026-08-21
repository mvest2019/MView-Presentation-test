/**
 * Compare Operator Production — the arithmetic, with no React in it.
 *
 * Every number the page shows is derived here: cumulative volumes, the oil/gas
 * split, compound growth, production per lease, and which operator leads each of
 * those. Keeping it in a pure module means the figures can
 * be checked without rendering anything, and it is the layer that changes when a
 * real compare endpoint replaces the fixture — see the seam note below.
 *
 * THE SEAM. The page never touches `operator-compare-data` directly. It calls
 * `listCompareOptions()` for the picker and `buildComparison()` for the selected
 * slots, both of which take plain slugs. When an endpoint arrives, those two
 * functions become async reads against it and nothing above this file changes
 * shape: `CompareOperator` is already the view model, not the wire format.
 *
 * UNITS. The fixture stores raw filed volumes — barrels for oil, Mcf for gas,
 * BOE at 15:1. Everything public from this module is in **millions**, which is
 * the unit the design labels its axes and cells with, and the rounding matches
 * the prototype's: series values to 0.1M, cumulative totals summed from the raw
 * figures first so the total is not the sum of eight roundings.
 */

import {
  COMPARE_YEARS,
  OPERATOR_COMPARE_RECORDS,
  type OperatorCompareRecord,
} from "./operator-compare-data";
import { COMPARE_SLOT_COUNT, SLOT_COLORS } from "./operator-slot-colors";

export { COMPARE_YEARS };

/** Which volume the chart, the legend and the year table are showing. */
export type CompareMetric = "boe" | "oil" | "gas";

/** The empty value for the two optional slots — the design's "— none —". */
export const NO_OPERATOR = "";

/**
 * Slot count and colours now live in `operator-slot-colors.ts`, shared with the
 * statistics comparison tool. Imported for use below and re-exported so this module
 * stays the one import the production page needs.
 */
export { COMPARE_SLOT_COUNT, SLOT_COLORS };

/** A selected operator, with everything the page renders already computed. */
export interface CompareOperator {
  /** 0–3. Fixes the colour and the stacking order. */
  slot: number;
  color: string;
  slug: string;
  name: string;
  /** First word of the filed name — "Pioneer", "EOG" — for tight cells. */
  short: string;
  /** Two initials, for the logo tile. */
  monogram: string;
  operatorNumber: string;
  /** Position in the statewide production ranking. */
  rank: number;
  leases: number;
  /** Leases currently producing, against `leases` as the lifetime count. */
  activeLeases: number;
  counties: number;
  /** First and latest filed production month, as the record words them. */
  productionStart: string;
  productionEnd: string;
  /** Most-active counties, title-cased, highest first. */
  topCounties: string[];
  /** Millions of BOE per year, one per `COMPARE_YEARS` index. */
  boe: number[];
  /** Millions of barrels per year. */
  oil: number[];
  /** Millions of Mcf per year. */
  gas: number[];
  /** Cumulative millions across the whole filed record. */
  cumBoe: number;
  cumOil: number;
  cumGas: number;
  /** Oil's share of cumulative BOE, whole percent. */
  oilPct: number;
}

/* --------------------------------------------------------------------------
   Names
   -------------------------------------------------------------------------- */

/**
 * The short label. The filed name's first word, upper-cased when it is an
 * acronym short enough to be one ("EOG", "XTO") and title-cased otherwise.
 */
function shortName(filedName: string): string {
  const first = /[A-Za-z]+/.exec(filedName)?.[0] ?? filedName;
  return first.length <= 3
    ? first.toUpperCase()
    : first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Initials of the first two words — the logo tile's content. */
function monogram(filedName: string): string {
  const words = filedName.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/** `MIDLAND` -> `Midland`. County names arrive from the regulator in caps. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */

/**
 * Millions in, a compact label out: `92.7M`, or `2.37B` once the figure passes a
 * thousand million. The design uses this for every volume it prints.
 */
export function formatMillions(millions: number): string {
  return millions >= 1000
    ? `${(millions / 1000).toFixed(2)}B`
    : `${millions.toFixed(1)}M`;
}

/** A signed percentage, one decimal — `+4.8%`, `-1.2%`. */
export function formatPercentChange(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

/** Thousands separators, en-US, matching the rest of the site. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/* --------------------------------------------------------------------------
   Series arithmetic

   Each takes a series already in millions, and reads the WHOLE series rather than
   the brushed window: the brush scopes the chart and the year table, while the
   generated read always describes the full filed record. Changing that would let
   the page claim "10-yr growth" from three years of data.
   -------------------------------------------------------------------------- */

/** Compound annual growth across the series, as a percentage per year. */
export function compoundGrowth(series: number[]): number {
  const first = series[0];
  const last = series.at(-1);
  if (first === undefined || last === undefined || first <= 0 || series.length < 2) {
    return 0;
  }
  return (Math.pow(last / first, 1 / (series.length - 1)) - 1) * 100;
}

/**
 * `points` for a sparkline polyline, scaled to fill a `width`×`height` box with a
 * 2px margin. The scale is per-series, so each sparkline shows that operator's
 * own shape rather than its size relative to the others — which is the column's
 * whole purpose next to the numeric ones.
 */
export function sparklinePoints(
  series: number[],
  width: number,
  height: number,
): string {
  if (series.length === 0) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const last = series.length - 1 || 1;

  return series
    .map((value, index) => {
      const x = ((index / last) * width).toFixed(2);
      const y = (height - 2 - ((value - min) / range) * (height - 4)).toFixed(2);
      return `${x},${y}`;
    })
    .join(" ");
}

/** Thousands of BOE per lease on record — the design's efficiency measure. */
export function mboePerLease(operator: CompareOperator): number {
  if (operator.leases <= 0) return 0;
  return (operator.cumBoe * 1e6) / operator.leases / 1000;
}

/** The series the current metric selects. */
export function seriesFor(
  operator: CompareOperator,
  metric: CompareMetric,
): number[] {
  return metric === "oil"
    ? operator.oil
    : metric === "gas"
      ? operator.gas
      : operator.boe;
}

/** The y-axis title for the current metric. */
export function axisLabel(metric: CompareMetric): string {
  return metric === "oil"
    ? "Oil (M bbl / yr)"
    : metric === "gas"
      ? "Gas (M Mcf / yr)"
      : "BOE (M / yr)";
}

/** What a cell of the current metric is counting. */
export function metricNoun(metric: CompareMetric): string {
  return metric === "oil" ? "barrels" : metric === "gas" ? "Mcf" : "BOE";
}

/* --------------------------------------------------------------------------
   Reading the fixture
   -------------------------------------------------------------------------- */

/** Statewide rank. The records are the top eight, ordered, so this is position. */
function rankOf(index: number): number {
  return index + 1;
}

export interface CompareOption {
  slug: string;
  /** `#1 · Pioneer Natural RES USA, Inc` — rank first, as the design shows it. */
  label: string;
}

/** Every operator the tool can chart, in statewide rank order. */
export function listCompareOptions(): CompareOption[] {
  return OPERATOR_COMPARE_RECORDS.map((record, index) => ({
    slug: record.slug,
    label: `#${rankOf(index)} · ${record.name}`,
  }));
}

/** The four slugs the page opens with — the top four by reported production. */
export function defaultSelection(): string[] {
  return OPERATOR_COMPARE_RECORDS.slice(0, COMPARE_SLOT_COUNT).map(
    (record) => record.slug,
  );
}

function toCompareOperator(
  record: OperatorCompareRecord,
  index: number,
  slot: number,
): CompareOperator {
  // Summed raw, then converted — so the cumulative figure is not the sum of ten
  // rounded ones. The per-year values are rounded to 0.1M because that is the
  // precision the chart and the year table print.
  let rawBoe = 0;
  let rawOil = 0;
  let rawGas = 0;
  for (const year of record.series) {
    rawBoe += year.boe;
    rawOil += year.oil;
    rawGas += year.gas;
  }

  return {
    slot,
    color: SLOT_COLORS[slot] ?? SLOT_COLORS[0],
    slug: record.slug,
    name: record.name,
    short: shortName(record.filedName),
    monogram: monogram(record.filedName),
    operatorNumber: record.operatorNumber,
    rank: rankOf(index),
    leases: record.leases,
    activeLeases: record.activeLeases,
    counties: record.counties,
    productionStart: record.productionStart,
    productionEnd: record.productionEnd,
    topCounties: record.topCounties.map(titleCase),
    boe: record.series.map((year) => Number((year.boe / 1e6).toFixed(1))),
    oil: record.series.map((year) => Number((year.oil / 1e6).toFixed(1))),
    gas: record.series.map((year) => Number((year.gas / 1e6).toFixed(1))),
    cumBoe: rawBoe / 1e6,
    cumOil: rawOil / 1e6,
    cumGas: rawGas / 1e6,
    oilPct: rawBoe > 0 ? Math.round((rawOil / rawBoe) * 100) : 0,
  };
}

/**
 * Resolve the four picker values into operators, skipping empty slots and
 * anything that does not match a record. Slot numbers are the *picker* positions,
 * so an operator in slot 4 keeps slot 4's colour even when slot 3 is empty.
 */
export function buildComparison(selection: readonly string[]): CompareOperator[] {
  const operators: CompareOperator[] = [];

  selection.forEach((slug, slot) => {
    if (!slug) return;
    const index = OPERATOR_COMPARE_RECORDS.findIndex(
      (record) => record.slug === slug,
    );
    if (index < 0) return;
    const record = OPERATOR_COMPARE_RECORDS[index];
    if (!record) return;
    operators.push(toCompareOperator(record, index, slot));
  });

  return operators;
}

/** Every county the charted operators are most active in, title-cased, sorted. */
export function listCompareCounties(): string[] {
  const counties = new Set<string>();
  for (const record of OPERATOR_COMPARE_RECORDS) {
    for (const county of record.topCounties) counties.add(titleCase(county));
  }
  return [...counties].sort();
}

/* --------------------------------------------------------------------------
   Who leads what
   -------------------------------------------------------------------------- */

/** Highest first by `score`. Never mutates the input. */
function topBy(
  operators: CompareOperator[],
  score: (operator: CompareOperator) => number,
): CompareOperator[] {
  return [...operators].sort((a, b) => score(b) - score(a));
}

export interface CompareLeaders {
  /** By cumulative BOE, highest first — the whole ranking, not just the winner. */
  byVolume: CompareOperator[];
  /**
   * Most oil and most gas produced across the filed record.
   *
   * SEPARATE FROM `byVolume`, because BOE folds gas into oil at 15:1 and so hides
   * exactly the distinction these two exist to draw: the largest producer overall is
   * frequently neither the largest oil producer nor the largest gas producer.
   */
  oil: CompareOperator;
  gas: CompareOperator;
  efficiency: CompareOperator;
  growth: CompareOperator;
  footprint: CompareOperator;
  oilWeighted: CompareOperator;
  /**
   * How many times the largest operator out-produces the second — null when only
   * one operator is selected and there is nothing to divide by.
   */
  volumeMultiple: number | null;
}

/**
 * The leaders, computed once and shared by the generated read and the tiles so
 * the two can never disagree about who is ahead. Returns null for an empty
 * selection rather than inventing a winner; the page renders its empty state.
 */
export function findLeaders(
  operators: CompareOperator[],
): CompareLeaders | null {
  const byVolume = topBy(operators, (operator) => operator.cumBoe);
  const leader = byVolume[0];
  const oil = topBy(operators, (operator) => operator.cumOil)[0];
  const gas = topBy(operators, (operator) => operator.cumGas)[0];
  const efficiency = topBy(operators, mboePerLease)[0];
  const growth = topBy(operators, (operator) => compoundGrowth(operator.boe))[0];
  const footprint = topBy(operators, (operator) => operator.counties)[0];
  const oilWeighted = topBy(operators, (operator) => operator.oilPct)[0];

  if (
    !leader ||
    !oil ||
    !gas ||
    !efficiency ||
    !growth ||
    !footprint ||
    !oilWeighted
  ) {
    return null;
  }

  const runnerUp = byVolume[1];

  return {
    byVolume,
    oil,
    gas,
    efficiency,
    growth,
    footprint,
    oilWeighted,
    volumeMultiple:
      runnerUp && runnerUp.cumBoe > 0 ? leader.cumBoe / runnerUp.cumBoe : null,
  };
}

/* --------------------------------------------------------------------------
   Table rows
   -------------------------------------------------------------------------- */

export interface StatRow {
  label: string;
  /** One formatted cell per operator, in the order given. */
  value: (operator: CompareOperator) => string;
}

/**
 * `March 1997` -> `Mar 1997`, so a date range fits one table cell.
 *
 * Only the month word is shortened, and only when it is long enough to need it —
 * "May 2026" is left alone rather than padded to a fake abbreviation.
 */
function shortMonth(value: string): string {
  return value.replace(/^([A-Za-z]{4,})/, (month) => month.slice(0, 3));
}

/**
 * The comparison-stats rows, in the requested order.
 *
 * UNITS LIVE IN THE VALUE, NOT THE LABEL. The labels are the ones asked for — "Oil
 * Produced", not "Cumulative oil (bbl)" — but a bare "1.91B" in a cell is a figure a
 * reader has to guess the unit of, so the unit rides with the number. `cumOil` is
 * millions of barrels and `cumGas` millions of Mcf, which is what `formatMillions`
 * scales; labelling gas as barrels would be the easy mistake here.
 */
export const COMPARE_STAT_ROWS: readonly StatRow[] = [
  {
    label: "Rank statewide — by reported production",
    value: (operator) => `#${operator.rank}`,
  },
  {
    label: "Oil Produced",
    value: (operator) => `${formatMillions(operator.cumOil)} bbl`,
  },
  {
    label: "Gas Produced",
    value: (operator) => `${formatMillions(operator.cumGas)} Mcf`,
  },
  {
    label: "Leases on Record",
    value: (operator) => formatCount(operator.leases),
  },
  {
    label: "Active Leases",
    value: (operator) => formatCount(operator.activeLeases),
  },
  {
    label: "Producing Counties",
    value: (operator) => String(operator.counties),
  },
  {
    label: "Latest Production Date",
    value: (operator) => operator.productionEnd,
  },
  {
    label: "Average Production Range",
    value: (operator) =>
      `${shortMonth(operator.productionStart)} – ${shortMonth(operator.productionEnd)}`,
  },
];
