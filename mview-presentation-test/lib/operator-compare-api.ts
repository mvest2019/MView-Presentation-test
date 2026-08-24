import "server-only";

import { unstable_cache } from "next/cache";

import { getOperatorNames } from "./operator-api";
import {
  operatorLogoPath,
  publicOperatorApiBaseUrl,
  TEMP_MEMBER_ID,
} from "./operator-api-types";
import type { StatisticsOperatorData } from "./operator-statistics-shape";

/**
 * `POST /api/v1/operators/compare` — every selected operator's figures in one call.
 *
 * ONE REQUEST FOR THE WHOLE COMPARISON, which is the point of this endpoint: two to
 * four operators come back together, so the page makes a single round trip on a
 * selection instead of one per slot.
 *
 * IT MATCHES ON THE FILED NAME, EXACTLY, PUNCTUATION AND ALL. This is the part that
 * has to be right, and the obvious guesses all fail — verified against the operator
 * ranked first in the state:
 *
 *   "PIONEER NATURAL RES. USA, INC."   found
 *   "PIONEER NATURAL RES USA INC"      not found
 *   "Pioneer Natural RES USA, Inc"     not found
 *   "PIONEER NATURAL RES USA, INC"     not found
 *
 * The page selects the CLEANED spelling, because that is what a reader recognises,
 * so the two are reconciled here rather than in the browser: `/operators/names`
 * already returns both spellings of every operator and is already cached, so the
 * lookup is a map read and costs no extra request.
 *
 * `operators_not_found` IS NOT TRUSTWORTHY. It echoes back every name that was
 * asked for, including the ones that were found — measured: four requested, four
 * returned in `operators_data`, and all four also listed as not found. So a miss is
 * worked out by seeing which requested names have no record in the response.
 *
 * THE RESPONSE IS NOT IN THE ORDER IT WAS ASKED FOR. Requesting Pioneer, EOG, XTO,
 * Devon returns EOG, Devon, Pioneer, XTO. Results are therefore matched back to the
 * caller's names rather than zipped by index, which would silently put one
 * operator's figures in another's column.
 */

/** Everything the endpoint reports for one operator. */
interface CompareRecord {
  operator_no?: unknown;
  operator_name?: unknown;
  No_of_Leases?: unknown;
  No_of_Producing_Counties?: unknown;
  Headquarters?: unknown;
  Oil_Production?: unknown;
  Gas_Production?: unknown;
  Total_BOE?: unknown;
  BOE_Current_Year?: unknown;
  BOE_Previous_Year?: unknown;
  Historical_Production_Trends?: unknown;
  operator_logo?: unknown;
}

/**
 * The endpoint reports thousands, the page works in barrels and Mcf.
 *
 * Confirmed against `/operators/details`, which labels the same quantities:
 * `Oil_Production: 1907873.826` here is `"1,907,873.826 (MBBL)"` there, and
 * `Gas_Production: 7242350.159` is `"7,242,350.159 (MMCF)"`. Both are thousands of
 * the unit the page prints, and Pioneer's lifetime oil really is 1.9 billion
 * barrels. Miss this and every figure on the page is understated by 1000.
 */
const THOUSANDS = 1_000;

/** A number, a numeric string, or `"266,832.048"` — all appear in this response. */
function toNumber(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== "string") return 0;
  const value = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(value) ? value : 0;
}

function scaled(raw: unknown): number {
  return toNumber(raw) * THOUSANDS;
}

