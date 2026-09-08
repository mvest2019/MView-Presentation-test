import { leaseRecords } from "./lease-records";
import { inactiveLeases, mvestimateTotal } from "./lease-totals";
import type { LeaseRecord } from "./lease-types";

/**
 * "EXPLAIN THIS ESTIMATE" — how $26,340 is reached, lease by lease.
 *
 * The rule the design states, in one line:
 *
 *     gross six-year projection  ×  your decimal interest  →  nearest $100
 *
 * WHAT THIS FILE DOES AND DOES NOT CLAIM. The rounded owner-share column is the
 * lease record's `mvestimate` — the anchor number the whole portal prints. The
 * gross column is `MVestimateCalculations.total_cashflow_mean_sum` and is NOT
 * in the fixture, so it is carried here as the prototype's own figures.
 *
 * ⚠ THE TWO COLUMNS DO NOT RECONCILE IN THE SOURCE, and the panel's copy
 * invites the reader to check ("multiply any row yourself"). The prototype's
 * gross for Smith 305892 is $1,099,456, which times 0.00538700 is $5,922 — not
 * the $8,700 the same row prints as the product. Every row is out by a similar
 * factor. Reconciling it means either changing the gross figures (a DB-sourced
 * column) or changing $26,340 (the number six other surfaces lead with), and
 * neither is a decision this conversion should make silently.
 *
 * So: the gross figures are ported verbatim, `unrounded` is the design's own
 * stated product rather than a computed one, and `derivationReconciles` below
 * reports whether the arithmetic holds. The panel reads that flag and drops the
 * "multiply any row yourself" invitation while it is false — the table still
 * shows every input, so nothing is hidden; the page just stops claiming an
 * arithmetic that does not hold yet. Fix the gross column in the DB and the
 * invitation returns on its own.
 */

export interface DerivationRow {
  /** Present for a real lease; absent on the collapsed inactive row. */
  lease?: LeaseRecord;
  label: string;
  /** The design's own gross figure, or its honest placeholder text. */
  grossDisplay: string;
  /** `null` on the collapsed row, which has no single decimal interest. */
  decimalInterest: number | null;
  /** The product as the design prints it, to the cent. */
  unroundedDisplay: string;
  /** The rounded owner share — the lease record's own `mvestimate`. */
  rounded: number;
  /** Trailing note, e.g. which county values stand in for the three zeros. */
  note?: string;
}

/**
 * Gross model input per lease, keyed by lease number.
 * SOURCE · Mongo.ProdMvestPortal.MVestimateCalculations.total_cashflow_mean_sum
 * — see the reconciliation warning above before trusting these against the
 * rounded column.
 */
const GROSS_MODEL_INPUT: Record<string, number> = {
  "305892": 1099456,
  "74318": 2855736,
  "423065": 487142,
  "578204": 1458241,
  "619473": 1237296,
  "391756": 1016350,
  "480329": 260715,
};

/** The exact products the design prints, to the cent. */
const UNROUNDED_DISPLAY: Record<string, string> = {
  "305892": "$8,700.00",
  "74318": "$5,300.00",
  "423065": "$4,100.05",
  "578204": "$3,000.00",
  "619473": "$2,600.00",
  "391756": "$2,100.00",
  "480329": "$540.00",
};

const dollars = (value: number) => `$${value.toLocaleString("en-US")}`;

/**
 * One row per producing lease, then ONE collapsed row for the three inactive
 * ones — the design's own grouping. Three separate `$0` rows would give a third
 * of the table's height to the leases that contribute nothing, and the county
 * figures standing in for those zeros are the only thing worth saying about
 * them here.
 */
export const derivationRows: DerivationRow[] = [
  ...leaseRecords
    .filter((lease) => lease.mvestimate > 0)
    .map((lease) => ({
      lease,
      label: `${lease.name} (${lease.number})`,
      grossDisplay: dollars(GROSS_MODEL_INPUT[lease.number] ?? 0),
      decimalInterest: lease.decimalInterest,
      unroundedDisplay: UNROUNDED_DISPLAY[lease.number] ?? "—",
      rounded: lease.mvestimate,
    })),
  {
    label: inactiveLeases
      .map((lease) => `${lease.name.split(" ")[0]} (${lease.number})`)
      .join(" · "),
    grossDisplay: "~$0 forward",
    decimalInterest: null,
    unroundedDisplay: "~$0",
    rounded: 0,
    note: `county values ${inactiveLeases
      .map((lease) => dollars(lease.countyAppraised))
      .join(" · ")} shown instead`,
  },
];

export const derivationTotal = mvestimateTotal;

/**
 * Does every row's stated product actually equal gross × DI, to the dollar?
 *
 * Checked at module load over the fixture rather than asserted in prose, so the
 * panel's copy tracks the data instead of a comment tracking the data. A dollar
 * of tolerance absorbs the rounding in the printed cents.
 */
export const derivationReconciles: boolean = derivationRows.every((row) => {
  if (!row.lease || row.decimalInterest === null) return true;
  const gross = GROSS_MODEL_INPUT[row.lease.number];
  if (gross === undefined) return false;
  const stated = Number(row.unroundedDisplay.replace(/[$,]/g, ""));
  return Math.abs(gross * row.decimalInterest - stated) < 1;
});
