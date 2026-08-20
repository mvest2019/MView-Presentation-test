/**
 * Operator Detail — resolving a slug into a page, and every derived figure, with
 * no React in it.
 *
 * THE SEAM. The route calls `findOperatorDetail(slug)` and nothing else. When an
 * endpoint exists that becomes one async read and the shape above it does not
 * change: `OperatorDetail` is already the view model, and the `has*` flags are
 * already how the page decides what to render.
 *
 * WHY THE FLAGS EXIST. Ten candidate detail endpoints all answer 404, so this page
 * is fixture-backed, and the fixture does not describe every operator equally:
 *
 *   identity, address, volumes, peers   30 operators
 *   annual production series             8 operators
 *   per-county production, leases        1 operator
 *   condition / what-changed blocks      1 operator, and hardcoded even there
 *
 * Rather than invent the difference, each section asks whether its own data exists.
 * That is the whole reason a detail page for operator #27 looks thinner than
 * Pioneer's: it is thinner because the record is.
 */

import { titleCase } from "./text-case";
import {
  COMPARE_YEARS,
  OPERATOR_COMPARE_RECORDS,
  type OperatorCompareYear,
} from "./operator-compare-data";
import {
  OPERATOR_CHANGE_ROWS,
  OPERATOR_CONDITION_CARDS,
  OPERATOR_COUNTY_ROWS,
  OPERATOR_ILLUSTRATIVE_NOTE,
  OPERATOR_LEASES,
  type ChangeRow,
  type ConditionCard,
  type OperatorCountyRow,
  type OperatorLeaseRow,
} from "./operator-detail-data";
import type {
  OperatorCondition,
  OperatorDetailsResponse,
} from "./operator-details-api";
import { OPERATOR_STATISTICS_RECORDS } from "./operator-statistics-data";

export { COMPARE_YEARS, OPERATOR_ILLUSTRATIVE_NOTE };
export type {
  ChangeRow,
  ConditionCard,
  OperatorCountyRow,
  OperatorLeaseRow,
  OperatorCompareYear,
};

/** How many peer cards the "Related operators" band shows. */
const PEER_COUNT = 4;

export interface OperatorDetail {
  slug: string;
  name: string;
  /** The regulator's upper-case filed name. */
  filedName: string;
  operatorNumber: string;
  /** Two initials, for the logo tile. */
  monogram: string;
  /** Position in the statewide production ranking. */
  rank: number;
  /** RRC P-5 physical address, or null. */
  headquarters: string | null;
  /** `Irving, TX 75038` — the tail of the address, for the compact row. */
  location: string | null;
  /** Most-active counties, title-cased. */
  topCounties: string[];
  leases: number;
  counties: number;
  /** Lifetime barrels of oil equivalent, 15:1. */
  boeTotal: number;
  oilTotal: number;
  gasTotal: number;
  /** Oil's share of BOE, whole percent. */
  oilPct: number;

  /** Annual oil/gas/BOE, or null when no series is filed for this operator. */
  series: readonly OperatorCompareYear[] | null;
  /** Per-county production, BOE descending, or empty. */
  countyRows: readonly OperatorCountyRow[];
  /** Leases on record, lifetime oil descending, or empty. */
  leaseRows: readonly OperatorLeaseRow[];
  /** The prototype's hardcoded blocks — present only for the operator they describe. */
  conditionCards: readonly ConditionCard[];
  changeRows: readonly ChangeRow[];
  /** Peer operators, for the closing band. */
  peers: readonly OperatorPeer[];

  /* ---- filled by `mergeOperatorDetails` from the live endpoint ---- */
  /** `active` / `inactive`, from the API rather than assumed. */
  status: string;
  /** RRC P-5 phone, or null when the API has none. */
  contactNumber: string | null;
  /** First and last month the operator reported production. */
  firstProduction: string | null;
  lastProduction: string | null;
  /** Marketing alias, for the page title and canonical. */
  seoName: string | null;
  seoUrl: string | null;
  /**
   * Volumes exactly as the API formats them, units included
   * (`"1,907,873.826 (MBBL)"`). Printed verbatim — re-deriving them from the raw
   * fixture totals is how the page and the API start disagreeing.
   */
  oilProduced: string | null;
  gasProduced: string | null;
  boeProduced: string | null;
  currentYearBoe: string | null;
  previousYearBoe: string | null;
  /** Every county the operator reports in, upper case, for the map's active set. */
  activeCounties: readonly string[];
  /** Date the condition block was computed, for the section's own note. */
  conditionAsOf: string | null;
}

