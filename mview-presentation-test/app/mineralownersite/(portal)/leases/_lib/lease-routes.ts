import { leaseRecords } from "./lease-records";
import type { LeaseRecord } from "./lease-types";

/**
 * WHERE A LEASE ROW OPENS, AND HOW THAT URL IS READ BACK.
 *
 * ── THE SLUG CARRIES THE NUMBER *AND* THE NAME ──
 *
 * `/mineralownersite/leases/290827-mccabe-etal-gu` rather than
 * `/mineralownersite/leases/290827`. The number alone is what the state files
 * and what makes the URL unambiguous; the name is what makes it survive being
 * pasted into an email, read out on a call, or found in somebody's history six
 * months later. An owner holding four MCCABE leases cannot tell three bare
 * numbers apart, and a URL that has to be opened to be identified is a URL that
 * gets opened four times.
 *
 * The number leads because it is the identifier: everything after the first
 * hyphen is a label, which is why `findLeaseBySlug` reads the number and
 * ignores the rest.
 *
 * ── TWO UNITS HAVE NO NUMBER AT ALL ──
 *
 * KAISER GAS UNIT and COOK GAS UNIT carry none on their filings, so their slugs
 * are the kebab-cased name on its own. They are matched whole, because for them
 * the name IS the identifier.
 */

export function leaseReportPath(slug: string): string {
  return `/mineralownersite/leases/${slug}`;
}

/**
 * Resolve a URL segment back to a lease.
 *
 * TOLERANT ON PURPOSE. It accepts the full slug, the bare lease number, and a
 * slug whose name half has drifted — because a lease can be renamed on a later
 * filing and every link already out there would otherwise 404. The number is
 * the identity; the name is a label that happens to travel with it.
 *
 * Returns `undefined` for anything it cannot place, which the page turns into a
 * `notFound()` rather than guessing.
 */
export function findLeaseBySlug(slug: string): LeaseRecord | undefined {
  const wanted = decodeURIComponent(slug).toLowerCase();

  const exact = leaseRecords.find((lease) => lease.slug === wanted);
  if (exact) return exact;

  /* The leading run of digits, when there is one — "290827-anything" and a bare
     "290827" both resolve to the same lease. */
  const number = /^(\d+)/.exec(wanted)?.[1];
  return number
    ? leaseRecords.find((lease) => lease.number === number)
    : undefined;
}

/** The lease's position in the record, for the "Lease 3 of 10" pager. */
export function leasePosition(slug: string): { index: number; total: number } {
  return {
    index: leaseRecords.findIndex((lease) => lease.slug === slug),
    total: leaseRecords.length,
  };
}

/** The lease before and after this one, wrapping at both ends. */
export function leaseNeighbours(slug: string): {
  previous: LeaseRecord;
  next: LeaseRecord;
} {
  const { index, total } = leasePosition(slug);
  return {
    previous: leaseRecords[(index - 1 + total) % total],
    next: leaseRecords[(index + 1) % total],
  };
}
