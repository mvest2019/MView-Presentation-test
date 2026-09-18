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
 * GAS UNIT do in the fixture: the identifier is the identity when there is one,
 * and the name is all there is when there is not.
 *
 * WHAT LEADS IS THE SERVICE'S ID WHEN THE LEASE HAS ONE — `08_46924` rather
 * than `46924`. See `LeaseRecord.id`: the number alone does not name a lease to
 * the service, so a URL built on it cannot fetch the report it opens.
 */
export function leaseSlug(
  identifier: string | null | undefined,
  name: string,
): string {
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return identifier ? `${identifier}-${kebab}` : kebab;
}

/**
 * THE SEGMENT A LEASE'S REPORT OPENS ON.
 *
 * ── A SERVED LEASE IS ITS ID, AND NOTHING ELSE ──
 *
 * `/mineralownersite/leases/02_269507`. It carried the name as well —
 * `02_269507-betty-kennedy-unit-a` — on the reasoning written above: a URL you
 * can read is a URL that survives being pasted into an email. That reasoning
 * was written for a bare lease NUMBER, which names nothing on its own. An id
 * already carries the district, and the four leases on this record that share
 * the name BETTY KENNEDY UNIT A are told apart by the id and never by the name,
 * so the name half was decoration that made the segment three times longer and
 * disagreed with the heading whenever the service relabelled a lease.
 *
 * A FIXTURE LEASE KEEPS BOTH, because there the number IS all there is and the
 * name is what makes `290271-mccabe-etal-gu` legible.
 */
export function leaseRouteSlug(
  id: string | null | undefined,
  number: string | null,
  name: string,
): string {
  return id ?? leaseSlug(number, name);
}

/**
 * THE SERVICE'S LEASE ID OUT OF A URL SEGMENT — `08_46924`, or null.
 *
 * A served lease's slug IS its id and a fixture lease's leads with a bare
 * number, so the underscore is what tells the two apart: `08_46924` has an id
 * and `290271-mccabe-etal-gu` has not. That is the whole branch the report page
 * turns on — an id means ask the service, no id means the fixture.
 *
 * UPPERCASED, because the service is case-sensitive about it: district `7C`
 * answers and `7c` comes back "not on this owner's record". Districts are
 * digits and uppercase letters only, so raising the whole id is safe.
 */
export function leaseIdFromSlug(slug: string): string | null {
  const match = /^([A-Za-z0-9]{1,3}_\d+)/.exec(decodeURIComponent(slug));
  return match ? match[1].toUpperCase() : null;
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
