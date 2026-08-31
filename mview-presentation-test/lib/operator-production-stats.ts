import { formatCount, formatMillions } from "./operator-compare";
import type { ProductionOperator } from "./operator-production-shape";

/**
 * The Comparison stats rows, and the wording the leader tiles and cards share.
 *
 * A PURE MODULE, no React, so the figures can be checked without rendering
 * anything — the same split `lib/operator-compare.ts` has from the page it serves.
 *
 * EVERY ROW IS AN API FIELD, none derived. The rows were specified by name, and each
 * one now maps to a field the endpoint actually returns, which is how the set was
 * chosen: `rank_statewide`, `total_production_oil`, `total_production_gas`,
 * `lease_count`, `active_lease_count`, `producing_county_count`,
 * `latest_production_date`, and the two `avg_*_production_per_lease` figures.
 *
 * UNITS LIVE IN THE VALUE, NOT THE LABEL. The labels are the ones asked for — "Oil
 * Produced", not "Cumulative oil (bbl)" — but a bare "1.09B" in a cell is a figure a
 * reader has to guess the unit of, so the unit rides with the number.
 *
 * THESE VOLUMES ARE LIFETIME, NOT WINDOWED. The info endpoint ignores the payload's
 * `duration` — measurable: asking for one year returns the same totals as ten — so
 * these are the operator's whole filed record within the selected acreage. Only the
 * chart's series responds to the year range. The section's own note says so; labelling
 * a row "2015–2024" here would be a claim the data does not support.
 */

export interface ProductionStatRow {
  label: string;
  value: (operator: ProductionOperator) => string;
  /**
   * True for a row read from a field the endpoint withholds without an account.
   *
   * MEASURED, NOT ASSUMED. Exactly five fields come back as `"****"` at
   * `member_id: 0` — `total_production_oil`, `total_production_gas`,
   * `total_production_boe`, `avg_oil_production_per_lease` and
   * `avg_gas_production_per_lease`. Rank, the oil/gas split, county and lease
   * counts and the latest production date are all real. These three rows are the
   * ones built from that first set.
   *
   * It is a flag rather than a label match because a row's caption is copy and
   * will be reworded; which upstream field it reads will not.
   */
  gated?: boolean;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * `2026-07` -> `Jul 2026`.
 *
 * Returned unchanged when it is not that shape, rather than guessed at: an unexpected
 * format shown as-is is a reader's problem for one cell, where a wrong month is a
 * wrong fact.
 */
export function productionMonthLabel(raw: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(raw.trim());
  if (!match) return raw.trim();
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : raw.trim();
}

/** The requested rows, in the requested order. */
export const PRODUCTION_STAT_ROWS: readonly ProductionStatRow[] = [
  {
    label: "Rank statewide — by reported production",
    value: (operator) =>
      operator.rankStatewide === null ? "—" : `#${operator.rankStatewide}`,
  },
  {
    label: "Oil Produced",
    value: (operator) => `${formatMillions(operator.oilTotal)} bbl`,
    gated: true,
  },
  {
    label: "Gas Produced",
    value: (operator) => `${formatMillions(operator.gasTotal)} Mcf`,
    gated: true,
  },
  {
    label: "Leases on Record",
    value: (operator) => formatCount(operator.leaseCount),
  },
  {
    label: "Active Leases",
    value: (operator) => formatCount(operator.activeLeaseCount),
  },
  {
    label: "Producing Counties",
    value: (operator) => String(operator.producingCountyCount),
  },
  {
    label: "Latest Production Date",
    value: (operator) =>
      productionMonthLabel(operator.latestProductionDate) || "—",
  },
  {
    /*
     * `avg_oil_production_per_lease` and `avg_gas_production_per_lease`, the two
     * figures the endpoint offers under this heading — the average a single lease
     * produces of each. NOT scaled to millions: they are a few hundred thousand
     * barrels, and `formatMillions` would print "0.3M" for all of them.
     */
    label: "Average Production Range",
    value: (operator) =>
      `${formatCount(Math.round(operator.avgOilPerLease))} bbl · ` +
      `${formatCount(Math.round(operator.avgGasPerLease))} Mcf`,
    gated: true,
  },
];
