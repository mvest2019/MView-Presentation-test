/*
 * The insights response, in the shapes the panel draws.
 *
 * `/wells/{api}/insights` does the arithmetic and writes the notes, so nothing
 * here computes: it formats. Percentages arrive as fractions, volumes as raw
 * numbers, and the cohort charts need a share of the widest bar rather than an
 * absolute — that is the whole of what this file does.
 */

import {
  type MapInsightCohort,
  type MapInsightMetric,
  type MapWellInsights,
} from "@/lib/map-api";

/** How a decline row is drawn: a figure, its unit, and which way it points. */
export type DeclineRow = {
  label: string;
  value: string;
  unit: string;
  tone: "ink" | "up" | "down";
};

/** A bar in either comparison chart. */
export type CohortBar = {
  label: string;
  /** What the bar reads as. */
  display: string;
  /** 0–1, against the largest bar in the set. */
  share: number;
  /** "n = 430", under the bar. */
  count: string;
  /** True for the cohort this well falls in, which is marked. */
  isOwn: boolean;
};

const NUMBER = new Intl.NumberFormat("en-US");

/** `1803.57 → "1,804"`, and a dash where the service has nothing. */
function volume(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return NUMBER.format(Math.round(value));
}

/** `-0.147 → "−14.7%"`. The service sends fractions, not percentages. */
function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(1)}%`;
}

/** `6.99 → "7.0"` — months, where a whole number would overstate it. */
function months(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(1);
}

function formatMetric(metric: MapInsightMetric): DeclineRow {
  const isPercent = metric.unit === "pct";
  const isMonths = metric.unit === "months";
  const ratio = metric.unit === "MCF/BBL";

  const value = isPercent
    ? percent(metric.value)
    : isMonths
      ? months(metric.value)
      : ratio
        ? (metric.value ?? 0).toFixed(2)
        : volume(metric.value);

  return {
    label: metric.label,
    value,
    /* `pct` is punctuation, not a unit — it is already in the figure. */
    unit: isPercent ? "" : (metric.unit ?? ""),
    /* Only the rate rows point anywhere; a volume is just a volume. */
    tone: isPercent
      ? (metric.value ?? 0) < 0
        ? "down"
        : "up"
      : "ink",
  };
}

/** The decline grid, in the order the service returns it. */
export function declineRows(insights: MapWellInsights | null): DeclineRow[] {
  return (insights?.decline?.metrics ?? []).map(formatMetric);
}

function bars(
  rows: MapInsightCohort[],
  pick: (row: MapInsightCohort) => number | null,
  format: (value: number | null) => string,
): CohortBar[] {
  const values = rows.map((row) => pick(row) ?? 0);
  /* Against the widest bar rather than an axis: these are medians whose range
     changes with the county, and a fixed ceiling would flatten most of them. */
  const widest = Math.max(...values, 0) || 1;

  return rows.map((row, at) => ({
    label: row.label,
    display: format(pick(row)),
    share: values[at] / widest,
    count: `n = ${NUMBER.format(row.n)}`,
    isOwn: row.isOwn,
  }));
}

/** Stated depletion by age — the reserve-integrity chart. */
export function depletionBars(insights: MapWellInsights | null): CohortBar[] {
  return bars(
    insights?.cohorts?.rows ?? [],
    (row) => row.medianDepletion,
    percent,
  );
}

/** Median booked EUR by age — the cohort chart. */
export function eurBars(insights: MapWellInsights | null): CohortBar[] {
  return bars(
    insights?.cohorts?.rows ?? [],
    (row) => row.medianEurBoe,
    volume,
  );
}