export interface OperatorPeer {
  slug: string;
  /** First segment of the name, so a card is not overrun by ", LLC". */
  shortName: string;
  monogram: string;
  boeTotal: number;
}

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */

/** `2.37B`, `299.9M`, `4,547K`, `812` — the prototype's `odFmt`. */
export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3).toLocaleString("en-US")}K`;
  return String(Math.round(value));
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/* `titleCase` moved to `./text-case` so client components can import it without
   pulling this module's fixture tables into the browser bundle. Re-exported here,
   unchanged, so every existing caller keeps working. */
export { titleCase };

function monogramOf(filedName: string): string {
  const words = filedName.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * `777 Hidden Ridge, Irving, TX 75038` -> `Irving, TX 75038`.
 *
 * The last two comma-separated parts, because the regulator's address format puts
 * city and state-with-ZIP there. Returns null rather than guessing when the value
 * has no comma to split on.
 */
function locationOf(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length < 2) return null;
  return parts.slice(-2).join(", ");
}

/* --------------------------------------------------------------------------
   Resolving a slug
   -------------------------------------------------------------------------- */

/** Every slug with a page, for `generateStaticParams`. */
export function listOperatorDetailSlugs(): string[] {
  return OPERATOR_STATISTICS_RECORDS.map((record) => record.slug);
}

/**
 * The detail-page slug for an operator number, or null when this site has no page
 * for it.
 *
 * WHY IT HAS TO BE ASKED. The route is prerendered from `listOperatorDetailSlugs()`,
 * so a slug outside that set 404s. Related operators arrive from the API as numbers,
 * and several of them have no page here — a card for one must render as plain text
 * rather than as a link into nothing. Guessing a slug from the name would 404 just
 * as reliably, only less visibly.
 */
export function detailSlugForNumber(operatorNumber: string): string | null {
  return (
    OPERATOR_STATISTICS_RECORDS.find(
      (record) => record.operatorNumber === operatorNumber,
    )?.slug ?? null
  );
}

/**
 * The operator a URL names, or null when the slug matches nothing — which the
 * route turns into a 404 rather than an empty page. Slugs are the API's own
 * `operator_name_url`, so they are what the listing table already links to.
 */
export function findOperatorDetail(slug: string): OperatorDetail | null {
  const record = OPERATOR_STATISTICS_RECORDS.find((item) => item.slug === slug);
  if (!record) return null;

  const compare = OPERATOR_COMPARE_RECORDS.find(
    (item) => item.operatorNumber === record.operatorNumber,
  );

  const denominator = record.oilTotal + record.gasTotal / 15;

  return {
    slug: record.slug,
    name: record.name,
    filedName: record.filedName,
    operatorNumber: record.operatorNumber,
    monogram: monogramOf(record.filedName),
    rank: record.rank,
    headquarters: record.headquarters,
    location: locationOf(record.headquarters),
    topCounties: record.topCounties.map(titleCase),
    leases: record.leases,
    counties: record.counties,
    boeTotal: record.boeTotal,
    oilTotal: record.oilTotal,
    gasTotal: record.gasTotal,
    oilPct:
      denominator > 0 ? Math.round((record.oilTotal / denominator) * 100) : 0,

    series: compare?.series ?? null,
    countyRows: OPERATOR_COUNTY_ROWS[record.operatorNumber] ?? [],
    leaseRows: OPERATOR_LEASES[record.operatorNumber] ?? [],
    conditionCards: OPERATOR_CONDITION_CARDS[record.operatorNumber] ?? [],
    changeRows: OPERATOR_CHANGE_ROWS[record.operatorNumber] ?? [],
    // Nulls, not guesses. Everything below comes from the live endpoint; a page
    // rendered without it simply omits those rows rather than showing stale values.
    status: "active",
    contactNumber: null,
    firstProduction: null,
    lastProduction: null,
    seoName: null,
    seoUrl: null,
    oilProduced: null,
    gasProduced: null,
    boeProduced: null,
    currentYearBoe: null,
    previousYearBoe: null,
    activeCounties: [],
    conditionAsOf: null,
    peers: OPERATOR_STATISTICS_RECORDS.filter(
      (item) => item.operatorNumber !== record.operatorNumber,
    )
      .slice(0, PEER_COUNT)
      .map((item) => ({
        slug: item.slug,
        shortName: item.name.split(",")[0] ?? item.name,
        monogram: monogramOf(item.filedName),
        boeTotal: item.boeTotal,
      })),
  };
}

/* --------------------------------------------------------------------------
   Derived views
   -------------------------------------------------------------------------- */

export type ProductionMetric = "oil" | "gas" | "boe";

/** The choropleth's value for a county, by metric. */
export function countyValue(
  row: OperatorCountyRow,
  metric: ProductionMetric,
): number {
  return metric === "oil" ? row.oil : metric === "gas" ? row.gas : row.boe;
}

/**
 * The prototype's shading buckets, ported exactly.
 *
 * `sqrt(v / max)` rather than the raw ratio, with its thresholds. County production
 * is heavily skewed — Midland alone is twice the next county — so a linear scale
 * puts almost every county in the palest band. The square root spreads the middle so
 * mid-sized counties actually read as mid-green.
 */
const BUCKET_STOPS = [0.82, 0.6, 0.4, 0.22] as const;

/** 0 for no production, then 1–5 darkening with the square root of the share. */
export function countyBucket(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  const t = Math.sqrt(value / max);
  if (t >= BUCKET_STOPS[0]) return 5;
  if (t >= BUCKET_STOPS[1]) return 4;
  if (t >= BUCKET_STOPS[2]) return 3;
  if (t >= BUCKET_STOPS[3]) return 2;
  return 1;
}

export interface CountyShading {
  /** Upper-case county name -> bucket 0–5, per metric. */
  oil: Record<string, number>;
  gas: Record<string, number>;
  /** The largest county value for each metric, for the legend. */
  max: { oil: number; gas: number };
}

/**
 * Both metrics' buckets computed once, server-side.
 *
 * Doing it here rather than in the map lets the SVG be server-rendered with each
 * county's oil AND gas shade already on it, so switching metric is a class change
 * on the container instead of a re-render — no geometry crosses into the client.
 */
export function buildCountyShading(
  rows: readonly OperatorCountyRow[],
): CountyShading {
  const max = {
    oil: rows.reduce((top, row) => Math.max(top, row.oil), 0),
    gas: rows.reduce((top, row) => Math.max(top, row.gas), 0),
  };

  const oil: Record<string, number> = {};
  const gas: Record<string, number> = {};
  for (const row of rows) {
    oil[row.county.toUpperCase()] = countyBucket(row.oil, max.oil);
    gas[row.county.toUpperCase()] = countyBucket(row.gas, max.gas);
  }

  return { oil, gas, max };
}

/** Totals for the "Production over time" summary cards, over a year window. */
export interface SeriesSummary {
  years: number[];
  oil: number;
  gas: number;
  boe: number;
  /** Percentage change in BOE from the first year in the window to the last. */
  change: number | null;
}

export function summariseSeries(
  series: readonly OperatorCompareYear[],
  fromYear: number,
): SeriesSummary {
  const window = series.filter((entry) => entry.year >= fromYear);
  const first = window[0];
  const last = window.at(-1);

  return {
    years: window.map((entry) => entry.year),
    oil: window.reduce((sum, entry) => sum + entry.oil, 0),
    gas: window.reduce((sum, entry) => sum + entry.gas, 0),
    boe: window.reduce((sum, entry) => sum + entry.boe, 0),
    change:
      first && last && first.boe > 0
        ? ((last.boe - first.boe) / first.boe) * 100
        : null,
  };
}

/** The year-range choices the select offers, widest first. */
export function yearRangeOptions(
  series: readonly OperatorCompareYear[],
): { from: number; label: string }[] {
  const years = series.map((entry) => entry.year);
  const first = years[0];
  const last = years.at(-1);
  if (first === undefined || last === undefined) return [];

  const spans = [years.length, 5, 3].filter(
    (span, index, all) => span <= years.length && all.indexOf(span) === index,
  );

  return spans.map((span) => {
    const from = last - span + 1;
    return { from, label: `${from}–${last} · ${span} yrs` };
  });
}

/* --------------------------------------------------------------------------
   Per-lease wells
   -------------------------------------------------------------------------- */

/**
 * The wells on a lease.
 *
 * THESE ARE GENERATED, NOT FILED, and that is the prototype's design rather than a
 * shortcut here: `odLeaseWells()` seeds an LCG from the lease number and name, then
 * derives a plausible two-to-five-well breakdown, splitting the lease's REAL
 * lifetime oil and gas across them. Only the split is real. API numbers, statuses
 * and first-production dates are invented, and an API-14 is a real regulatory
 * identifier — so the table carries a visible notice saying so (Akshay asked for the
 * drilldown on 2026-08-13 after that was raised twice; this is that decision, not an
 * oversight).
 *
 * It is ported exactly, including the hash and the LCG constants, for two reasons:
 * the same lease must show the same wells as the prototype it was signed off
 * against, and being deterministic means the server render and the client render
 * agree — a `Math.random()` version would hydrate mismatched.
 */

/** FNV-1a, the prototype's `odHash`. */
function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Weighted so "Producing" is the common case, as the prototype has it. */
const WELL_STATUSES = [
  ["Producing", "prod"],
  ["Producing", "prod"],
  ["Producing", "prod"],
  ["First prod", "first"],
  ["Completed (DUC)", "duc"],
  ["Inactive", "inact"],
  ["Permitted", "perm"],
] as const;

export interface LeaseWell {
  api: string;
  name: string;
  status: string;
  statusKind: string;
  county: string;
  /** Barrels — a real share of the lease's filed total. */
  oil: number;
  /** Mcf — likewise. */
  gas: number;
  firstProduction: string;
}

export function leaseWells(lease: OperatorLeaseRow): LeaseWell[] {
  let seed = hashSeed(`${lease.number}|${lease.name}`) || 1;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const count = 2 + Math.floor(random() * 4);
  const weights: number[] = [];
  let weightSum = 0;
  for (let index = 0; index < count; index += 1) {
    const weight = 0.6 + random();
    weights.push(weight);
    weightSum += weight;
  }

  const countyCode = `00${1 + Math.floor(random() * 498)}`.slice(-3);
  const wells: LeaseWell[] = [];
  let oilLeft = lease.oil;
  let gasLeft = lease.gas;

  for (let index = 0; index < count; index += 1) {
    const share = (weights[index] ?? 0) / weightSum;
    // The last well takes the remainder so the parts always sum to the filed total.
    const oil = index === count - 1 ? oilLeft : Math.round(lease.oil * share);
    const gas = index === count - 1 ? gasLeft : Math.round(lease.gas * share);
    oilLeft -= oil;
    gasLeft -= gas;

    const status = WELL_STATUSES[Math.floor(random() * WELL_STATUSES.length)] ?? WELL_STATUSES[0];
    const api = `42-${countyCode}-${`0000${30000 + Math.floor(random() * 19999)}`.slice(-5)}`;
    const year = 2009 + Math.floor(random() * 17);
    const month = 1 + Math.floor(random() * 12);

    wells.push({
      api,
      name: `${titleCase(lease.name)} ${index + 1}H`,
      status: status[0],
      statusKind: status[1],
      county: titleCase(lease.county),
      oil: Math.max(0, oil),
      gas: Math.max(0, gas),
      firstProduction:
        status[1] === "perm" || status[1] === "duc"
          ? "—"
          : `${MONTHS[month - 1]} ${year}`,
    });
  }

  return wells;
}

/* --------------------------------------------------------------------------
   Live API data, merged over the fixture
   -------------------------------------------------------------------------- */

/**
 * Fold a `/operators/details` response over a fixture-built detail.
 *
 * THE API WINS on everything it carries, because it is live and the fixture is a
 * snapshot. The two already disagree — the endpoint reports 10,324 leases for
 * Pioneer where the fixture says 10,264 — and the live figure is the correct one.
 * The fixture is left owning only what the endpoint does not return: the ten-year
 * series, the per-county breakdown, the lease rows, the peer list and the
 * "what changed" narrative.
 *
 * `counties` becomes the length of the API's own county array rather than a stored
 * count, so the hero pill, the panel row and the map caption cannot drift apart.
 *
 * A null response returns `base` untouched: the page then renders from the fixture
 * with the API-only rows absent, which is a thinner page rather than a broken one.
 */
export function mergeOperatorDetails(
  base: OperatorDetail,
  response: OperatorDetailsResponse | null,
): OperatorDetail {
  const record = response?.operator_details[0];
  if (!record) return base;

  return {
    ...base,
    name: record.cleaned_operator_name || base.name,
    filedName: record.OperatorName || base.filedName,
    operatorNumber: record.OperatorNo || base.operatorNumber,
    rank: record.statewide_rank ?? base.rank,
    status: record.status || base.status,
    leases: record.leaseCount ?? base.leases,
    counties: record.counties?.length ?? base.counties,
    headquarters: record.operator_address || base.headquarters,
    location: record.operator_location || base.location,
    contactNumber: record.operator_contact_no || null,
    firstProduction: record.start_productiondate || null,
    lastProduction: record.end_productiondate || null,
    seoName: record.seo_operator_name ?? null,
    seoUrl: record.seo_operator_url ?? null,
    oilProduced: record.Totaloilproduction || null,
    gasProduced: record.Totalgasproduction || null,
    boeProduced: record.TotalBOEproduction || null,
    currentYearBoe: record.Current_Year_BOE_Prod || null,
    previousYearBoe: record.Previous_Year_BOE_Prod || null,
    topCounties:
      (record.top_producing_counties?.length ?? 0) > 0
        ? record.top_producing_counties.map((entry) => titleCase(entry.county))
        : base.topCounties,
    activeCounties: record.counties?.map((entry) => entry.county) ?? [],
    conditionCards: buildConditionCards(response?.operator_condition),
    conditionAsOf: response?.operator_condition?.as_of ?? null,
  };
}

/**
 * The four condition cards, built from the API's measured blocks.
 *
 * NO OPERATOR GATING. These used to be hardcoded literals keyed to one operator,
 * so every other profile rendered the section empty. The endpoint returns the block
 * for every operator — verified across ten, with distinct values — so the gate is
 * gone and each profile shows its own figures.
 *
 * WHAT IS OMITTED RATHER THAN DERIVED. The design puts a twelve-month change chip on
 * the producing-leases card, and `producing_leases` carries only `count` and
 * `total_leases`. That chip is left off. `completions_90d` does have
 * `change_vs_prior_quarter` but no matching direction field, so the arrow comes from
 * that number's own sign — reading the value, not inventing one.
 */
function buildConditionCards(
  condition: OperatorCondition | undefined,
): ConditionCard[] {
  if (!condition) return [];

  const latest = condition.latest_monthly_boe;
  const leases = condition.producing_leases;
  const permits = condition.new_permits_90d;
  const completions = condition.completions_90d;

  const signed = (value: number) =>
    `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;

  return [
    {
      label: "Latest monthly BOE",
      value: latest.mmboe.toFixed(1),
      unit: "MMBOE",
      direction: latest.mom.direction,
      delta: `${Math.abs(latest.mom.change_percent).toFixed(1)}%`,
      window: "MoM",
      foot: `vs ${latest.yoy.month_label}: ${signed(latest.yoy.change_percent)}`,
      icon: "production",
    },
    {
      label: "Producing leases",
      value: formatCount(leases.count),
      foot: `of ${formatCount(leases.total_leases)} on record`,
      icon: "leases",
    },
    {
      label: "New permits · 90d",
      value: formatCount(permits.count),
      direction: permits.direction,
      delta: formatCount(Math.abs(permits.change)),
      window: "vs prior qtr",
      foot: `365d: ${formatCount(permits.count_365d)}`,
      icon: "permits",
    },
    {
      label: "Completions · 90d",
      value: formatCount(completions.count),
      direction: completions.change_vs_prior_quarter >= 0 ? "up" : "down",
      delta: formatCount(Math.abs(completions.change_vs_prior_quarter)),
      window: "vs prior qtr",
      foot: `${formatCount(completions.producing_count)} to first prod.`,
      icon: "completions",
    },
  ];
}
