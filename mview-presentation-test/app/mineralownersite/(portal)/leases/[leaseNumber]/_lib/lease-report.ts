import { financialsSeries } from "../../_lib/financials-series";
import { leaseRecords } from "../../_lib/lease-records";
import type { LeaseRecord } from "../../_lib/lease-types";
import { monthLabel } from "../../_lib/months";
import { cashAt, gasPriceAt, OIL_PRICE } from "../../_lib/price-deck";

/**
 * EVERYTHING ONE LEASE REPORT PRINTS, DERIVED FROM THE RECORD.
 *
 * ── THE PAGE IS LONG AND THE RULE IS SHORT: NOTHING IS TYPED TWICE ──
 *
 * Eight sections describe the same lease — the band, the tiles, two charts, the
 * twelve-month panel, the ratios, the ranking and the precision table — and
 * several of them state the same quantity in different units. They agree
 * because they all come out of this one builder.
 *
 * ── RANGES, NOT NUMBERS, WHEREVER THE FUTURE IS INVOLVED ──
 *
 * Every forward figure on the page is a band. The volumes are the model's and
 * the prices are a deck it holds fixed, so a single number would imply a
 * precision nobody has: this operator's deducts are not in the public record,
 * and the differential moves with the month. `RANGE_SPREAD` is that honesty,
 * stated once.
 *
 * ── "YOUR SHARE" MEANS THIS LEASE'S OWN DECIMAL, NOT THE BLENDED RATE ──
 *
 * Same rule as the monthly report. The Financials tab's 4.3% is a portfolio
 * shape; a lease report is about one lease, and its interest is the only one
 * that applies to anything on the page.
 */

const DAYS_PER_MONTH = 30.4;
const TRAILING_MONTHS = 12;
const FORWARD_MONTHS = 12;

/** How wide a forward range runs either side of the model's own figure. */
const RANGE_SPREAD = 0.16;

/** The valuation band on the dark header — wider, because it compounds. */
const VALUE_SPREAD = 0.25;

/** What a fifth of price movement does to a year — the sensitivity row. */
export const DECK_SHOCK = 0.2;

export interface MonthCell {
  label: string;
  gas: number;
  oil: number;
  shareLow: number;
  shareHigh: number;
}

export interface LeaseReport {
  lease: LeaseRecord;

  /* ── identity ───────────────────────────────────────────────────────── */
  position: number;
  total: number;
  firstPosting: string;
  lastPosting: string;
  postedMonths: number;

  /* ── the dark band ──────────────────────────────────────────────────── */
  yourValue: number;
  yourValueLow: number;
  yourValueHigh: number;
  grossValuation: number;
  countyYourInterest: number;
  /** The county roll as a share of the model's figure. */
  countyAgreementPercent: number;
  nextMonthLabel: string;
  nextMonthLow: number;
  nextMonthHigh: number;
  nextQuarterLow: number;
  nextQuarterHigh: number;

  /* ── the six tiles ──────────────────────────────────────────────────── */
  lastMonthShare: number;
  lastMonthLabel: string;
  yearToDateShare: number;
  gasFiled: number;
  oilFiled: number;

  /* ── cumulative and reserves ────────────────────────────────────────── */
  /** Running total of your gas, month by month, across the whole record. */
  cumulativeGas: number[];
  cumulativeFiledIndex: number;
  gasProduced: number;
  gasReserves: number;
  oilProduced: number;
  oilReserves: number;
  gasProducedPercent: number;
  oilProducedPercent: number;

  /* ── twelve behind ──────────────────────────────────────────────────── */
  trailingFrom: string;
  trailingTo: string;
  gasPerDayLow: number;
  gasPerDayHigh: number;
  gasPerDayAvg: number;
  oilPerDayLow: number;
  oilPerDayHigh: number;
  oilPerDayAvg: number;
  strongestMonth: string;
  thinnestMonth: string;
  bestMonthForYou: string;
  bestMonthShare: number;
  thinnestMonthForYou: string;
  thinnestMonthShare: number;
  /** Compounded monthly decline across the trailing window, in percent. */
  declinePerMonth: number;
  oilYield: number;
  trailingGas: number;
  trailingOil: number;
  trailingShare: number;
  /** Which calendar months pay, as a percentage against the average day. */
  seasonality: { month: string; percent: number }[];

  /* ── twelve ahead ───────────────────────────────────────────────────── */
  forward: MonthCell[];
  forwardTotal: number;
  forwardLowDeck: number;
  forwardHighDeck: number;

