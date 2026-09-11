import { financialsSeries } from "../../_lib/financials-series";
import { leaseRecords } from "../../_lib/lease-records";
import { portfolioSummary } from "../../_lib/lease-totals";
import type { LeaseRecord } from "../../_lib/lease-types";
import { monthLabel } from "../../_lib/months";
import { cashAt } from "../../_lib/price-deck";
import { wellsForLease, type WellRecord } from "../../_lib/well-records";

/**
 * THE RESERVOIR REPORT'S FIGURES — this lease's wells in one rock.
 *
 * ── THE SCOPE IS THE THING TO GET RIGHT ──
 *
 * A reservoir runs under many leases, and this owner holds nine leases in
 * WILCOX 10400. This report is about THIS LEASE'S wells in it, not the whole
 * formation: the volumes are its wells' volumes and the money is its own cash.
 * The page says so in as many words, and prints how many other leases the owner
 * holds in the same rock so a reader knows what they are not looking at.
 *
 * Widening it to every lease in the reservoir would produce a page whose
 * headline figure matches nothing on any statement — which is the failure mode
 * a page like this has.
 *
 * ── VOLUMES ARE WHOLE-LEASE; MONEY IS THE OWNER'S ──
 *
 * That split is the design's and it is right: a volume is a physical fact about
 * the rock and does not belong to anybody, while cash only means anything at a
 * decimal interest. Each tile says which it is.
 */

const DAYS_PER_MONTH = 30.4;

export interface ReservoirWell extends WellRecord {
  /** Whole-lease gas this well has filed, MCF. */
  gasFiled: number;
  /** Its share of the lease's wells, by volume. */
  sharePercent: number;
  /** The owner's cash allocated to it. */
  paidYou: number;
}

export interface ReservoirReport {
  lease: LeaseRecord;
  name: string;

  /* ── the six tiles ──────────────────────────────────────────────────── */
  wellCount: number;
  leasesWithWells: number;
  gasFiled: number;
  gasFiledPercentOfRecord: number;
  oilFiled: number;
  newestFiledMonth: string;
  paidYouFiled: number;
  stillAheadCash: number;
  stillAheadGas: number;
  openTopFt: number;
  openBottomFt: number;

  /* ── how much is left ───────────────────────────────────────────────── */
  gasReserves: number;
  oilReserves: number;
  gasProducedPercent: number;
  oilProducedPercent: number;
  oilYield: number;

  /* ── the rock itself ────────────────────────────────────────────────── */
  depthFt: number;
  directionalCount: number;
  averageLateralFt: number | null;
  operators: string[];
  filedFrom: string;
  filedTo: string;
  gasPerFootOpen: number;
  openFeet: number;
  bestMonth: string;
  bestMonthGas: number;
  trailingAverageGas: number;
  bestMonthGapPercent: number;
  declinePerMonth: number | null;
  wellsCameOn: string;
  /** How many years the remaining gas would take at the recent rate. */
  yearsLeftAtRecentRate: number;
  /** Dollars per acre of the reader's acreage in this rock. */
  valuePerAcre: number;
  /** Other leases the owner holds in the same reservoir. */
  otherLeasesInRock: number;
  otherWellsInRock: number;

  /* ── the chart and the table ────────────────────────────────────────── */
  from: number;
  to: number;
  wells: ReservoirWell[];
}

