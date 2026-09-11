import { financialsSeries } from "./financials-series";
import { leaseRecords } from "./lease-records";
import { gasPriceAt, OIL_PRICE } from "./price-deck";

/**
 * THE READER'S INCOME, SPLIT BY THE PRODUCT THAT EARNED IT.
 *
 * ── WHY THE SPLIT IS THE POINT ──
 *
 * A statement arrives as one number. This record's VOLUME is overwhelmingly gas
 * and its MONEY is mostly oil, because a barrel is worth roughly thirty MCF — so
 * an owner watching the gas price is watching the smaller half of their cheque.
 * Stacking the two is the fastest way to show which product actually moved a
 * month, and the only way to show it without two charts.
 *
 * ── EVERY LEASE AT ITS OWN INTEREST ──
 *
 * Same rule as the rest of the monthly report: the decimal interests on this
 * record run from 1.07% to 5.14%, and a blended rate would be wrong for all ten
 * leases. Built once at module load — it does not depend on which month is
 * being read.
 */

export interface RevenueSeries {
  /** Dollars of gas revenue per month, the reader's share. */
  gas: number[];
  /** Dollars of oil revenue per month, the reader's share. */
  oil: number[];
}

function build(): RevenueSeries {
  const { firstMonth, length, byLease, lastPostedIndex } = financialsSeries;
  const gas = new Array<number>(length).fill(0);
  const oil = new Array<number>(length).fill(0);

  for (const lease of leaseRecords) {
    const series = byLease.find((entry) => entry.slug === lease.slug);
    if (!series) continue;

    for (let index = 0; index < length; index += 1) {
      const monthOfYear = (firstMonth + index) % 12;
      const filed = index <= lastPostedIndex;
      gas[index] +=
        series.gas[index] *
        lease.decimalInterest *
        gasPriceAt(monthOfYear, index, filed);
      oil[index] += series.oil[index] * lease.decimalInterest * OIL_PRICE;
    }
  }

  return { gas, oil };
}

export const revenueSeries: RevenueSeries = build();