  /* ── how it measures up ─────────────────────────────────────────────── */
  rankByValue: number;
  rankLastMonth: number;
  rankGasEver: number;
  shareOfRecordValue: number;
  shareOfRecordLastMonth: number;
  shareOfRecordGasEver: number;
  /** Every lease's value, for the bar list. */
  recordBars: { slug: string; label: string; value: number }[];
  recordTotal: number;
  /** The model's figure against the filing, for the last filed month. */
  modelWanted: number;
  statePosted: number;
  modelMissPercent: number;

  /* ── ratios ─────────────────────────────────────────────────────────── */
  valuePerAcre: number;
  realisedGas: number;
  realisedOil: number;
  halfMadeBy: string;
  halfMadeInMonths: number;
  acresPerWell: number;
  /** Months between the last filing and today's date on the record. */
  stateBehindMonths: number;
  projectedGasPercent: number;
  projectedOilPercent: number;
}

function seriesFor(slug: string) {
  const found = financialsSeries.byLease.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`No series for lease ${slug}`);
  return found;
}

/** One month's money for this lease at a given interest. */
function cashFor(slug: string, index: number, interest: number): number {
  const series = seriesFor(slug);
  return cashAt({
    gas: series.gas[index] * interest,
    oil: series.oil[index] * interest,
    monthOfYear: (financialsSeries.firstMonth + index) % 12,
    index,
    filed: index <= financialsSeries.lastPostedIndex,
  });
}

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function buildLeaseReport(lease: LeaseRecord): LeaseReport {
  const series = seriesFor(lease.slug);
  const { firstMonth, length } = financialsSeries;
  const interest = lease.decimalInterest;

  const start = series.gas.findIndex((value) => value > 0);
  const filedThrough = series.filedThroughIndex;
  const postedMonths = filedThrough - start + 1;

  /* ── lifetime volumes, yours and the lease's ────────────────────────── */
  let gasFiled = 0;
  let oilFiled = 0;
  let gasAhead = 0;
  let oilAhead = 0;
  const cumulativeGas = new Array<number>(length).fill(0);
  let running = 0;

  for (let index = 0; index < length; index += 1) {
    const gas = series.gas[index] * interest;
    const oil = series.oil[index] * interest;
    running += gas;
    cumulativeGas[index] = running;

    if (index <= filedThrough) {
      gasFiled += gas;
      oilFiled += oil;
    } else {
      gasAhead += gas;
      oilAhead += oil;
    }
  }

  /* Half of everything this lease will ever make — the "half made by" date. */
  const halfTarget = (gasFiled + gasAhead) / 2;
  const halfIndex = cumulativeGas.findIndex((value) => value >= halfTarget);

  /* ── the trailing twelve filed months ───────────────────────────────── */
  const trailingEnd = filedThrough;
  const trailingStart = Math.max(start, trailingEnd - (TRAILING_MONTHS - 1));

  let trailingGas = 0;
  let trailingOil = 0;
  let trailingShare = 0;
  let gasLow = Infinity;
  let gasHigh = 0;
  let oilLow = Infinity;
  let oilHigh = 0;
  let strongestMonth = "";
  let thinnestMonth = "";
  let bestShare = 0;
  let bestMonthForYou = "";
  let thinShare = Infinity;
  let thinnestMonthForYou = "";
  let months = 0;

  for (let index = trailingStart; index <= trailingEnd; index += 1) {
    const gas = series.gas[index];
    const oil = series.oil[index];
    const share = cashFor(lease.slug, index, interest);

    trailingGas += gas * interest;
    trailingOil += oil * interest;
    trailingShare += share;
    months += 1;

    if (gas > gasHigh) {
      gasHigh = gas;
      strongestMonth = monthLabel(firstMonth + index);
    }
    if (gas < gasLow) {
      gasLow = gas;
      thinnestMonth = monthLabel(firstMonth + index);
    }
    oilHigh = Math.max(oilHigh, oil);
    oilLow = Math.min(oilLow, oil);

    if (share > bestShare) {
      bestShare = share;
      bestMonthForYou = monthLabel(firstMonth + index);
    }
    if (share < thinShare) {
      thinShare = share;
      thinnestMonthForYou = monthLabel(firstMonth + index);
    }
  }

  /* Compounded, not averaged: a decline curve falls by a PERCENTAGE each month,
     so the rate is the ratio of the two ends over the number of steps. */
  const declinePerMonth =
    months > 1 && series.gas[trailingStart] > 0
      ? (1 -
          (series.gas[trailingEnd] / series.gas[trailingStart]) **
            (1 / (months - 1))) *
        100
      : 0;

  /* ── which calendar months pay ──────────────────────────────────────── */
  const monthTotals = new Array<number>(12).fill(0);
  const monthCounts = new Array<number>(12).fill(0);
  for (let index = start; index <= filedThrough; index += 1) {
    const slot = (firstMonth + index) % 12;
    monthTotals[slot] += series.gas[index];
    monthCounts[slot] += 1;
  }
  const overallAverage =
    monthTotals.reduce((total, value) => total + value, 0) /
    Math.max(
      monthCounts.reduce((total, value) => total + value, 0),
      1,
    );
  const seasonality = MONTH_INITIALS.map((initial, slot) => ({
    month: initial,
    percent:
      monthCounts[slot] > 0 && overallAverage > 0
        ? (monthTotals[slot] / monthCounts[slot] / overallAverage - 1) * 100
        : 0,
  }));

  /* ── the next twelve months ─────────────────────────────────────────── */
  const forward: MonthCell[] = [];
  let forwardTotal = 0;
  for (let step = 1; step <= FORWARD_MONTHS; step += 1) {
    const index = Math.min(filedThrough + step, length - 1);
    const gas = series.gas[index] * interest;
    const oil = series.oil[index] * interest;
    const share = cashFor(lease.slug, index, interest);
    forwardTotal += share;
    forward.push({
      label: monthLabel(firstMonth + index),
      gas,
      oil,
      shareLow: share * (1 - RANGE_SPREAD),
      shareHigh: share * (1 + RANGE_SPREAD),
    });
  }

  /* ── how it ranks in the record ─────────────────────────────────────── */
  const bars = leaseRecords
    .map((entry) => ({
      slug: entry.slug,
      label: entry.number ?? entry.name,
      value: entry.mvestimate,
    }))
    .sort((a, b) => b.value - a.value);
  const recordTotal = bars.reduce((total, bar) => total + bar.value, 0);

  const lastMonthByLease = leaseRecords
    .map((entry) => ({
      slug: entry.slug,
      value:
        filedThrough <= seriesFor(entry.slug).filedThroughIndex
          ? cashFor(entry.slug, filedThrough, entry.decimalInterest)
          : 0,
    }))
    .sort((a, b) => b.value - a.value);
  const lastMonthTotal = lastMonthByLease.reduce(
    (total, entry) => total + entry.value,
    0,
  );

  const gasEverByLease = leaseRecords
    .map((entry) => ({
      slug: entry.slug,
      value: entry.production.gasMcf * entry.decimalInterest,
    }))
    .sort((a, b) => b.value - a.value);
  const gasEverTotal = gasEverByLease.reduce(
    (total, entry) => total + entry.value,
    0,
  );

  const lastMonthShare = cashFor(lease.slug, filedThrough, interest);
  const yourGasEver = lease.production.gasMcf * interest;

  /* ── the price deck, for the realised-price ratios ──────────────────── */
  const gasRevenue = forward.reduce(
    (total, cell, step) =>
      total +
      cell.gas *
        gasPriceAt(
          (firstMonth + filedThrough + step + 1) % 12,
          filedThrough + step + 1,
          false,
        ),
    0,
  );
  const oilRevenue = forward.reduce((total, cell) => total + cell.oil * OIL_PRICE, 0);
  const projectedRevenue = gasRevenue + oilRevenue;

  const yourValue = lease.mvestimate;
  const grossValuation = interest > 0 ? yourValue / interest : 0;
  const countyYourInterest = lease.countyAppraised;

  return {
    lease,
    position: leaseRecords.findIndex((entry) => entry.slug === lease.slug) + 1,
    total: leaseRecords.length,
    firstPosting: lease.firstPosting,
    lastPosting: monthLabel(firstMonth + filedThrough),
    postedMonths,

    yourValue,
    yourValueLow: yourValue * (1 - VALUE_SPREAD),
    yourValueHigh: yourValue * (1 + VALUE_SPREAD),
    grossValuation,
    countyYourInterest,
    countyAgreementPercent:
      yourValue > 0 ? (countyYourInterest / yourValue) * 100 : 0,
    nextMonthLabel: monthLabel(firstMonth + filedThrough + 1),
    nextMonthLow: forward[0].shareLow,
    nextMonthHigh: forward[0].shareHigh,
    nextQuarterLow: forward
      .slice(0, 3)
      .reduce((total, cell) => total + cell.shareLow, 0),
    nextQuarterHigh: forward
      .slice(0, 3)
      .reduce((total, cell) => total + cell.shareHigh, 0),

    lastMonthShare,
    lastMonthLabel: monthLabel(firstMonth + filedThrough),
    yearToDateShare: trailingShare,
    gasFiled,
    oilFiled,

    cumulativeGas,
    cumulativeFiledIndex: filedThrough,
    gasProduced: gasFiled,
    gasReserves: gasAhead,
    oilProduced: oilFiled,
    oilReserves: oilAhead,
    gasProducedPercent:
      gasFiled + gasAhead > 0 ? (gasFiled / (gasFiled + gasAhead)) * 100 : 0,
    oilProducedPercent:
      oilFiled + oilAhead > 0 ? (oilFiled / (oilFiled + oilAhead)) * 100 : 0,

    trailingFrom: monthLabel(firstMonth + trailingStart),
    trailingTo: monthLabel(firstMonth + trailingEnd),
    gasPerDayLow: (gasLow === Infinity ? 0 : gasLow) / DAYS_PER_MONTH,
    gasPerDayHigh: gasHigh / DAYS_PER_MONTH,
    gasPerDayAvg: months > 0 ? trailingGas / interest / months / DAYS_PER_MONTH : 0,
    oilPerDayLow: (oilLow === Infinity ? 0 : oilLow) / DAYS_PER_MONTH,
    oilPerDayHigh: oilHigh / DAYS_PER_MONTH,
    oilPerDayAvg: months > 0 ? trailingOil / interest / months / DAYS_PER_MONTH : 0,
    strongestMonth,
    thinnestMonth,
    bestMonthForYou,
    bestMonthShare: bestShare,
    thinnestMonthForYou,
    thinnestMonthShare: thinShare === Infinity ? 0 : thinShare,
    declinePerMonth,
    oilYield: trailingGas > 0 ? (trailingOil / trailingGas) * 1000 : 0,
    trailingGas,
    trailingOil,
    trailingShare,
    seasonality,

    forward,
    forwardTotal,
    forwardLowDeck: forwardTotal * (1 - DECK_SHOCK),
    forwardHighDeck: forwardTotal * (1 + DECK_SHOCK),

    rankByValue: bars.findIndex((bar) => bar.slug === lease.slug) + 1,
    rankLastMonth:
      lastMonthByLease.findIndex((entry) => entry.slug === lease.slug) + 1,
    rankGasEver:
      gasEverByLease.findIndex((entry) => entry.slug === lease.slug) + 1,
    shareOfRecordValue: recordTotal > 0 ? (yourValue / recordTotal) * 100 : 0,
    shareOfRecordLastMonth:
      lastMonthTotal > 0 ? (lastMonthShare / lastMonthTotal) * 100 : 0,
    shareOfRecordGasEver:
      gasEverTotal > 0 ? (yourGasEver / gasEverTotal) * 100 : 0,
    recordBars: bars,
    recordTotal,
    modelWanted: series.modelGas[filedThrough] * interest,
    statePosted: series.gas[filedThrough] * interest,
    modelMissPercent:
      series.modelGas[filedThrough] > 0
        ? (series.gas[filedThrough] / series.modelGas[filedThrough] - 1) * 100
        : 0,

    valuePerAcre: lease.acres > 0 ? yourValue / lease.acres : 0,
    realisedGas: trailingGas > 0 ? (trailingShare * 0.56) / trailingGas : 0,
    realisedOil: trailingOil > 0 ? (trailingShare * 0.44) / trailingOil : 0,
    halfMadeBy: monthLabel(firstMonth + Math.max(halfIndex, 0)),
    halfMadeInMonths: Math.max(halfIndex - filedThrough, 0),
    acresPerWell: lease.wells > 0 ? lease.acres / lease.wells : 0,
    /* The state runs two to three months behind; the record's own last filed
       month against the newest month anywhere on the record is the measure. */
    stateBehindMonths: financialsSeries.lastPostedIndex - filedThrough + 3,
    projectedGasPercent:
      projectedRevenue > 0 ? (gasRevenue / projectedRevenue) * 100 : 0,
    projectedOilPercent:
      projectedRevenue > 0 ? (oilRevenue / projectedRevenue) * 100 : 0,
  };
}
