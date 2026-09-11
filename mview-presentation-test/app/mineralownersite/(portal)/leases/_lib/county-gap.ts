import type { LeaseRecord } from "./lease-types";

/**
 * THE MVESTIMATE / COUNTY-ROLL COMPARISON, IN ONE PLACE.
 *
 * The two figures answer different questions — ours is a forward cash-flow
 * projection, the county's is a conservative annual tax value that lags about a
 * year — so they are never expected to match exactly. What the page flags is a
 * gap wide enough to be worth opening the lease over.
 *
 * THE BAND IS HALF TO DOUBLE. Inside it the row says "These agree"; outside it
 * the row says "Worth a look" and prints the multiple, so the reader sees the
 * size of the gap rather than only that there is one. A flag is not a warning
 * about anybody's money — it usually means the two methods disagree about
 * timing, which is exactly what the explainer above the table says.
 */

const AGREEMENT_LOW = 0.5;
const AGREEMENT_HIGH = 2;

export type CountyGap =
  | { kind: "agree" }
  | { kind: "worth-a-look"; ratio: string }
  | { kind: "no-roll-value" };

export function countyGap(lease: LeaseRecord): CountyGap {
  /* Guarded rather than assumed: `x / 0` prints "Infinityx", and a lease with
     no value on the roll has nothing to compare against in the first place. */
  if (lease.countyAppraised === 0) return { kind: "no-roll-value" };

  const ratio = lease.mvestimate / lease.countyAppraised;

  if (ratio >= AGREEMENT_LOW && ratio <= AGREEMENT_HIGH) return { kind: "agree" };

  return { kind: "worth-a-look", ratio: ratio.toFixed(1) };
}
