import { type MapWellSummary } from "@/lib/map-api";

/*
 * The summary response, turned into the rows the panel already draws.
 *
 * Kept apart from the panel because it is all formatting and no layout: units,
 * separators, the em dash for a field the record leaves empty. The panel asks
 * for `wellSummaryFields(summary)` and renders exactly what it rendered when
 * these came from `well-insights-data.ts`.
 *
 * Only what the endpoint actually sends is here. The production history, the
 * decline curve's own diagnostics, the reserve and cohort comparisons and the
 * written read stay in `well-insights-data.ts` until there is something to
 * replace them with.
 */

export type Row = { label: string; value: string };

/** `985.06` → `985`, `44000` → `44,000`. Volumes are read, not calculated. */
function volume(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Math.round(value).toLocaleString("en-US");
}

/** `4610` → `4,610 ft`. */
function feet(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "—";
  return `${Math.round(value).toLocaleString("en-US")} ft`;
}

/** `-0.0051` → `-0.51%`. The endpoint sends steps as fractions. */
function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/** `31.919573898` → `31.91957° N`, and the sign becomes the hemisphere. */
function latitude(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? "N" : "S"}`;
}

function longitude(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? "E" : "W"}`;
}

export function wellSummaryFields(summary: MapWellSummary) {
  const { identity, lease, wellbore, dates, filing, production, analytics } =
    summary;

  return {
    header: {
      wellNumber: text(identity.wellNumber),
      api: text(identity.api),
      county: text(identity.county),
      status: text(identity.status),
      performance: text(identity.performance),
      recordType: text(identity.recordType),
    },

    /* The six figures across the top, in the order they were always in. */
    metrics: [
      {
        label: "Last Month Oil",
        value: volume(production?.lastMonthOil),
        unit: "BBL",
      },
      {
        label: "Last Month Gas",
        value: volume(production?.lastMonthGas),
        unit: "MCF",
      },
      {
        label: "Next Month Est Oil",
        value: volume(production?.nextMonthEstOil),
        unit: "BBL",
      },
      {
        label: "Next Month Est Gas",
        value: volume(production?.nextMonthEstGas),
        unit: "MCF",
      },
      {
        label: "Reserve Oil",
        value: volume(production?.reserveOil),
        unit: "BBL",
      },
      {
        label: "Reserve Gas",
        value: volume(production?.reserveGas),
        unit: "MCF",
      },
    ],

    wellInformation: [
      { label: "Well Type", value: text(identity.wtype) },
      { label: "Direction", value: text(wellbore?.profile) },
      {
        label: "Well Age",
        value:
          dates?.ageYears === null || dates?.ageYears === undefined
            ? "—"
            : `${dates.ageYears} ${dates.ageYears === 1 ? "year" : "years"}`,
      },
      // The record names a field where it has no play, and the field is the
      // more specific of the two.
      { label: "Reservoir/Play", value: text(lease?.play ?? lease?.fieldName) },
    ] satisfies Row[],

    leaseInformation: [
      { label: "Lease Name", value: text(lease?.leaseName) },
      { label: "Lease No.", value: text(lease?.leaseNumber) },
      {
        label: "Acres",
        value:
          lease?.acres === null || lease?.acres === undefined
            ? "—"
            : lease.acres.toLocaleString("en-US"),
      },
      { label: "District", value: text(lease?.district ?? identity.district) },
    ] satisfies Row[],

    operator: {
      label: "Operator",
      value: identity.operatorNumber
        ? `${text(identity.operator)} (${identity.operatorNumber})`
        : text(identity.operator),
    },

    activity: [
      { label: "Filing Type", value: text(filing?.type) },
      { label: "Filing Purpose", value: text(filing?.purpose) },
      { label: "Spud Date", value: text(dates?.spud) },
      { label: "First Production", value: text(dates?.firstProduction) },
      { label: "Completion Date", value: text(dates?.completion) },
      { label: "Last Production", value: text(dates?.lastProduction) },
    ] satisfies Row[],

    /*
     * Only the two coordinates: the survey and the block/section are not in
     * this response, so those rows are gone rather than showing figures from
     * another well.
     */
    location: [
      { label: "Latitude", value: latitude(identity.lat) },
      { label: "Longitude", value: longitude(identity.lon) },
    ] satisfies Row[],

    depth: [
      { label: "Start Depth", value: feet(wellbore?.startDepth) },
      { label: "True Vertical", value: feet(wellbore?.trueVerticalDepth) },
      { label: "End Depth", value: feet(wellbore?.endDepth) },
      {
        label: "Nearest Well",
        value:
          wellbore?.nearestWellFt === null ||
          wellbore?.nearestWellFt === undefined
            ? "—"
            : `${wellbore.nearestWellFt} miles${
                wellbore.nearestWellDirection
                  ? ` ${wellbore.nearestWellDirection}`
                  : ""
              }`,
      },
    ] satisfies Row[],

    wellboreKind: text(wellbore?.profile),

    /*
     * The rows of Decline Diagnostics this response can answer. The rest of
     * that card — the life GOR, the GOR trend, the oil-to-gas step ratio and
     * the reserve against the integral of the curve — is not in it, and stays
     * as it was.
     */
    decline: [
      {
        label: "Last month oil",
        value: volume(production?.lastMonthOil),
        unit: "BBL",
        tone: "ink" as const,
      },
      {
        label: "Next month est oil",
        value: volume(production?.nextMonthEstOil),
        unit: "BBL",
        tone: "ink" as const,
      },
      {
        label: "Month-on-month step",
        value: percent(analytics?.oilStep),
        unit: "",
        tone: (analytics?.oilStep ?? 0) < 0 ? ("down" as const) : ("up" as const),
      },
      {
        label: "Implied annual effective",
        value: percent(analytics?.impliedAnnualOil),
        unit: "",
        tone: "ink" as const,
      },
      {
        label: "Last month gas",
        value: volume(production?.lastMonthGas),
        unit: "MCF",
        tone: "ink" as const,
      },
      {
        label: "Next month est gas",
        value: volume(production?.nextMonthEstGas),
        unit: "MCF",
        tone: "ink" as const,
      },
      {
        label: "Gas MoM step",
        value: percent(analytics?.gasStep),
        unit: "",
        tone: (analytics?.gasStep ?? 0) < 0 ? ("down" as const) : ("up" as const),
      },
      {
        label: "Last month GOR",
        value: text(analytics?.lastMonthGor),
        unit: "MCF/BBL",
        tone: "ink" as const,
      },
      {
        label: "Forecast GOR",
        value: text(analytics?.forecastGor),
        unit: "MCF/BBL",
        tone: "ink" as const,
      },
      {
        label: "Reserves at last month's rate",
        value:
          analytics?.reserveToProductionMonths === null ||
          analytics?.reserveToProductionMonths === undefined
            ? "—"
            : analytics.reserveToProductionMonths.toFixed(1),
        unit: "months",
        tone: "ink" as const,
      },
      {
        label: "Last year oil",
        value: volume(production?.lastYearOil),
        unit: "BBL",
        tone: "ink" as const,
      },
      {
        label: "Last year gas",
        value: volume(production?.lastYearGas),
        unit: "MCF",
        tone: "ink" as const,
      },
      {
        label: "Average est monthly",
        value: volume(production?.avgEstMonthlyBoe),
        unit: "BOE",
        tone: "ink" as const,
      },
    ],
  };
}

export type WellSummaryFields = ReturnType<typeof wellSummaryFields>;
