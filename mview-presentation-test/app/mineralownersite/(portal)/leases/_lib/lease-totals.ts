import { leaseOwnerRecord, leaseRecords } from "./lease-records";
import type { LeaseRecord } from "./lease-types";

/**
 * EVERY PORTFOLIO FIGURE ON THE PAGE, DERIVED FROM THE TEN ROWS.
 *
 * WHY DERIVED AND NOT LISTED. The prototype prints its portfolio numbers as
 * literals in five places — the value band, the two explainers, the Essentials
 * hero, the Financials KPIs and two table footers — and they do not all agree
 * with each other (see the two notes below). Deriving them once here means the
 * band, the footer and the explainer are arithmetically the same number, and a
 * change to one lease moves all of them together.
 *
 * THE $0-FALLBACK RULE IS ENFORCED HERE, not remembered at each call site: a
 * lease with `mvestimate: 0` contributes nothing to `mvestimateTotal`, and its
 * county figure is collected separately as `countyPlaceholderTotal` so the
 * table footer can say out loud that those dollars are display-only. That is
 * the whole reason this file exists rather than seven `.reduce()` calls spread
 * across the components.
 */

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

/** Unique values in first-appearance order — counties and operators both. */
function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export const producingLeases = leaseRecords.filter(
  (lease) => lease.status === "producing",
);
export const inactiveLeases = leaseRecords.filter(
  (lease) => lease.status === "inactive",
);

/**
 * THE HEADLINE: $26,340. The sum of the seven producing leases' owner-share
 * projections, and the number the dashboard, the pinned bar and this page all
 * lead with. The three inactive leases add nothing to it, by the rule above.
 */
export const mvestimateTotal = sum(
  leaseRecords.map((lease) => lease.mvestimate),
);

/**
 * THE COUNTY VALUES SHOWN INSTEAD OF $0 on the three inactive leases. Never
 * added to `mvestimateTotal`; surfaced so the table footer can label them.
 *
 * ⚠ $875 HERE, $940 IN THE DESIGN. The prototype prints "$940 display-only" in
 * two places (the lease table footer and the county chart's Cass caption), but
 * the three county figures it lists for those leases are $55, $410 and $410 —
 * which come to $875. Derived from the records rather than carried as a literal,
 * so the footer and the leases it describes cannot disagree. The fourth
 * arithmetic slip found in this route; the other three are noted in the module
 * README.
 */
export const countyPlaceholderTotal = sum(
  inactiveLeases.map((lease) => lease.countyAppraised),
);

export const counties = distinct(leaseRecords.map((lease) => lease.county));
export const operators = distinct(leaseRecords.map((lease) => lease.operator));

/**
 * THE SIX-YEAR PROJECTION SPLIT ACROSS ITS SIX YEARS.
 *
 * `mvestimate` IS a six-year figure, so a year is a sixth of it — which is the
 * only basis the design gives, and the design labels every use of it
 * "illustrative — straight-line" for exactly that reason.
 *
 * DERIVED RATHER THAN COPIED, and the prototype's own footer is the argument
 * for it: that footer prints `≈ $4,390` as the annual total, which is
 * $26,340 ÷ 6, while its per-lease column used a divisor nearer 5.5 (Ledbetter
 * `≈ $967` where a sixth is $883). The rows therefore summed to ~$4,750 under a
 * total of $4,390. Dividing by six everywhere makes the column add up to the
 * total the design itself states.
 */
const PROJECTION_YEARS = 6;

export function annualShare(lease: LeaseRecord): number {
  return lease.mvestimate / PROJECTION_YEARS;
}

export const annualTotal = mvestimateTotal / PROJECTION_YEARS;

/**
 * MVESTIMATE BY COUNTY, biggest first — the horizontal bars in Financials.
 *
 * ALSO DERIVED, and for the same reason: the prototype's chart labels Hood at
 * $8,990 when its four Cedar Bend leases come to $8,240, so its three bars summed
 * to $27,090 against a $26,340 total printed directly above them. Reducing over
 * the records makes the bars sum to the total; the bar widths follow from the
 * share, so nothing has to be re-measured by hand when a lease moves.
 */
export interface CountyValue {
  county: string;
  value: number;
  /** 0–1 against the largest county, for the bar width. */
  share: number;
  leaseCount: number;
  /** The one-line characterisation under the bar. See `COUNTY_NOTES`. */
  note: string;
}

/**
 * WHAT EACH COUNTY IS, IN ONE LINE — the sentence under each bar.
 *
 * EDITORIAL, AND THEREFORE DATA. These are the design's own captions, and they
 * are the difference between three bars and three bars that mean something:
 * "Bee is your engine", "Hood is a steady tail", "Cass is oil-weighted". None of
 * it is derivable — lease counts and operator names are, but "your engine" is a
 * judgement about the portfolio.
 *
 * A county with no entry falls back to a derived line in the chart, so adding a
 * county cannot leave a bar unlabelled.
 */
const COUNTY_NOTES: Record<string, string> = {
  Bee: "4 Smith units · Bluestem · gas-weighted — your engine",
  Hood: "4 Cedar Bend leases · Trinity Fork · steady tail",
  Cass: "Ledbetter · Caddo Pine · oil-weighted",
};

export const valueByCounty: CountyValue[] = (() => {
  const totals = counties.map((county) => {
    const inCounty = leaseRecords.filter((lease) => lease.county === county);
    return {
      county,
      value: sum(inCounty.map((lease) => lease.mvestimate)),
      leaseCount: inCounty.length,
    };
  });
  const largest = Math.max(...totals.map((entry) => entry.value));
  return totals
    .sort((a, b) => b.value - a.value)
    .map((entry) => ({
      ...entry,
      share: entry.value / largest,
      note:
        COUNTY_NOTES[entry.county] ??
        `${entry.leaseCount} ${entry.leaseCount === 1 ? "lease" : "leases"}`,
    }));
})();

/** The one-line summary the page header and the Essentials hero both print. */
export const portfolioSummary = {
  leaseCount: leaseRecords.length,
  producingCount: producingLeases.length,
  inactiveCount: inactiveLeases.length,
  countyCount: counties.length,
  operatorCount: operators.length,
  mvestimateTotal,
  countyAppraisedTotal: leaseOwnerRecord.countyAppraisedTotal,
  countyPlaceholderTotal,
  annualTotal,
} as const;
