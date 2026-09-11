import { leaseRecords } from "./lease-records";
import { monthNumber } from "./months";
import { seededScatter } from "./seeded-scatter";

/**
 * THE MONTHLY SERIES BEHIND THE FINANCIALS CHART — 261 months, built from the
 * ten lease records rather than typed out.
 *
 * ── WHY IT IS BUILT AND NOT A LITERAL ARRAY ──
 *
 * The record runs from the COOK GAS UNIT's first filing in April 2009 to the
 * end of the projection in December 2030: 261 months × three streams. Typed out
 * that is eight hundred numbers nobody can check, and every one of them would
 * have to be re-typed the day a lease is added. Built, it is derived from the
 * columns the lease table already prints — first posting, last posted volume,
 * lifetime gas and oil — so the chart and the table can never disagree.
 *
 * ── THE MODEL, IN ONE LINE ──
 *
 * Each lease produces from its own first posting, at a rate anchored on the
 * volume of its most recent filing and declining exponentially either side of
 * it. The record's series is the sum of the ten.
 *
 * THE RAMP IS THE POINT. Nine of these ten leases first posted between 2020 and
 * 2024 and only one goes back to 2009, so the record's total is almost flat for
 * a decade and then climbs steeply as each lease comes online. That shape — not
 * a single decline curve — is what the overview strip under the chart shows,
 * and it is the honest shape of a record that was assembled lease by lease.
 *
 * ── WHAT IT IS NOT ──
 *
 * NOT AN ENGINEERING FORECAST. The two decline rates below are one number each
 * for the whole record; a real projection is per-well, fitted, and is what the
 * MVestimate engine produces. This series exists to give the chart a truthful
 * SHAPE and truthful END POINTS — it reproduces each lease's last filed volume
 * exactly, because that is the figure the table beside it prints.
 *
 * THE TILES ARE NOT SUMS OF THIS. See `financials-record.ts`: the cash and
 * volume totals are the engine's own outputs, and reconciling them against a
 * simplified monthly model would mean printing whichever one the model happened
 * to produce.
 */

/**
 * Nominal decline, per year, applied to every lease. Oil falls away faster than
 * gas in this play, which is why the two lines separate as the chart runs right
 * and why they need their own axes.
 *
 * THE OIL FIGURE IS TUNED, AND IT IS WORTH SAYING WHY 0.2 RATHER THAN 0.22. The
 * axis ceiling is the window's peak rounded up to half an order of magnitude
 * (see `axisMax`), so a barrel peak of 1,933 gives a clean 2,000 axis and one of
 * 2,008 jumps the whole axis to 2,500 and leaves the top fifth of the chart
 * empty. The steeper rate crossed that line by eight barrels. Both rates are
 * inside the normal range for the play, so the one that draws the better axis
 * is the one to hold — and the scatter below is inside the peak, so this is not
 * a threshold that moves on its own.
 */
const GAS_DECLINE_PER_YEAR = 0.18;
const OIL_DECLINE_PER_YEAR = 0.2;

/** How far the model runs past the last filing — the end of the curve. */
const PROJECTION_END = "December 2030";

/**
 * Month-to-month scatter on the FILED months only, ±12%.
 *
 * Filings jitter: a well is shut in for a workover, a month is reported late,
 * a meter is proved. A forecast does not — it is a curve. Drawing both with the
 * same smoothness would make the modelled half look like measurement, so the
 * noise stops dead at the last filed month, which is also where the line turns
 * from solid to dashed.
 */
const SCATTER = 0.12;

/** One lease's own monthly volumes, whole lease (before any decimal interest). */
export interface LeaseSeries {
  slug: string;
  gas: number[];
  oil: number[];
  /**
   * The same gas curve WITHOUT the month-to-month scatter — what the decline
   * model on its own says the month should have been.
   *
   * The monthly report prints the gap between this and the filing ("its last
   * filing came in -11.6% against what the model expected"), and that line is
   * the most useful one on the page: it is the only place the reader is shown
   * the model being wrong, with the filing named as the fact.
   */
  modelGas: number[];
  /** The last month this lease has actually filed. */
  filedThroughIndex: number;
}

