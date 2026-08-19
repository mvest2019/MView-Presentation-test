/**
 * Compare Operator Statistics — the arithmetic and the table shapes, with no
 * React in it.
 *
 * Every figure the page prints is derived here: the oil/gas split, production per
 * lease, year-over-year, who leads each metric, and the four comparison matrices
 * row by row. Keeping it pure means the numbers can be checked without rendering,
 * and it is the layer that changes when a real endpoint replaces the fixture.
 *
 * THE SEAM, NOW THAT THE ENDPOINTS EXIST. The picker searches
 * `/api/operators/names`, and the whole selection is read in one call through
 * `/api/operators/compare`; `toStatisticsOperatorFromApi` turns one such record into
 * the `StatisticsOperator` every block below already took. So the fetching lives in
 * `operator-compare-api.ts`, this file stayed pure, and none of the matrices,
 * leaders or trend cards changed at all.
 *
 * The fixture is down to one job: `exampleSelection()` names the four operators the
 * "Try an example" button seeds. Their figures are fetched like any other.
 *
 * WHY CELLS ARE DESCRIBED, NOT RENDERED. A matrix cell is not always a string —
 * some carry a unit in smaller type, an activity pill, a trend arrow, or an em
 * dash for "no filed series". Returning a `MatrixCell` union rather than JSX keeps
 * this module free of React while still letting the table render each kind
 * correctly from one small switch.
 */

import {
  OPERATOR_STATISTICS_RECORDS,
  STATISTICS_TREND_YEARS,
} from "./operator-statistics-data";
import type { StatisticsOperatorData } from "./operator-statistics-shape";

export { STATISTICS_TREND_YEARS };
export type { StatisticsOperatorData } from "./operator-statistics-shape";
export {
  COMPARE_SLOT_COUNT,
  SLOT_COLORS,
  SLOT_LABELS,
} from "./operator-slot-colors";

/** The empty value for a slot — no operator chosen. */
export const NO_OPERATOR = "";

/** A comparison needs at least this many operators before results are shown. */
export const MIN_OPERATORS = 2;

/** The gas-to-oil ratio the regulator's BOE figures use throughout this project. */
const GAS_TO_OIL = 15;

/** A selected operator, with everything the page renders already computed. */
export interface StatisticsOperator {
  /**
   * 0–3, the picker position. It fixes the column order, and nothing else now: this
   * tool carries no per-operator colour, because its trend section is one chart per
   * operator rather than a shared axis needing a legend.
   */
  slot: number;
  /** Null when the source reports no statewide rank — see `StatisticsOperatorData`. */
  rank: number | null;
  /** Null when no detail-page slug is known; the profile link is dropped then. */
  slug: string | null;
  name: string;
  /** The name, shortened for tight cells and chips. */
  short: string;
  /** Two initials, for the tile when there is no logo. */
  monogram: string;
  /** Same-origin logo path, or null when the operator has none on file. */
  logoUrl: string | null;
  operatorNumber: string;
  boeTotal: number;
  oilTotal: number;
  gasTotal: number;
  leases: number;
  counties: number;
  headquarters: string | null;
  /** Most-active counties, title-cased, highest first. */
  topCounties: string[];
  /** Annual BOE for `STATISTICS_TREND_YEARS`, or null when none is filed. */
  trend: number[] | null;
  /** BOE in the latest trend year, or null without a series. */
  boeCurrent: number | null;
  /** BOE in the year before, or null. */
  boePrevious: number | null;
  /** Percentage change between those two, or null. */
  yearOverYear: number | null;
  /** Lifetime BOE per lease on record. */
  perLease: number;
  /** Oil's share of BOE, whole percent. */
  oilPct: number;
}

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */

/**
 * A raw volume as a compact label: `2.37B`, `299.9M`, `4,547K`, `812`. The
 * design's `fmtBM` — the same thresholds, so every figure on the page reads at the
 * magnitude it was reviewed at.
 */
export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3)
    return `${Math.round(value / 1e3).toLocaleString("en-US")}K`;
  return String(Math.round(value));
}

/** Thousands separators, en-US, matching the rest of the site. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** `MIDLAND` -> `Midland`. County names arrive from the regulator in caps. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

/**
 * Initials of the first two words — the logo tile's content.
 *
 * Derived from the name rather than waiting for the comparison, so a slot shows its
 * tile the moment an operator is picked instead of a second later.
 */
