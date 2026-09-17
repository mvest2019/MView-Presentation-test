import type { LeaseFinancials } from "../_api/leases-api";
import type { FinancialsScope } from "./financials-record";
import { MONTHS_AHEAD, MONTHS_BEHIND, type MonthlyRow } from "./monthly-rows";
import { shortMonthLabel } from "./months";

/**
 * THE ROWS UNDER THE CHART, BUILT FROM THE SERVICE'S OWN ANSWER.
 *
 * ── WHY THIS SITS BESIDE `monthlyRows` RATHER THAN REPLACING IT ──
 *
 * `monthly-rows.ts` builds the same rows out of the fixture series and prices
 * them with the local deck. `MonthTable` was its only caller, so as of this
 * change `monthlyRows` itself has none — it is left in place rather than
 * deleted because the decisions AROUND it are still live and still shared:
 * `MonthlyRow` is the row shape both tables render, `STEEP_DROP_PERCENT` is the
 * threshold the table colours on, and `MONTHS_AHEAD`/`MONTHS_BEHIND` are the
 * window. Those are design decisions about how much of a record is worth
 * printing, and two tables that disagreed about them would be two answers to
 * one question. Deleting the builder is a tidy-up to make deliberately, once
 * nothing is waiting on the fixture path.
 *
 * ── THE SAME NUMBERS AS THE CHART, FROM THE SAME PLACE ──
 *
 * Every figure here is read off the same three arrays the chart plots, at the
 * same scope, so a month read off the polyline and the same month read out of
 * the table cannot disagree. There is no pricing step at all now: `cash` is the
 * service's `cash_share`/`cash_gross` for that month, not gas and oil put
 * through a deck in the browser. A table sitting directly beneath a chart and
 * disagreeing with it by a few percent is worse than having no table — a reader
 * who notices stops trusting both.
 *
 * ── WHY THIS SLICE AND NOT THE WHOLE RECORD ──
 *
 * 523 rows is not a table anybody reads; it is a data dump with a header. The
 * window is the twelve months ahead of the last filing and the four years
 * behind it — far enough back to see a seasonal shape and a shut-in, far enough
 * forward to see where the model is taking it.
 *
 * NEWEST FIRST, which is the opposite of the chart's direction and is right for
 * both: a chart is read left to right because it is a shape over time, and a
 * table is read top down because the reader came for the most recent month.
 */
export function financialsRows(
  data: LeaseFinancials,
  scope: FinancialsScope,
): MonthlyRow[] {
  const streams = scope === "share" ? data.share : data.lease;
  const { firstMonth, lastPostedIndex, length } = data;

  const newest = Math.min(lastPostedIndex + MONTHS_AHEAD, length - 1);
  const oldest = Math.max(lastPostedIndex - (MONTHS_BEHIND - 1), 0);

  const rows: MonthlyRow[] = [];
  for (let index = newest; index >= oldest; index -= 1) {
    const cash = streams.cash[index] ?? 0;

    /* The comparison reaches OUTSIDE the window at the bottom row, which is
       what makes the oldest row's percentage real rather than blank — the
       record holds every month back to 1993 whether the table prints it or
       not. Only the record's very first month has nothing to compare against,
       and that row prints an em dash. */
    const priorIndex = index - 1;
    const prior = priorIndex >= 0 ? (streams.cash[priorIndex] ?? 0) : null;

    rows.push({
      index,
      month: shortMonthLabel(firstMonth + index),
      gas: streams.gas[index] ?? 0,
      oil: streams.oil[index] ?? 0,
      cash,
      /* A month after nothing, or after a month that cleared nothing, has no
         percentage — dividing by zero would print `Infinity%` on the row after
         a shut-in, which is the row a reader looks hardest at. */
      changePercent:
        prior === null || prior === 0 ? null : ((cash - prior) / prior) * 100,
      projected: index > lastPostedIndex,
    });
  }

  return rows;
}
