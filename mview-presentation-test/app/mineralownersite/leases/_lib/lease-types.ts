/**
 * THE SHAPE OF ONE LEASE, and the vocabulary the whole module speaks.
 *
 * WHY A TYPE FILE AND NOT TYPES BESIDE THE DATA. Three consumers need these
 * without needing the fixture: `lease-sorting.ts` sorts them, `lease-totals.ts`
 * reduces them, and every component renders them. Importing a 300-line fixture
 * to name a prop is how a demo record ends up in a client bundle.
 *
 * NUMBERS ARE NUMBERS HERE, NOT PRE-FORMATTED STRINGS — the one real departure
 * from `_lib/portal-demo-data.ts`, whose `LeaseRow` stores `estimate: "$8,700"`.
 * That shape cannot be sorted, summed or compared without parsing its own
 * display strings back into numbers, and this module has to do all three (sort
 * by value, total the column, derive the per-year split). Formatting is a
 * render-time concern and lives in `lease-format.ts`.
 */

/**
 * Whether the model projects future owner-share income for this lease.
 *
 * NOT the same thing as "does it produce". Two of the three inactive leases
 * still post gas volumes; inactive means the model sees negligible future
 * dollars to this owner's decimal at today's price outlook. The status
 * explainer on the page says exactly that, because "inactive" next to a lease
 * someone owns reads as "lost" if nothing corrects it.
 */
export type LeaseStatus = "producing" | "inactive";

export interface LeaseRecord {
  /** RRC lease number. The stable id — every sort, link and key uses it. */
  number: string;
  /** Lease name without the number; the number is appended at render time. */
  name: string;
  county: string;
  /** Acreage as filed, or `null` where the RRC record does not report it. */
  acres: number | null;
  operator: string;
  /** Reservoir play, or the honest gap text where the source has none. */
  play: string;
  field: string;
  /** RRC API number for the well. */
  api: string;
  /** RRC district. */
  district: string;
  wells: number;
  /**
   * This owner's share of the lease, as filed on the division order.
   * A number, not a string, so the derivation table can multiply with it —
   * carried at full precision because eight decimal places IS the value.
   */
  decimalInterest: number;
  /** Owner-share six-year projection, rounded to the nearest $100. */
  mvestimate: number;
  /** The county's 2026 appraised value for the lease. A different method. */
  countyAppraised: number;
  /** Gross lease volumes as posted to the RRC — never the owner's share. */
  production: {
    gasMcf: number;
    oilBbl: number;
    threeMonthBoe: number;
  };
  status: LeaseStatus;
  /** The reservoir/well line under the lease name in the table. */
  detail: string;
  /**
   * Week-over-week value change, or `null` where the snapshot service is not
   * connected. `null` renders as an em dash — never as 0, which would claim a
   * measurement nobody took.
   */
  weekChangePercent: number | null;
}
