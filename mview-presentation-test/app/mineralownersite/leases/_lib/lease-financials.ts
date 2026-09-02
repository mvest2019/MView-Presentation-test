/**
 * THE FINANCIALS TAB'S DATA — monthly owner-share income, and the year summary.
 *
 * ONE LEASE CARRIES THIS TAB, and the tab says so in three places. Ledbetter
 * (74318) is the only lease in the prototype with a fully captured cash-flow
 * curve, so the monthly series is that lease's gross curve × this owner's
 * decimal interest. The other nine leases have no statement-level history to
 * chart; the design's answer is to chart the one that does and label it, rather
 * than to model nine curves and present them as posted figures.
 *
 * THE SERIES IS BAKED, NOT INTERPOLATED. The prototype derives these twelve
 * points at runtime from a 53-anchor table run through a linear interpolator
 * across 156 months (`LEDBETTER_ANCHORS` → `LEDBETTER_SERIES`), then reads
 * indices 71–82 out of it. Porting an interpolator to recover twelve numbers
 * would ship 140 unused points and an algorithm to every reader. The twelve
 * values below were computed with that exact algorithm and are recorded as
 * data; the derivation is stated here so it can be re-run if the anchors move.
 *
 *   share = LEDBETTER_SERIES[i] × 1000 × 0.002437   for i in 71…82
 */

export interface MonthlyIncomePoint {
  /** Short month label, as the chart's x-axis prints it. */
  label: string;
  /** Owner-share dollars for the month. */
  share: number;
  /** Gross lease cash flow in thousands — the model input, kept for audit. */
  grossThousands: number;
}

export const monthlyIncome: MonthlyIncomePoint[] = [
  { label: "Jul 2025", share: 186.84, grossThousands: 76.67 },
  { label: "Aug 2025", share: 176.28, grossThousands: 72.33 },
  { label: "Sep 2025", share: 165.72, grossThousands: 68 },
  { label: "Oct 2025", share: 160.03, grossThousands: 65.67 },
  { label: "Nov 2025", share: 154.34, grossThousands: 63.33 },
  { label: "Dec 2025", share: 148.66, grossThousands: 61 },
  { label: "Jan 2026", share: 182.78, grossThousands: 75 },
  { label: "Feb 2026", share: 203.49, grossThousands: 83.5 },
  /* The March step up is the oil spike — WTI at $102.92 that month. */
  { label: "Mar 2026", share: 224.2, grossThousands: 92 },
  { label: "Apr 2026", share: 188.87, grossThousands: 77.5 },
  { label: "May 2026", share: 153.53, grossThousands: 63 },
  { label: "Jun 2026", share: 129.16, grossThousands: 53 },
];

/** The lease the whole tab is derived from, named wherever a figure appears. */
export const incomeBasis = {
  leaseTitle: "Ledbetter (74318)",
  leaseNumber: "74318",
  decimalInterest: 0.002437,
  /** Why March steps up, in the chart's own footnote. */
  peakNote: "The March bump is the oil spike ($102.92).",
} as const;

/** The most recent month on the curve — the Financials tab's lead KPI. */
export const latestMonth = monthlyIncome[monthlyIncome.length - 1];

/**
 * OWNER-SHARE INCOME, YEAR TO DATE — the calendar months of 2026 on the curve.
 *
 * FROM THE CURVE, NOT FROM THE STATEMENTS, and the prototype's JavaScript is why:
 * `drawFinTrend()` computes this as `sum(LEDBETTER_SERIES[77..82]) × 1000 × DI`
 * — indices 77 to 82 being Jan to Jun 2026 — and writes it into the row as
 * "$1,082 (Jan–Jun)". The `$540` sitting in that cell in `app-leases.html` is
 * stale markup that never reaches a reader, exactly like the `$118` in the Jun
 * KPI beside it, which the same function overwrites with the curve's last month.
 *
 * WORTH KNOWING WHILE READING THE TWO TABS. The Financials tab is the CURVE
 * throughout — this figure, the chart, and the Jun KPI all come from it. The
 * Monthly Reports tab is the STATEMENTS, which are a separate fixture and do not
 * agree with the curve month for month (Jun: $118 posted against $129 modelled).
 * Both are labelled on screen; see the note in `lease-statements.ts`.
 */
export const yearToDateIncome = monthlyIncome
  .filter((point) => point.label.endsWith("2026"))
  .reduce((total, point) => total + point.share, 0);

/** The month range `yearToDateIncome` covers, as the row prints it. */
export const yearToDateRange = "Jan–Jun";
