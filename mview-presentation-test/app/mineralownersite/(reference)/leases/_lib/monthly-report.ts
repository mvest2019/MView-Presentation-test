import { financialsSeries, type LeaseSeries } from "./financials-series";
import { leaseRecords } from "./lease-records";
import { monthLabel } from "./months";
import { cashAt } from "./price-deck";
import type { LeaseRecord } from "./lease-types";

/**
 * ONE MONTH'S REPORT, BUILT FROM THE RECORD.
 *
 * ── EVERY FIGURE ON ALL TWELVE PAGES COMES FROM HERE ──
 *
 * The report is a dozen sections describing the same month from different
 * angles, so the one thing it must not do is describe it differently in two of
 * them. Page 2 says "$104,445 across 9 reporting leases", page 5 totals a
 * column to the same number, page 9 talks through each lease that made it up,
 * and page 1 summarises all three. They agree because they all read this object.
 *
 * ── "YOUR SHARE" IS PER LEASE, NOT A BLENDED RATE ──
 *
 * The Financials tab uses one blended 4.3% because it is drawing a portfolio
 * shape. This report does not: every row applies that lease's OWN decimal
 * interest, from 1.0748% on COOK GAS UNIT to 5.138% on the MCCABE leases, and
 * page 1 says so in as many words. A blended rate would be wrong for all ten
 * rows and right for none — which matters to a reader holding a statement for
 * one of them.
 *
 * ── A LEASE THAT DID NOT FILE IS NOT A LEASE THAT STOPPED ──
 *
 * Each lease has its own last filed month and on this record they do not all
 * agree: KAISER GAS UNIT's is May 2026 while the other nine reach June. So the
 * June report is "9 of 10 filed", the missing one reads "not filed" rather than
 * zero, and nothing about it is averaged into the month. The state posts late
 * far more often than a well stops, and printing 0 MCF for a late filing
 * invents a shut-in.
 */

/** How far back the twelve-month statistics reach. */
const TRAILING_MONTHS = 12;

/** Average days in a month, for the per-day rates the report quotes. */
const DAYS_PER_MONTH = 30.4;

export interface ReportLeaseRow {
  slug: string;
  /** "MCCABE ETAL GU · Lease 290271". */
  title: string;
  county: string;
  operator: string;
  reservoir: string;
  acres: number;
  wells: number;
  firstPosting: string;
  decimalInterest: number;

  /** Did this lease file for the report's month? */
  filed: boolean;
  /** Whole-lease gas for the month, MCF. */
  wholeGas: number;
  yourGas: number;
  yourOil: number;
  /** Your money for the month, at this lease's own interest. */
  yourShare: number;
  /** The whole lease's revenue for the month, before your decimal. */
  leaseRevenue: number;
  /** Against the month before, on your share. Null when either month is absent. */
  changePercent: number | null;

  /** Rates for the month, whole lease. */
  gasPerDay: number;
  oilPerDay: number;

  /** The trailing twelve filed months, which is what the month is judged against. */
  trailing: {
    avgGasPerDay: number;
    avgOilPerDay: number;
    lowGasPerDay: number;
    highGasPerDay: number;
    bestMonth: string;
    worstMonth: string;
    bestCashMonth: string;
    bestCash: number;
    thinCashMonth: string;
    thinCash: number;
    /** Your share this month against that average, in percent. */
    vsAveragePercent: number;
  };

  /** Barrels of oil per thousand MCF of gas — which product carries the money. */
  barrelsPerMmcf: number;
  /** The filing against the decline model, in percent. */
  modelMissPercent: number;
  /** "HURD ENTERPRISES, LTD. (June 2020–June 2026)". */
  operatorRange: string;
}

export interface ReportYear {
  year: number;
  gas: number;
  oil: number;
  share: number;
  /** A year the record only partly covers — its figures are not comparable. */
  partial: boolean;
}

export interface MonthlyReport {
  index: number;
  month: string;
  priorMonth: string;
  yearAgoMonth: string;

  leaseCount: number;
  filedCount: number;

  yourShare: number;
  yourGas: number;
  yourOil: number;
  wholeGas: number;

  /** Against the same month a year earlier — the comparison season cannot skew. */
  vsYearAgoPercent: number | null;
  /** The lease that carried the month. */
  topLease: { title: string; gasPercent: number; sharePercent: number };
  /** The steepest faller and riser, for the plain reading on page 2. */
  steepestFall: ReportLeaseRow | null;
  steepestRise: ReportLeaseRow | null;

