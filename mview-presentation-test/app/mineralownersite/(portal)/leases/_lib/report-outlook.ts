import { financialsSeries } from "./financials-series";
import { leaseRecords } from "./lease-records";
import { monthLabel } from "./months";
import { cashAt, gasPriceAt, OIL_PRICE } from "./price-deck";

/**
 * THE THREE YEARS AFTER THE LAST FILING — page 6 of the monthly report.
 *
 * ── WHAT IT IS AND WHAT IT IS NOT ──
 *
 * It is the decline the filed months imply, carried forward at a fixed price
 * deck. It is NOT a forecast of the market: the price is held to the deck
 * precisely so the numbers on this page move only when production does, which
 * is the one thing the filings give any evidence about. A new well, a workover
 * or a shut-in would move all of it, and none of those is knowable in advance.
 *
 * ── WHY IT REPORTS A RATE PER DAY AND NOT A MONTHLY VOLUME ──
 *
 * Months are different lengths and filings are lumpy, so a per-day rate is the
 * only figure two months can be compared on honestly. It is also the unit the
 * operator's own filings and every engineer's decline curve use.
 *
 * ── AND WHY IT SPLITS THE MONEY BY PRODUCT ──
 *
 * On this record the volume is overwhelmingly gas and the MONEY is mostly oil,
 * because a barrel is worth roughly thirty times an MCF. An owner watching the
 * gas price and ignoring the oil price is watching the wrong number, and the
 * split is the fastest way to show that.
 */

const DAYS_PER_MONTH = 30.4;
const OUTLOOK_MONTHS = 36;

export interface ThreeYearOutlook {
  /** "July 2026" and "June 2029" — the chip on the page. */
  fromMonth: string;
  toMonth: string;

  gasPerDayStart: number;
  gasPerDayEnd: number;
  gasChangePercent: number;

  oilPerDayStart: number;
  oilPerDayEnd: number;
  oilChangePercent: number;

  shareStart: number;
  shareEnd: number;
  shareChangePercent: number;

  /** Share of the three years' money, by product. */
  oilRevenuePercent: number;
  gasRevenuePercent: number;
}

function change(from: number, to: number): number {
  return from > 0 ? ((to - from) / from) * 100 : 0;
}

export function buildThreeYearOutlook(): ThreeYearOutlook {
  const { firstMonth, lastPostedIndex, byLease, length } = financialsSeries;

  const start = Math.min(lastPostedIndex + 1, length - 1);
  const end = Math.min(start + OUTLOOK_MONTHS - 1, length - 1);

  /** The reader's own volumes for one month, each lease at its own interest. */
  function share(index: number): { gas: number; oil: number; cash: number } {
    let gas = 0;
    let oil = 0;
    let cash = 0;

    for (const lease of leaseRecords) {
      const series = byLease.find((entry) => entry.slug === lease.slug);
      if (!series) continue;
      const leaseGas = series.gas[index] * lease.decimalInterest;
      const leaseOil = series.oil[index] * lease.decimalInterest;
      gas += leaseGas;
      oil += leaseOil;
      cash += cashAt({
        gas: leaseGas,
        oil: leaseOil,
        monthOfYear: (firstMonth + index) % 12,
        index,
        filed: false,
      });
    }

    return { gas, oil, cash };
  }

  const first = share(start);
  const last = share(end);

  let oilRevenue = 0;
  let gasRevenue = 0;
  for (let index = start; index <= end; index += 1) {
    const month = share(index);
    oilRevenue += month.oil * OIL_PRICE;
    gasRevenue += month.gas * gasPriceAt((firstMonth + index) % 12, index, false);
  }
  const revenue = oilRevenue + gasRevenue;

  return {
    fromMonth: monthLabel(firstMonth + start),
    toMonth: monthLabel(firstMonth + end),

    gasPerDayStart: first.gas / DAYS_PER_MONTH,
    gasPerDayEnd: last.gas / DAYS_PER_MONTH,
    gasChangePercent: change(first.gas, last.gas),

    oilPerDayStart: first.oil / DAYS_PER_MONTH,
    oilPerDayEnd: last.oil / DAYS_PER_MONTH,
    oilChangePercent: change(first.oil, last.oil),

    shareStart: first.cash,
    shareEnd: last.cash,
    shareChangePercent: change(first.cash, last.cash),

    oilRevenuePercent: revenue > 0 ? (oilRevenue / revenue) * 100 : 0,
    gasRevenuePercent: revenue > 0 ? (gasRevenue / revenue) * 100 : 0,
  };
}

export const threeYearOutlook = buildThreeYearOutlook();