export function monogramOf(name: string): string {
  const words = name.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * The name, shortened. Long registered names ("Kinder Morgan Production Co, LLC")
 * break a table header or a chip, so past 24 characters it is cut at a word or
 * comma boundary and elided — the design's `csShort`.
 */
function shortName(name: string): string {
  if (name.length <= 24) return name;
  return `${name.slice(0, 22).replace(/[ ,]+$/, "")}…`;
}

/**
 * The design's "Try an example" selection: the first, second, third and fifth
 * ranked operators. Fifth rather than fourth so the example is not simply the top
 * four, which would make the picker look like it had done nothing.
 *
 * IT SEEDS NAMES, NOT FIGURES. Which four operators make a good demonstration is a
 * curated product choice, and it is the one thing the fixture is still good for.
 * Every number that appears afterwards is fetched for these names like any other
 * selection — the example chooses who to compare, not what the comparison says.
 */
export function exampleSelection(): string[] {
  return [0, 1, 2, 4].map(
    (index) => OPERATOR_STATISTICS_RECORDS[index]?.name ?? NO_OPERATOR,
  );
}

/** Four empty slots. */
export function emptySelection(): string[] {
  return [NO_OPERATOR, NO_OPERATOR, NO_OPERATOR, NO_OPERATOR];
}

/**
 * Turn one fetched operator into the shape every block on the page renders.
 *
 * THE SEAM between the API and the view. `StatisticsOperatorData` carries only what
 * the endpoints know; the four derived figures are computed here, once per
 * operator, rather than in a component that would redo them on every render — and
 * rather than on the wire, where a derived value would be cached as though it were
 * data.
 *
 * Slot numbers are the *picker* positions, so an operator in slot D keeps slot D's
 * colour even when C is empty.
 */
export function toStatisticsOperatorFromApi(
  data: StatisticsOperatorData,
  slot: number,
): StatisticsOperator {
  const current = data.boeCurrent;
  const previous = data.boePrevious;

  return {
    slot,
    rank: data.rank,
    slug: data.slug,
    name: data.name,
    short: shortName(data.name),
    monogram: data.monogram,
    logoUrl: data.logoUrl,
    operatorNumber: data.operatorNumber,
    boeTotal: data.boeTotal,
    oilTotal: data.oilTotal,
    gasTotal: data.gasTotal,
    leases: data.leases,
    counties: data.counties,
    headquarters: data.headquarters,
    topCounties: data.topCounties.map(titleCase),
    trend: data.trend,
    boeCurrent: current,
    boePrevious: previous,
    yearOverYear:
      current !== null && previous !== null && previous !== 0
        ? ((current - previous) / previous) * 100
        : null,
    perLease: data.leases > 0 ? data.boeTotal / data.leases : 0,
    // Oil's share of BOE, from the raw volumes rather than from `boeTotal`, so the
    // 15:1 conversion is applied once and visibly.
    oilPct:
      data.oilTotal + data.gasTotal / GAS_TO_OIL > 0
        ? Math.round(
            (data.oilTotal / (data.oilTotal + data.gasTotal / GAS_TO_OIL)) *
              100,
          )
        : 0,
  };
}

/* --------------------------------------------------------------------------
   Who leads what
   -------------------------------------------------------------------------- */

/** The highest scorer and its position in the given order. -1 when all score 0. */
function leaderBy(
  operators: StatisticsOperator[],
  score: (operator: StatisticsOperator) => number | null,
): { operator: StatisticsOperator; index: number } | null {
  let best: { operator: StatisticsOperator; index: number } | null = null;
  let bestScore = -Infinity;

  operators.forEach((operator, index) => {
    const value = score(operator);
    if (value === null || value <= 0) return;
    if (value > bestScore) {
      bestScore = value;
      best = { operator, index };
    }
  });

  return best;
}

/** Position of the highest scorer, or -1 when nothing qualifies. */
function bestIndex(
  operators: StatisticsOperator[],
  score: (operator: StatisticsOperator) => number | null,
): number {
  return leaderBy(operators, score)?.index ?? -1;
}

export interface StatisticsLeaders {
  topProducer: StatisticsOperator;
  mostLeases: StatisticsOperator;
  widestFootprint: StatisticsOperator;
  mostOilWeighted: StatisticsOperator;
  /** Sum across the selection. */
  combinedBoe: number;
  combinedLeases: number;
  combinedCounties: number;
  averageBoe: number;
}

/**
 * The leaders and the combined totals, computed once and shared by the KPI strip,
 * the leader cards and the production caption, so the three cannot disagree.
 * Returns null for an empty selection rather than inventing a winner.
 */
export function findStatisticsLeaders(
  operators: StatisticsOperator[],
): StatisticsLeaders | null {
  const topProducer = leaderBy(operators, (o) => o.boeTotal)?.operator;
  const mostLeases = leaderBy(operators, (o) => o.leases)?.operator;
  const widestFootprint = leaderBy(operators, (o) => o.counties)?.operator;
  const mostOilWeighted = leaderBy(operators, (o) => o.oilPct)?.operator;

  if (!topProducer || !mostLeases || !widestFootprint || !mostOilWeighted) {
    return null;
  }

  const combinedBoe = operators.reduce((sum, o) => sum + o.boeTotal, 0);

  return {
    topProducer,
    mostLeases,
    widestFootprint,
    mostOilWeighted,
    combinedBoe,
    combinedLeases: operators.reduce((sum, o) => sum + o.leases, 0),
    combinedCounties: operators.reduce((sum, o) => sum + o.counties, 0),
    averageBoe: operators.length > 0 ? combinedBoe / operators.length : 0,
  };
}

/* --------------------------------------------------------------------------
   Comparison matrices
   -------------------------------------------------------------------------- */

/** One cell of a comparison matrix, described rather than rendered. */
export type MatrixCell =
  /** Plain text. */
  | { kind: "text"; value: string }
  /** A figure with its unit in smaller type — `299.9M bbl`. */
  | { kind: "value"; value: string; unit?: string; strong?: boolean }
  /** No filed data. Rendered as a muted em dash — not as a zero. */
  | { kind: "missing" }
  /** The activity pill. */
  | { kind: "status"; active: boolean }
  /** A year-over-year arrow, or "—" when there is no series to compare. */
  | { kind: "delta"; percent: number | null };

export type MatrixRow =
  | {
      kind: "metric";
      label: string;
      /** One per operator, in the given order. */
      cells: MatrixCell[];
      /** Index of the leading cell, or -1 when the row has no "best". */
      bestIndex: number;
    }
  /** A section heading inside the full matrix. */
  | { kind: "group"; label: string };

function volumeCell(
  value: number | null,
  unit?: string,
  strong = false,
): MatrixCell {
  if (value === null) return { kind: "missing" };
  return { kind: "value", value: formatVolume(value), unit, strong };
}

function metricRow(
  label: string,
  operators: StatisticsOperator[],
  cell: (operator: StatisticsOperator) => MatrixCell,
  score?: (operator: StatisticsOperator) => number | null,
): MatrixRow {
  return {
    kind: "metric",
    label,
    cells: operators.map(cell),
    bestIndex: score ? bestIndex(operators, score) : -1,
  };
}

/** "Company information" — registration and footprint. */
export function buildCompanyRows(operators: StatisticsOperator[]): MatrixRow[] {
  return [
    metricRow("Headquarters", operators, (o) =>
      o.headquarters
        ? { kind: "text", value: o.headquarters }
        : { kind: "missing" },
    ),
    metricRow("Operator no.", operators, (o) => ({
      kind: "text",
      value: o.operatorNumber,
    })),
    metricRow(
      "Leases on record",
      operators,
      (o) => ({ kind: "value", value: formatCount(o.leases) }),
      (o) => o.leases,
    ),
    metricRow(
      "Producing counties",
      operators,
      (o) => ({ kind: "value", value: String(o.counties) }),
      (o) => o.counties,
    ),
    metricRow("Most active", operators, (o) =>
      o.topCounties.length > 0
        ? { kind: "text", value: o.topCounties.join(", ") }
        : { kind: "missing" },
    ),
    metricRow(
      "Production per lease",
      operators,
      (o) => volumeCell(o.perLease, "BOE"),
      (o) => o.perLease,
    ),
    // Every operator in this extract is one the directory reports as active; the
    // row exists because the design shows it, and it will carry real per-operator
    // status the moment the endpoint supplies one.
    metricRow("Activity status", operators, () => ({
      kind: "status",
      active: true,
    })),
  ];
}

/** "Production metrics" — reported volumes. */
export function buildProductionRows(
  operators: StatisticsOperator[],
): MatrixRow[] {
  const years = STATISTICS_TREND_YEARS;
  const latest = years.at(-1);
  const prior = years.at(-2);

  return [
    metricRow(
      "Oil produced",
      operators,
      (o) => volumeCell(o.oilTotal, "bbl"),
      (o) => o.oilTotal,
    ),
    metricRow(
      "Gas produced",
      operators,
      (o) => volumeCell(o.gasTotal, "Mcf"),
      (o) => o.gasTotal,
    ),
    metricRow(
      "Oil share of BOE",
      operators,
      (o) => ({ kind: "value", value: `${o.oilPct}%` }),
      (o) => o.oilPct,
    ),
    metricRow(
      `Total BOE (${GAS_TO_OIL}:1)`,
      operators,
      (o) => volumeCell(o.boeTotal, "BOE", true),
      (o) => o.boeTotal,
    ),
    metricRow(
      `BOE — ${latest}`,
      operators,
      (o) => volumeCell(o.boeCurrent),
      (o) => o.boeCurrent,
    ),
    metricRow(
      `BOE — ${prior}`,
      operators,
      (o) => volumeCell(o.boePrevious),
      (o) => o.boePrevious,
    ),
    metricRow("Year over year", operators, (o) => ({
      kind: "delta",
      percent: o.yearOverYear,
    })),
  ];
}

/**
 * "Historical production trends" — one row per year, latest first. The best cell
 * is the highest filed figure for that year; a year where nobody has a series has
 * no best rather than an arbitrary one.
 */
export function buildTrendRows(operators: StatisticsOperator[]): MatrixRow[] {
  const years = [...STATISTICS_TREND_YEARS];
  const latest = years.at(-1);

  return years
    .map((year, yearIndex) => ({ year, yearIndex }))
    .reverse()
    .map(({ year, yearIndex }) =>
      metricRow(
        // The latest year is partial — labelling it plainly stops a reader taking
        // a part-year figure for a decline.
        year === latest ? `${year} (to date)` : String(year),
        operators,
        (o) => volumeCell(o.trend?.[yearIndex] ?? null),
        (o) => o.trend?.[yearIndex] ?? null,
      ),
    );
}

/** The collapsible matrix — both blocks above, under group headings. */
export function buildFullMatrixRows(
  operators: StatisticsOperator[],
): MatrixRow[] {
  return [
    { kind: "group", label: "Company information" },
    ...buildCompanyRows(operators).filter(
      (row) => row.kind !== "metric" || row.label !== "Activity status",
    ),
    { kind: "group", label: "Production metrics" },
    ...buildProductionRows(operators),
    metricRow("Activity status", operators, () => ({
      kind: "status",
      active: true,
    })),
  ];
}

/* --------------------------------------------------------------------------
   CSV export
   -------------------------------------------------------------------------- */

/**
 * The export as rows of plain values — metric name first, then one column per
 * operator. Raw numbers rather than the formatted labels, because a spreadsheet
 * should be able to sum a column; the page keeps the formatting.
 *
 * Returned as a matrix rather than a string so the quoting lives in one place and
 * the component only has to join it.
 */
export function buildStatisticsCsvRows(
  operators: StatisticsOperator[],
): string[][] {
  const rows: string[][] = [
    ["Metric", ...operators.map((o) => o.name)],
    ["Statewide rank", ...operators.map((o) => String(o.rank))],
    ["Operator no.", ...operators.map((o) => o.operatorNumber)],
    ["Headquarters", ...operators.map((o) => o.headquarters ?? "")],
    ["Leases", ...operators.map((o) => String(o.leases))],
    ["Producing counties", ...operators.map((o) => String(o.counties))],
    ["Most active", ...operators.map((o) => o.topCounties.join(" / "))],
    ["Oil (bbl)", ...operators.map((o) => String(o.oilTotal))],
    ["Gas (Mcf)", ...operators.map((o) => String(o.gasTotal))],
    ["Oil share %", ...operators.map((o) => String(o.oilPct))],
    ["Total BOE", ...operators.map((o) => String(o.boeTotal))],
    [
      "Production per lease (BOE)",
      ...operators.map((o) => o.perLease.toFixed(0)),
    ],
  ];

  STATISTICS_TREND_YEARS.forEach((year, index) => {
    rows.push([
      `BOE ${year}`,
      ...operators.map((o) => (o.trend ? String(o.trend[index] ?? "") : "")),
    ]);
  });

  rows.push([
    "Year over year %",
    ...operators.map((o) =>
      o.yearOverYear === null ? "" : o.yearOverYear.toFixed(1),
    ),
  ]);

  return rows;
}

/** RFC 4180 quoting: wrap every field, double any embedded quote. */
export function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row.map((field) => `"${field.replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
}