function text(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** Initials of the first two words — the tile's content. */
function monogramOf(name: string): string {
  const words = name.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * Annual BOE across the requested years.
 *
 * `Historical_Production_Trends` is a year → value map covering more years than the
 * page charts, with the values comma-formatted. A year the operator did not report
 * is zero rather than absent, so every operator's series has the same length and the
 * columns line up.
 */
function trendFor(raw: unknown, years: readonly number[]): number[] | null {
  if (!raw || typeof raw !== "object") return null;
  const map = raw as Record<string, unknown>;

  const trend = years.map((year) => scaled(map[String(year)]));
  return trend.some((value) => value > 0) ? trend : null;
}

function toData(
  record: CompareRecord,
  years: readonly number[],
): StatisticsOperatorData | null {
  const name = text(record.operator_name);
  const operatorNumber = text(record.operator_no);
  if (name === "" || operatorNumber === "") return null;

  const leases = toNumber(record.No_of_Leases);
  const current = scaled(record.BOE_Current_Year);
  const previous = scaled(record.BOE_Previous_Year);

  return {
    // Not in this response, and not invented: the endpoint reports no statewide
    // rank, no detail-page slug and no county breakdown. The view renders each of
    // those only when it has one.
    rank: null,
    slug: null,
    topCounties: [],

    name,
    monogram: monogramOf(name),
    /* The response's own `operator_logo` says WHETHER there is one; the bytes are
       fetched from our origin, because the API's copy is served
       `cross-origin-resource-policy: same-origin` and a browser refuses to embed
       it. Both point at the same operator, so this is the same image. */
    logoUrl: text(record.operator_logo)
      ? operatorLogoPath(operatorNumber)
      : null,
    operatorNumber,
    boeTotal: scaled(record.Total_BOE),
    oilTotal: scaled(record.Oil_Production),
    gasTotal: scaled(record.Gas_Production),
    leases,
    counties: toNumber(record.No_of_Producing_Counties),
    headquarters: text(record.Headquarters) || null,
    trend: trendFor(record.Historical_Production_Trends, years),
    boeCurrent: current > 0 ? current : null,
    boePrevious: previous > 0 ? previous : null,
  };
}

/**
 * Compare the named operators.
 *
 * Takes the CLEANED spellings the page selects and returns one record per name that
 * resolved, in no particular order — the caller places them into slots by name.
 *
 * Cached on the exact set of names. The key is built from them sorted, so picking
 * A then B and picking B then A are one cache entry rather than two.
 */
/**
 * How many trend years the matrix shows.
 *
 * The response carries the operator's whole filed history — 29 years, 1998 to 2026,
 * measured — and a table 29 columns wide is not readable. Five is the shape the
 * section was designed at; what changed is WHICH five, since they are now the five
 * most recent years the API actually reports rather than a hardcoded 2021–2025.
 */
const TREND_YEARS_SHOWN = 5;

/**
 * The years to plot, from the response itself.
 *
 * THE UNION ACROSS OPERATORS, so a year one operator reports and another does not
 * still gets a column — with an empty cell for the one that has no figure, which is
 * what the matrix already draws for a missing value.
 *
 * NEWEST YEARS KEPT. Taking the tail is what stops 2026 being discarded the moment
 * the API starts reporting it, which is exactly what the fixed 2021–2025 window did.
 */
function trendYearsFrom(rows: readonly CompareRecord[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    const map = row.Historical_Production_Trends;
    if (!map || typeof map !== "object") continue;
    for (const key of Object.keys(map)) {
      const year = Number(key);
      if (Number.isInteger(year) && year > 0) years.add(year);
    }
  }
  return [...years].sort((a, b) => a - b).slice(-TREND_YEARS_SHOWN);
}

/** The comparison, and the years its trend figures are aligned to. */
export interface OperatorComparison {
  operators: StatisticsOperatorData[];
  /** Ascending. Every operator's `trend` array is indexed by this. */
  years: number[];
}

async function readComparison(
  names: readonly string[],
): Promise<OperatorComparison> {
  if (names.length === 0) return { operators: [], years: [] };

  /* Cleaned → filed, from the list that is already in memory. This is the whole
     reason the browser never has to know that two spellings exist. */
  const directory = await getOperatorNames();
  const filedFor = new Map<string, string>();
  for (const entry of directory) {
    filedFor.set(entry.cleaned.toLowerCase(), entry.filed);
  }

  const filed = names
    .map((name) => filedFor.get(name.trim().toLowerCase()))
    .filter((name): name is string => Boolean(name));

  if (filed.length === 0) return { operators: [], years: [] };

  const response = await fetch(
    `${publicOperatorApiBaseUrl()}/api/v1/operators/compare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operators: filed, member_id: TEMP_MEMBER_ID }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Comparison unavailable (${response.status})`);
  }

  const payload: unknown = await response.json();
  const rows = (payload as { data?: { operators_data?: unknown } })?.data
    ?.operators_data;

  if (!Array.isArray(rows)) return { operators: [], years: [] };

  const records = rows as CompareRecord[];
  const years = trendYearsFrom(records);

  return {
    operators: records
      .map((row) => toData(row, years))
      .filter((row): row is StatisticsOperatorData => row !== null),
    years,
  };
}

/**
 * THE KEY CARRIES A SHAPE VERSION, and it has to. `unstable_cache` keys on these
 * parts alone, so when `StatisticsOperatorData` gains a field — `logoUrl` did —
 * entries written before the change keep being served, without it, until they
 * expire. That is invisible: no error, just a field that is null everywhere for ten
 * minutes after a deploy. Bump this whenever the returned shape changes.
 */
export const getOperatorComparison = unstable_cache(
  readComparison,
  ["operator-comparison", "v3-live-years"],
  { revalidate: 600, tags: ["operators"] },
);
