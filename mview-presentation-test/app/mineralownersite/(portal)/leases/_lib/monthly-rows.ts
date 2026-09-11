import { financialsSeries } from "./financials-series";
import { cashAt } from "./price-deck";
import { shortMonthLabel } from "./months";

/**
 * THE ROWS UNDER THE CHART — one month each, newest first.
 *
 * ── THE SAME NUMBERS AS THE CHART, FROM THE SAME PLACE ──
 *
 * Every figure here is read off `financialsSeries` and priced with the same
 * realised deck the cash-flow view uses. That is the whole reason this is a
 * function over the series rather than its own fixture: a table sitting
 * directly beneath a chart, disagreeing with it by a few percent, is worse than
 * having no table — a reader who notices stops trusting both.
 *
 * ── WHY THIS SLICE AND NOT THE WHOLE RECORD ──
 *
 * 261 rows is not a table anybody reads; it is a data dump with a header. The
 * window is the twelve months ahead and the four years behind — far enough back
 * to see a seasonal shape and a shut-in, far enough forward to see where the
 * model is taking it, and it fits on a screen a reader can scroll once.
 *
 * NEWEST FIRST, which is the opposite of the chart's direction and is right for
 * both: a chart is read left to right because it is a shape over time, and a
 * table is read top down because the reader came for the most recent month.
 */

/** How far past the last filing the table runs. */
const MONTHS_AHEAD = 12;
/** And how far behind it. */
const MONTHS_BEHIND = 48;

/**
 * A fall this steep is worth a second look — a shut-in, a workover, or a month
 * that was filed late and will be restated. Anything shallower is the ordinary
 * jitter of production and colouring it would make the column a wall of red.
 */
export const STEEP_DROP_PERCENT = -15;

export interface MonthlyRow {
  /** Index into `financialsSeries`, and the React key. */
  index: number;
  /** "Jun 2027". */
  month: string;
  gas: number;
  oil: number;
  cash: number;
  /** Cash against the month before it, in percent. Null only at the record's start. */
  changePercent: number | null;
  /** After the last filing: a model output, not a filing. */
  projected: boolean;
}

export const MONTHLY_WINDOW_COPY = "the year ahead and four behind · newest first";

/**
 * `scale` is the scope factor — 1 for the whole lease, the blended decimal for
 * the owner's share. Passed in rather than read here so the table cannot show a
 * different scope from the tiles and the chart above it.
 */
export function monthlyRows(scale: number): MonthlyRow[] {
  const { gas, oil, lastPostedIndex, firstMonth, length } = financialsSeries;

  const newest = Math.min(lastPostedIndex + MONTHS_AHEAD, length - 1);
  const oldest = Math.max(lastPostedIndex - (MONTHS_BEHIND - 1), 0);

  const rows: MonthlyRow[] = [];
  for (let index = newest; index >= oldest; index -= 1) {
    const rowGas = gas[index] * scale;
    const rowOil = oil[index] * scale;
    const filed = index <= lastPostedIndex;
    const cash = cashAt({
      gas: rowGas,
      oil: rowOil,
      monthOfYear: (firstMonth + index) % 12,
      index,
      filed,
    });

    /* The comparison reaches OUTSIDE the window at the bottom row, which is
       what makes the oldest row's percentage real rather than blank — the
       series holds every month back to 2009 whether the table prints it or
       not. */
    const priorIndex = index - 1;
    const prior =
      priorIndex >= 0
        ? cashAt({
            gas: gas[priorIndex] * scale,
            oil: oil[priorIndex] * scale,
            monthOfYear: (firstMonth + priorIndex) % 12,
            index: priorIndex,
            filed: priorIndex <= lastPostedIndex,
          })
        : 0;

    rows.push({
      index,
      month: shortMonthLabel(firstMonth + index),
      gas: rowGas,
      oil: rowOil,
      cash,
      changePercent: prior > 0 ? ((cash - prior) / prior) * 100 : null,
      projected: !filed,
    });
  }
  return rows;
}
