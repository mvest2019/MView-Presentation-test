import { leaseRecords } from "./lease-records";
import type { LeaseRecord } from "./lease-types";
import { isSampleSlug, sampleLeaseRecords } from "./sample-leases";

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
 *
 * ── A SAMPLE SLUG RESOLVES AGAINST THE SAMPLE SET ──
 *
 * `sample-bluestem-ranch` belongs to the ten fictional leases an unclaimed
 * visitor is shown. Every function below picks its set from the slug rather
 * than taking a parameter, so a sample URL pages, positions and finds its
 * neighbours entirely within the sample record — an unclaimed visitor stepping
 * through "lease 3 of 10" never lands on a real one.
 */

/** Which of the two records a slug belongs to. */
function setFor(slug: string): LeaseRecord[] {
  return isSampleSlug(slug) ? sampleLeaseRecords : leaseRecords;
}

export function leaseReportPath(slug: string): string {
  return `/mineralownersite/leases/${slug}`;
}

/**
 * The slug for a lease that did not come out of the fixture.
 *
 * THE FIXTURE'S OWN CONVENTION, WRITTEN DOWN. Its ten records carry hand-typed
 * slugs — `290271-mccabe-etal-gu` — and this is that shape as a function, so a
 * lease arriving from the service gets a URL of the same form rather than a
 * second scheme living beside the first. `findLeaseBySlug` already reads the
 * leading digits as the identity and tolerates a drifted name half, which is
 * what makes one shape enough for both.
 *
 * AN UNNUMBERED UNIT FALLS BACK TO ITS NAME, the way KAISER GAS UNIT and COOK
 * GAS UNIT do in the fixture: the number is the identity when there is one, and
 * the name is all there is when there is not.
 */
export function leaseSlug(number: string | null, name: string): string {
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return number ? `${number}-${kebab}` : kebab;
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
  const records = setFor(wanted);

  const exact = records.find((lease) => lease.slug === wanted);
  if (exact) return exact;

  /* The leading run of digits, when there is one — "290827-anything" and a bare
     "290827" both resolve to the same lease. */
  const number = /^(\d+)/.exec(wanted)?.[1];
  return number ? records.find((lease) => lease.number === number) : undefined;
}

/** The lease's position in the record, for the "Lease 3 of 10" pager. */
export function leasePosition(slug: string): { index: number; total: number } {
  const records = setFor(slug);
  return {
    index: records.findIndex((lease) => lease.slug === slug),
    total: records.length,
  };
}

/** The lease before and after this one, wrapping at both ends. */
export function leaseNeighbours(slug: string): {
  previous: LeaseRecord;
  next: LeaseRecord;
} {
  const records = setFor(slug);
  const { index, total } = leasePosition(slug);
  return {
    previous: records[(index - 1 + total) % total],
    next: records[(index + 1) % total],
  };
}
