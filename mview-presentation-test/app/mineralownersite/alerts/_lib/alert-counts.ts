import { alertRecords } from "./alert-records";
import type { AlertCategory, AlertRecord } from "./alert-types";

/**
 * EVERY COUNT ON THE PAGE, DERIVED ONCE — the whole point of v50 · BG-03.
 *
 * The reference computes these in the browser by querying the rendered rows,
 * because its rows are hand-written HTML and there is nothing else to count.
 * Here the rows come from `alertRecords`, so the same figures are computed on
 * the server, at module scope, and shipped as numbers instead of as a script
 * that rewrites the page after paint.
 *
 * That difference is worth stating plainly: in the reference these numbers are
 * WRONG for one frame and correct afterwards, and wrong permanently if the
 * script fails. Here they cannot disagree with the list, because they are the
 * list.
 *
 * SIX SURFACES READ THESE — the filter pills, the watch ledger, the Essentials
 * one-liner, the Ultra hero's silence, the dashboard rollup and the sidebar
 * badge. None of them may hold its own copy.
 */

export interface AlertCounts {
  total: number;
  /** How many ask something of the reader. See `actionRecommended` below. */
  action: number;
  /** Everything that is not action-recommended. */
  rest: number;
  unread: number;
  byCategory: Record<AlertCategory, number>;
}

/**
 * "ASKS SOMETHING OF YOU" IS EXACTLY `severity === "action"`, and nothing else.
 *
 * Not "unread", not "money", not "urgent delivery". The reference counts the
 * rows carrying the urgent priority badge, which is one row: Ledbetter produced
 * gas in months we can see. Widening this predicate is how a page that says "one
 * thing needs you" turns into a page that says four things do — which is the
 * inbox anxiety the whole design is built to avoid.
 */
export function actionRecommended(alert: AlertRecord): boolean {
  return alert.severity === "action";
}

export function countAlerts(records: AlertRecord[]): AlertCounts {
  const byCategory: Record<AlertCategory, number> = {
    money: 0,
    activity: 0,
    community: 0,
    model: 0,
  };

  let action = 0;
  let unread = 0;

  for (const alert of records) {
    byCategory[alert.category] += 1;
    if (actionRecommended(alert)) action += 1;
    if (alert.unread) unread += 1;
  }

  return {
    total: records.length,
    action,
    rest: records.length - action,
    unread,
    byCategory,
  };
}

/** The demo record's counts. Every surface imports this one object. */
export const alertCounts = countAlerts(alertRecords);