export function buildReservoirReport(lease: LeaseRecord): ReservoirReport {
  const series = financialsSeries.byLease.find(
    (entry) => entry.slug === lease.slug,
  );
  if (!series) throw new Error(`No series for lease ${lease.slug}`);

  const { firstMonth, length } = financialsSeries;
  const wells = wellsForLease(lease.slug);
  const filedThrough = series.filedThroughIndex;
  const from = series.gas.findIndex((value) => value > 0);
  const to = length - 1;

  /* ── volumes and money, filed and ahead ─────────────────────────────── */
  let gasFiled = 0;
  let oilFiled = 0;
  let gasAhead = 0;
  let oilAhead = 0;
  let paidYou = 0;
  let stillAhead = 0;

  for (let index = from; index <= to; index += 1) {
    const gas = series.gas[index];
    const oil = series.oil[index];
    const cash = cashAt({
      gas: gas * lease.decimalInterest,
      oil: oil * lease.decimalInterest,
      monthOfYear: (firstMonth + index) % 12,
      index,
      filed: index <= financialsSeries.lastPostedIndex,
    });

    if (index <= filedThrough) {
      gasFiled += gas;
      oilFiled += oil;
      paidYou += cash;
    } else {
      gasAhead += gas;
      oilAhead += oil;
      stillAhead += cash;
    }
  }

  /* ── the trailing twelve, for the rate the remainder is measured at ──── */
  const trailingStart = Math.max(from, filedThrough - 11);
  let trailingGas = 0;
  let trailingMonths = 0;
  let bestMonthGas = 0;
  let bestMonth = "";
  for (let index = from; index <= filedThrough; index += 1) {
    if (series.gas[index] > bestMonthGas) {
      bestMonthGas = series.gas[index];
      bestMonth = monthLabel(firstMonth + index);
    }
    if (index >= trailingStart) {
      trailingGas += series.gas[index];
      trailingMonths += 1;
    }
  }
  const trailingAverageGas = trailingMonths > 0 ? trailingGas / trailingMonths : 0;

  /* ── the wells, biggest filer first ─────────────────────────────────── */
  const wellRows: ReservoirWell[] = wells
    .map((well) => ({
      ...well,
      /* One well per lease on this record, so it carries all of it. With
         several, the split would be by each well's own filed volume — which is
         exactly how the money is allocated. */
      gasFiled: gasFiled / wells.length,
      sharePercent: 100 / wells.length,
      paidYou: paidYou / wells.length,
    }))
    .sort((a, b) => b.gasFiled - a.gasFiled);

  const openFeet = wells.reduce(
    (total, well) => total + (well.openBottomFt - well.openTopFt),
    0,
  );

  const sameRock = leaseRecords.filter(
    (entry) => entry.reservoir === lease.reservoir && entry.slug !== lease.slug,
  );

  /* Compounded across the filed record. A reservoir whose wells came on at
     different times has no single curve, and saying so is better than printing
     a rate that describes none of them — see the page's own wording. */
  const spanMonths = filedThrough - from;
  const decline =
    spanMonths > 11 && series.gas[from] > 0 && wells.length === 1
      ? (1 - (series.gas[filedThrough] / series.gas[from]) ** (1 / spanMonths)) *
        100
      : null;

  const laterals = wells
    .map((well) => well.lateralFt)
    .filter((value): value is number => value !== null);

  return {
    lease,
    name: lease.reservoir,

    wellCount: wells.length,
    leasesWithWells: 1,
    gasFiled,
    gasFiledPercentOfRecord: (gasFiled / portfolioSummary.gasMcf) * 100,
    oilFiled,
    newestFiledMonth: monthLabel(firstMonth + filedThrough),
    paidYouFiled: paidYou,
    stillAheadCash: stillAhead,
    stillAheadGas: gasAhead,
    openTopFt: Math.min(...wells.map((well) => well.openTopFt)),
    openBottomFt: Math.max(...wells.map((well) => well.openBottomFt)),

    gasReserves: gasAhead,
    oilReserves: oilAhead,
    gasProducedPercent:
      gasFiled + gasAhead > 0 ? (gasFiled / (gasFiled + gasAhead)) * 100 : 0,
    oilProducedPercent:
      oilFiled + oilAhead > 0 ? (oilFiled / (oilFiled + oilAhead)) * 100 : 0,
    oilYield: gasFiled > 0 ? (oilFiled / gasFiled) * 1000 : 0,

    depthFt: Math.round(
      wells.reduce((total, well) => total + well.depthFt, 0) / wells.length,
    ),
    directionalCount: wells.filter((well) => well.drilled !== "VERTICAL").length,
    averageLateralFt:
      laterals.length > 0
        ? Math.round(
            laterals.reduce((total, value) => total + value, 0) / laterals.length,
          )
        : null,
    operators: [lease.operator],
    filedFrom: monthLabel(firstMonth + from),
    filedTo: monthLabel(firstMonth + filedThrough),
    gasPerFootOpen: openFeet > 0 ? gasFiled / openFeet : 0,
    openFeet,
    bestMonth,
    bestMonthGas,
    trailingAverageGas,
    bestMonthGapPercent:
      bestMonthGas > 0 ? (trailingAverageGas / bestMonthGas - 1) * 100 : 0,
    declinePerMonth: decline,
    wellsCameOn: wells[0]?.cameOn ?? lease.firstPosting,
    yearsLeftAtRecentRate:
      trailingAverageGas > 0 ? gasAhead / trailingAverageGas / 12 : 0,
    valuePerAcre: lease.acres > 0 ? (paidYou + stillAhead) / lease.acres : 0,
    otherLeasesInRock: sameRock.length,
    otherWellsInRock: sameRock.reduce((total, entry) => total + entry.wells, 0),

    from,
    to,
    wells: wellRows,
  };
}

/** A per-day rate, for any monthly volume the page quotes that way. */
export function perDay(monthly: number): number {
  return monthly / DAYS_PER_MONTH;
}