  /** Filed leases first, ordered by what they paid; the non-filers last. */
  leases: ReportLeaseRow[];
  years: ReportYear[];
}

function seriesFor(slug: string): LeaseSeries {
  const found = financialsSeries.byLease.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`No series for lease ${slug}`);
  return found;
}

/** One lease's money for one month at a given interest — 1 for the whole lease. */
function cashFor(series: LeaseSeries, index: number, interest: number): number {
  return cashAt({
    gas: series.gas[index] * interest,
    oil: series.oil[index] * interest,
    monthOfYear: (financialsSeries.firstMonth + index) % 12,
    index,
    filed: index <= financialsSeries.lastPostedIndex,
  });
}

function percentChange(now: number, before: number): number | null {
  return before > 0 ? ((now - before) / before) * 100 : null;
}

function buildLeaseRow(lease: LeaseRecord, index: number): ReportLeaseRow {
  const series = seriesFor(lease.slug);
  const interest = lease.decimalInterest;
  const filed = index <= series.filedThroughIndex;

  const wholeGas = filed ? series.gas[index] : 0;
  const wholeOil = filed ? series.oil[index] : 0;
  const yourShare = filed ? cashFor(series, index, interest) : 0;

  /* THE TRAILING WINDOW ENDS AT THE LEASE'S OWN LAST FILED MONTH, not the
     report's. A lease that is one month behind still has twelve filed months to
     be measured against — they just end one month earlier, and measuring it
     against a window with a hole at the end would report a fall that is only a
     missing filing. */
  const trailingEnd = Math.min(index, series.filedThroughIndex);
  const trailingStart = Math.max(0, trailingEnd - (TRAILING_MONTHS - 1));

  let gasSum = 0;
  let oilSum = 0;
  let cashSum = 0;
  let low = Infinity;
  let high = 0;
  let bestMonth = "";
  let worstMonth = "";
  let bestCash = 0;
  let bestCashMonth = "";
  let thinCash = Infinity;
  let thinCashMonth = "";
  let months = 0;

  for (let m = trailingStart; m <= trailingEnd; m += 1) {
    const gas = series.gas[m];
    const cash = cashFor(series, m, interest);
    gasSum += gas;
    oilSum += series.oil[m];
    cashSum += cash;
    months += 1;

    if (gas > high) {
      high = gas;
      bestMonth = monthLabel(financialsSeries.firstMonth + m);
    }
    if (gas < low) {
      low = gas;
      worstMonth = monthLabel(financialsSeries.firstMonth + m);
    }
    if (cash > bestCash) {
      bestCash = cash;
      bestCashMonth = monthLabel(financialsSeries.firstMonth + m);
    }
    if (cash < thinCash) {
      thinCash = cash;
      thinCashMonth = monthLabel(financialsSeries.firstMonth + m);
    }
  }

  const avgShare = months > 0 ? cashSum / months : 0;
  const lastFiled = Math.min(index, series.filedThroughIndex);
  const modelGas = series.modelGas[lastFiled];

  return {
    slug: lease.slug,
    title: lease.number ? `${lease.name} · Lease ${lease.number}` : lease.name,
    county: lease.county,
    operator: lease.operator,
    reservoir: lease.reservoir,
    acres: lease.acres,
    wells: lease.wells,
    firstPosting: lease.firstPosting,
    decimalInterest: interest,

    filed,
    wholeGas,
    yourGas: wholeGas * interest,
    yourOil: wholeOil * interest,
    yourShare,
    leaseRevenue: filed ? cashFor(series, index, 1) : 0,
    changePercent:
      filed && index > 0 && index - 1 <= series.filedThroughIndex
        ? percentChange(yourShare, cashFor(series, index - 1, interest))
        : null,

    gasPerDay: wholeGas / DAYS_PER_MONTH,
    oilPerDay: wholeOil / DAYS_PER_MONTH,

    trailing: {
      avgGasPerDay: months > 0 ? gasSum / months / DAYS_PER_MONTH : 0,
      avgOilPerDay: months > 0 ? oilSum / months / DAYS_PER_MONTH : 0,
      lowGasPerDay: (low === Infinity ? 0 : low) / DAYS_PER_MONTH,
      highGasPerDay: high / DAYS_PER_MONTH,
      bestMonth,
      worstMonth,
      bestCashMonth,
      bestCash,
      thinCashMonth,
      thinCash: thinCash === Infinity ? 0 : thinCash,
      vsAveragePercent:
        avgShare > 0 ? ((yourShare - avgShare) / avgShare) * 100 : 0,
    },

    barrelsPerMmcf: gasSum > 0 ? (oilSum / gasSum) * 1000 : 0,
    modelMissPercent:
      modelGas > 0 ? ((series.gas[lastFiled] - modelGas) / modelGas) * 100 : 0,
    operatorRange: `${lease.operator.toUpperCase()} (${lease.firstPosting}–${lease.lastPosted.month})`,
  };
}

