import type { FlowLease } from "./claim-types";

/**
 * FORMATTING AND DERIVATION, in one place.
 *
 * This replaced a fixtures module that computed the same figures from a
 * hard-coded lease list. The derivations survived the move and the data did
 * not: every total on steps 4 and 5 is still computed from the lease rows the
 * page is showing, so a stat tile cannot disagree with the table above it.
 */

/** `$9,268`. Whole dollars — no lease value in this flow carries cents. */
export function money(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Plan prices DO carry cents, unlike lease values. */
export function planPrice(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/**
 * `0.00376000` — decimal interest is shown to eight places, as filed.
 * `null` where the endpoint did not serve one; the table prints an em dash
 * rather than a fabricated zero, which would read as "no interest".
 */
export function decimalInterest(value: number | null): string {
  return value === null ? "—" : value.toFixed(8);
}

/** The summary figures steps 4 and 5 print, derived from the rows themselves. */
export function leaseTotals(leases: FlowLease[]) {
  const counties = [...new Set(leases.map((l) => l.county).filter(Boolean))];
  return {
    count: leases.length,
    producing: leases.filter((l) => l.producing).length,
    inactive: leases.filter((l) => !l.producing).length,
    operators: new Set(leases.map((l) => l.operator).filter(Boolean)).size,
    counties: counties.length,
    countyList: counties.join(", "),
    value: leases.reduce((sum, l) => sum + l.value, 0),
  };
}

/**
 * Step 5's order and its pre-selection: descending appraised value.
 *
 * `toSorted`, so the array the lease table is printing in roll order is not
 * reordered underneath it.
 */
export function byValueDesc(leases: FlowLease[]): FlowLease[] {
  return leases.toSorted((a, b) => b.value - a.value);
}

/**
 * A lease's stable identity within the flow.
 *
 * NOT the lease number: it is `null` outside the picked record's own county,
 * and it is not unique across counties either. County + name is what the
 * backend itself keys a lease on.
 */
export function leaseKey(lease: FlowLease): string {
  return `${lease.county}|${lease.name}`;
}

/**
 * "Lampasas, TX" out of a roll address — or `null` when it cannot be found.
 *
 * ── WHY THIS RETURNS `null` INSTEAD OF GUESSING ──
 *
 * Roll addresses are one unstructured string and they arrive in three shapes,
 * all of them real in the live data:
 *
 *   3 parts  "%J & NANCY HOLLIMAN TSTEES 8833 TRADEWAY ST, SAN ANTONIO, TX 78217"
 *   2 parts  "PO BOX 446 OLNEY, TX 76374-0446"      ← street and city mashed
 *   1 part   no commas at all
 *
 * Only the three-part form separates the city with a comma. Treating the
 * two-part form the same way makes the whole of "PO BOX 446 OLNEY" the city —
 * which is how the masked version of that address ended up printing the box
 * number it was supposed to be hiding. There is no reliable way to split
 * "STREET CITY" without a gazetteer, so this says so rather than inventing one.
 */
export function mailCity(address: string): string | null {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const state = parts[parts.length - 1].replace(/\s+\d{5}(-\d{4})?$/, "").trim();
  const city = parts[parts.length - 2];
  return state ? `${city}, ${state}` : city;
}

/**
 * The street half hidden, leaving the city — step 2 shows where a record's mail
 * GOES without printing a stranger's doorstep.
 *
 * WHEN THE CITY CANNOT BE ISOLATED IT RETURNS THE ADDRESS UNCHANGED, and that
 * is deliberate. A "••••" prefix on a string that still contains the street is
 * worse than no mask at all: it tells the reader something has been hidden when
 * it has not. These addresses are public record data either way — the mask is a
 * courtesy, and a courtesy that lies is not one.
 */
export function maskedAddress(address: string): string {
  const city = mailCity(address);
  return city ? `•••• ${city}` : address;
}