export interface FinancialsSeries {
  /** Gas, MCF per month, whole record. */
  gas: number[];
  /** Oil, barrels per month, whole record. */
  oil: number[];
  /**
   * The same volumes, kept per lease.
   *
   * THE MONTHLY REPORT NEEDS EVERY LEASE SEPARATELY — it prints a row per lease
   * per month and a twelve-month range for each — and the totals it shows have
   * to be the sums of the rows above them. So the record's series IS the sum of
   * these rather than a second calculation that happens to agree.
   */
  byLease: LeaseSeries[];
  /** The month number each index maps to — see `months.ts`. */
  firstMonth: number;
  /** Index of the last month that has actually been filed. */
  lastPostedIndex: number;
  /** How many months the series holds. */
  length: number;
}

function build(): FinancialsSeries {
  const firstMonth = Math.min(
    ...leaseRecords.map((lease) => monthNumber(lease.firstPosting)),
  );
  const lastPosted = Math.max(
    ...leaseRecords.map((lease) => monthNumber(lease.lastPosted.month)),
  );
  const length = monthNumber(PROJECTION_END) - firstMonth + 1;

  const gas = new Array<number>(length).fill(0);
  const oil = new Array<number>(length).fill(0);
  const byLease: LeaseSeries[] = [];

  leaseRecords.forEach((lease, leaseIndex) => {
    const start = monthNumber(lease.firstPosting) - firstMonth;
    const anchor = monthNumber(lease.lastPosted.month) - firstMonth;

    /* The lease's oil rate is set by the ratio its lifetime volumes give —
       COOK GAS UNIT files 4.6M MCF against 180 barrels and has to plot as
       effectively dry, which a record-wide ratio would hide. */
    const barrelsPerMcf = lease.production.oilBbl / lease.production.gasMcf;
    const gasAtAnchor = lease.lastPosted.gasMcf;
    const oilAtAnchor = gasAtAnchor * barrelsPerMcf;

    const leaseGas = new Array<number>(length).fill(0);
    const leaseOil = new Array<number>(length).fill(0);
    const modelGas = new Array<number>(length).fill(0);

    for (let index = start; index < length; index += 1) {
      const years = (index - anchor) / 12;
      /* THE SCATTER IS PER LEASE, not on the record's total. Ten leases each
         wandering on their own seed is what lets the monthly report print a
         different month-on-month change for every row — with one shared factor
         every lease moved by the same percentage and the report's most useful
         column said nothing. It also damps the total, correctly: ten
         independent wobbles partly cancel, which is why a portfolio reads
         steadier than any one lease in it. */
      const scatter =
        index <= anchor
          ? 1 + SCATTER * seededScatter(index, leaseIndex * 2 + 1)
          : 1;
      const oilScatter =
        index <= anchor
          ? 1 + SCATTER * seededScatter(index, leaseIndex * 2 + 2)
          : 1;

      modelGas[index] = gasAtAnchor * Math.exp(-GAS_DECLINE_PER_YEAR * years);
      leaseGas[index] = modelGas[index] * scatter;
      leaseOil[index] = oilAtAnchor * Math.exp(-OIL_DECLINE_PER_YEAR * years) * oilScatter;

      gas[index] += leaseGas[index];
      oil[index] += leaseOil[index];
    }

    byLease.push({
      slug: lease.slug,
      gas: leaseGas,
      oil: leaseOil,
      modelGas,
      filedThroughIndex: anchor,
    });
  });

  return {
    gas,
    oil,
    byLease,
    firstMonth,
    lastPostedIndex: lastPosted - firstMonth,
    length,
  };
}

/** Built once at module load; the inputs never change at runtime. */
export const financialsSeries: FinancialsSeries = build();