/**
 * Calendar years across the whole record, newest first.
 *
 * Built once at module load rather than per report: the years do not depend on
 * which month is being read, and the loop is 261 months across ten leases.
 */
function buildYears(): ReportYear[] {
  const { firstMonth, length } = financialsSeries;
  const byYear = new Map<
    number,
    { gas: number; oil: number; share: number; months: number }
  >();

  for (let index = 0; index < length; index += 1) {
    const year = Math.floor((firstMonth + index) / 12);
    const bucket = byYear.get(year) ?? { gas: 0, oil: 0, share: 0, months: 0 };

    for (const lease of leaseRecords) {
      const series = seriesFor(lease.slug);
      bucket.gas += series.gas[index] * lease.decimalInterest;
      bucket.oil += series.oil[index] * lease.decimalInterest;
      bucket.share += cashFor(series, index, lease.decimalInterest);
    }

    bucket.months += 1;
    byYear.set(year, bucket);
  }

  return [...byYear.entries()]
    .map(([year, bucket]) => ({
      year,
      gas: bucket.gas,
      oil: bucket.oil,
      share: bucket.share,
      partial: bucket.months < 12,
    }))
    .sort((a, b) => b.year - a.year);
}

const YEARS = buildYears();

export function buildMonthlyReport(index: number): MonthlyReport {
  const rows = leaseRecords.map((lease) => buildLeaseRow(lease, index));
  const filed = rows.filter((row) => row.filed);

  const yourGas = filed.reduce((total, row) => total + row.yourGas, 0);
  const yourOil = filed.reduce((total, row) => total + row.yourOil, 0);
  const yourShare = filed.reduce((total, row) => total + row.yourShare, 0);
  const wholeGas = filed.reduce((total, row) => total + row.wholeGas, 0);

  /* The year-ago comparison counts only leases that had filed by then, the same
     rule as the month itself — otherwise a lease that came online since would
     read as growth in the ones that were already there. */
  const yearAgo = index - 12;
  const yearAgoShare =
    yearAgo >= 0
      ? leaseRecords.reduce((total, lease) => {
          const series = seriesFor(lease.slug);
          return yearAgo <= series.filedThroughIndex
            ? total + cashFor(series, yearAgo, lease.decimalInterest)
            : total;
        }, 0)
      : 0;

  const ordered = [...filed].sort((a, b) => b.yourShare - a.yourShare);
  const top = ordered[0];

  const byChange = filed
    .filter((row) => row.changePercent !== null)
    .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0));

  return {
    index,
    month: monthLabel(financialsSeries.firstMonth + index),
    priorMonth: monthLabel(financialsSeries.firstMonth + index - 1),
    yearAgoMonth: monthLabel(financialsSeries.firstMonth + index - 12),

    leaseCount: rows.length,
    filedCount: filed.length,

    yourShare,
    yourGas,
    yourOil,
    wholeGas,

    vsYearAgoPercent: percentChange(yourShare, yearAgoShare),
    topLease: {
      title: top?.title ?? "",
      gasPercent: yourGas > 0 ? ((top?.yourGas ?? 0) / yourGas) * 100 : 0,
      sharePercent: yourShare > 0 ? ((top?.yourShare ?? 0) / yourShare) * 100 : 0,
    },
    steepestFall: byChange[0] ?? null,
    steepestRise: byChange[byChange.length - 1] ?? null,

    leases: ordered.concat(rows.filter((row) => !row.filed)),
    years: YEARS,
  };
}

/** The months a reader can pick, newest first — the last year of filings. */
export function reportMonthOptions(): { index: number; label: string }[] {
  const newest = financialsSeries.lastPostedIndex;
  return Array.from({ length: TRAILING_MONTHS }, (_, step) => ({
    index: newest - step,
    label: monthLabel(financialsSeries.firstMonth + newest - step),
  }));
}

export const DEFAULT_REPORT_INDEX = financialsSeries.lastPostedIndex;
