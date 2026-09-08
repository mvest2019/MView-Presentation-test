/**
 * THE MONTHLY REPORTS TAB — seven owner-share statements.
 *
 * SOURCE · Mongo.Monthly_Reporting_DB.monthly_reports
 *          (report_month, report_url, download_report, ismailsent)
 *
 * WHY THESE FIGURES ARE NOT `lease-financials.ts`'s SERIES. They are close but
 * not equal — this table prints $118 for Jun 2026 where the chart derives
 * $129.16 for the same month — because the prototype holds them as two separate
 * illustrative fixtures: the chart interpolates a model curve, the table lists
 * statement records. Both are labelled derived/illustrative on the page.
 *
 * Kept apart rather than reconciled, deliberately. Making one feed the other
 * would be inventing a relationship the design does not claim, and in the real
 * product these genuinely are different things: a statement is what was
 * reported for a month, the curve is what the model projects for it. Worth
 * confirming against `monthly_reports` when the DB is reachable — flagged
 * rather than quietly averaged.
 */

export type StatementStatus = "ready" | "archived";

export interface Statement {
  /** `YYYY-MM` — the id, and what a deep link to a statement would carry. */
  month: string;
  label: string;
  /** Owner-share income for the month, derived (see the file note). */
  share: number;
  status: StatementStatus;
}

export const statements: Statement[] = [
  { month: "2026-06", label: "Jun 2026", share: 118, status: "ready" },
  { month: "2026-05", label: "May 2026", share: 138, status: "ready" },
  { month: "2026-04", label: "Apr 2026", share: 171, status: "ready" },
  { month: "2026-03", label: "Mar 2026", share: 203, status: "ready" },
  { month: "2026-02", label: "Feb 2026", share: 185, status: "ready" },
  { month: "2026-01", label: "Jan 2026", share: 167, status: "ready" },
  { month: "2025-12", label: "Dec 2025", share: 134, status: "archived" },
];

/** How many statements this record holds for the current year. */
export const statementsThisYear = statements.filter((statement) =>
  statement.month.startsWith("2026"),
).length;
