/**
 * THE SHAPES MY LEASES PRINTS.
 *
 * One record per lease on the owner's claim, holding exactly the columns the
 * design's wide table shows and nothing else — every figure on the page is
 * either a field here or derived from one in `lease-totals.ts`.
 *
 * `number` IS NULLABLE ON PURPOSE. Two of the ten units on this record carry no
 * lease number on the filings (KAISER GAS UNIT, COOK GAS UNIT), and the design
 * prints the unit name alone for those rather than inventing an identifier. The
 * row still has to open a report, so `slug` is what the route uses — see
 * `lease-routes.ts`.
 */

export interface LeaseProduction {
  /** Gas filed to date, MCF, gross. */
  gasMcf: number;
  /** Oil filed to date, barrels, gross. */
  oilBbl: number;
}

/** The most recent month the operator filed, and the volume on that filing. */
export interface LeaseLastPosting {
  month: string;
  gasMcf: number;
}

export interface LeaseRecord {
  /** The filing's lease number, or null for an unnumbered unit. */
  number: string | null;
  /** The route segment the lease report opens on. */
  slug: string;
  name: string;
  status: "Producing";
  acres: number;
  /** "June 2020" — the month this lease first appeared on a production filing. */
  firstPosting: string;
  /** The owner's share, six-year cash-flow model. Dollars. */
  mvestimate: number;
  /** The county's appraised value for the same interest. Dollars. */
  countyAppraised: number;
  county: string;
  operator: string;
  reservoir: string;
  wells: number;
  /** The decimal interest as filed — 0.05138 is 5.138%. */
  decimalInterest: number;
  production: LeaseProduction;
  lastPosted: LeaseLastPosting;
}

/** The owner whose record this page prints. */
export interface LeaseOwnerRecord {
  name: string;
}

/** One line in "What changed since your last visit". */
export interface LeaseChangeItem {
  id: string;
  headline: string;
  detail: string;
}

/** One row of "Where each figure comes from". */
export interface LeaseSourceRow {
  source: string;
  answers: string;
  asOf: string;
}
