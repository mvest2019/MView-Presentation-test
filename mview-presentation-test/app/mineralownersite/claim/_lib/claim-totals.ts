import { claimLeases, type ClaimLease } from "./claim-records";

/**
 * EVERY SUMMARY FIGURE ON STEPS 4 AND 5, DERIVED IN ONE PLACE.
 *
 * The stat strip prints six numbers, the progress bar prints a seventh, and the
 * visibility step re-sorts the same leases by value. Written into the markup
 * they are seven chances for the page to contradict its own table — and the
 * design's mock already does contradict it: its stat strip reads $64,375 while
 * its ten rows add up to $64,395. Deriving them means the table is the single
 * source and the discrepancy cannot recur.
 */
export const claimTotals = {
  count: claimLeases.length,
  producing: claimLeases.filter((lease) => lease.producing).length,
  inactive: claimLeases.filter((lease) => !lease.producing).length,
  operators: new Set(
    claimLeases.map((lease) => lease.operator).filter(Boolean),
  ).size,
  counties: new Set(claimLeases.map((lease) => lease.county)).size,
  countyList: [...new Set(claimLeases.map((lease) => lease.county))].join(", "),
  value: claimLeases.reduce((sum, lease) => sum + lease.value, 0),
  decimal: claimLeases.reduce((sum, lease) => sum + lease.decimal, 0),
} as const;

/*
 * `producingShare` LIVED HERE and is gone with the bar it filled — it was a
 * presentation figure for one removed element, not part of the lease set.
 *
 * The `claimTotals` members that bar and the two removed tiles read — `value`,
 * `decimal`, `counties` — are deliberately KEPT even though nothing prints them
 * today. This object is the model of the joined lease set, and its completeness
 * is the whole reason it exists: the day the total comes back, it comes back
 * derived from the table rather than typed in beside it, which is the defect
 * documented at the top of this file.
 */

/**
 * Step 5's order, and its pre-selection: descending MVestimate.
 *
 * The design states the rule ("pre-selection is by descending MVestimate") and
 * then hand-orders the grid to match. Sorting here means the two cannot drift,
 * and the free lease is simply the first element rather than a second lookup.
 *
 * `toSorted` and not `sort`, so the module-level `claimLeases` array is not
 * reordered underneath step 4's table, which prints it in record order.
 */
export const leasesByValue: ClaimLease[] = claimLeases.toSorted(
  (a, b) => b.value - a.value,
);

/** `$9,268`. Whole dollars — no lease value in this flow carries cents. */
export function money(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** `0.00376000` — decimal interest is always shown to eight places, as filed. */
export function decimalInterest(value: number): string {
  return value.toFixed(8);
}
