import { financialsSeries } from "./financials-series";
import { leaseRecords } from "./lease-records";
import { OPERATOR_DETAIL } from "./report-fixtures";
import { portfolioSummary } from "./lease-totals";

/**
 * THE RECORD GROUPED BY WHO RUNS IT — page 8 of the monthly report.
 *
 * ── WHY THIS IS A PAGE AT ALL ──
 *
 * An owner's real concentration is usually not the one they think. This record
 * looks diversified at ten leases and is not: one company runs eight of them
 * and 98% of the modelled value sits behind that single operator's decisions
 * about when to work over a well, when to shut one in, and how promptly to
 * file. Several leases behind one operator move more of an income than any
 * single well does, and nothing else in the portal says so.
 *
 * Every figure is summed from the lease records, so adding a lease or changing
 * an operator re-groups the page with no edit here.
 */

export interface OperatorRollup {
  name: string;
  /** The state's operator number, from the fixture. */
  number: string;
  runningSince: string;
  /** How many of the reader's leases this company runs. */
  leaseCount: number;
  /** The distinct unit names, for the "8 — MCCABE ETAL GU, COOK-KAISER GU" line. */
  unitNames: string[];
  counties: string[];
  wells: number;
  /** Lifetime volumes on the reader's leases with them. */
  filedGas: number;
  filedOil: number;
  /** The reader's modelled value sitting behind them, and its share of the record. */
  value: number;
  valuePercent: number;
}

export function operatorRollups(): OperatorRollup[] {
  const byName = new Map<string, OperatorRollup>();

  for (const lease of leaseRecords) {
    const detail = OPERATOR_DETAIL[lease.operator];
    const entry = byName.get(lease.operator) ?? {
      name: lease.operator,
      number: detail?.number ?? "not recorded",
      runningSince: detail?.runningSince ?? "not recorded",
      leaseCount: 0,
      unitNames: [],
      counties: [],
      wells: 0,
      filedGas: 0,
      filedOil: 0,
      value: 0,
      valuePercent: 0,
    };

    entry.leaseCount += 1;
    entry.wells += lease.wells;
    entry.filedGas += lease.production.gasMcf;
    entry.filedOil += lease.production.oilBbl;
    entry.value += lease.mvestimate;
    if (!entry.unitNames.includes(lease.name)) entry.unitNames.push(lease.name);
    if (!entry.counties.includes(lease.county)) entry.counties.push(lease.county);

    byName.set(lease.operator, entry);
  }

  return [...byName.values()]
    .map((entry) => ({
      ...entry,
      valuePercent: (entry.value / portfolioSummary.mvestimate) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * How the report's month landed for one operator: how many of their leases
 * filed, and what those filings were worth to the reader.
 *
 * Separate from the rollup above because the rollup is about the whole record
 * and does not change month to month, while this is the one line on the page
 * that does.
 */
export function operatorMonth(
  operator: string,
  index: number,
): { filed: number; total: number; gas: number; oil: number } {
  let filed = 0;
  let total = 0;
  let gas = 0;
  let oil = 0;

  for (const lease of leaseRecords) {
    if (lease.operator !== operator) continue;
    total += 1;

    const series = financialsSeries.byLease.find(
      (entry) => entry.slug === lease.slug,
    );
    if (!series || index > series.filedThroughIndex) continue;

    filed += 1;
    gas += series.gas[index] * lease.decimalInterest;
    oil += series.oil[index] * lease.decimalInterest;
  }

  return { filed, total, gas, oil };
}
