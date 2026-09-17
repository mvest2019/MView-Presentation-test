import { leaseRecords } from "./lease-records";
import type { LeaseRecord } from "./lease-types";

/**
 * THE SAMPLE RECORD — what an UNCLAIMED visitor sees instead of somebody's
 * leases.
 *
 * ── WHY THIS EXISTS ──
 *
 * `?state=unclaimed` is the funnel state for a visitor who has not claimed an
 * owner record. Until now the lease report printed the real fixture at that
 * state: Platis Sydney Kay's ten leases, their operator, their county, their
 * valuations. A page selling the idea of claiming a record should not be
 * showing somebody else's, and once this is wired to a database that stops
 * being a fixture problem and becomes a disclosure one.
 *
 * ── IT IS DERIVED, NOT TRANSCRIBED ──
 *
 * Every sample lease is a real lease with its identity replaced and its money
 * and volumes scaled. That is deliberate: a hand-written parallel fixture is a
 * second shape to keep in step with `LeaseRecord`, and it drifts the first time
 * a field is added. Mapping guarantees the sample set has exactly the fields
 * the real one has, and the ten sample leases decline, wobble and rank the way
 * ten real ones do — because they are ten real ones wearing different names.
 *
 * NOTHING IDENTIFYING SURVIVES THE MAP. The name, the lease number, the
 * operator and the county are all replaced; the acreage and reservoir are
 * generic enough to keep. What remains is the SHAPE of a producing record,
 * which is the thing the sample is for.
 *
 * ── THE SLUGS ARE THEIR OWN, AND THEY NEVER REACH THE ADDRESS BAR ──
 *
 * `sample-bluestem-ranch` is a DATA KEY, not a route. `financials-series.ts`
 * generates a series per record and `well-records.ts` a well per record, both
 * keyed by slug, so giving the sample set its own slugs is what makes every
 * existing lookup resolve to sample numbers with no call site changed.
 *
 * BUT THE URL KEEPS THE REAL LEASE'S SLUG. Switching funnel state is a
 * `?state=` change and nothing else — that is the contract the demo menu
 * already follows on every other route, and the dashboard switches state with
 * no navigation at all. An earlier pass redirected an unclaimed reader onto the
 * sample slug, which moved the PATH: the state menu then behaved differently
 * here than everywhere else, and Back stepped between two different leases.
 *
 * So the page swaps the RECORD and leaves the URL alone, and `routeSlugFor`
 * maps a sample record back to the real slug its links should point at. The two
 * sets are positionally aligned, which is what makes that mapping an index
 * lookup rather than a table.
 *
 * ── THE SCALE ──
 *
 * `SCALE` puts the sample portfolio at about $41,000, which is the figure the
 * unclaimed dashboard already advertises in `sampleOwner.kpis` ("Est. portfolio
 * value $41,270"). A visitor who sees that tile and then opens a sample lease
 * should not find a number an order of magnitude apart from it.
 */

/** The reference's own sample lease names — `_lib/reference/sample.ts`. */
const NAMES = [
  "BLUESTEM RANCH",
  "CADDO CREEK",
  "ELM HOLLOW",
  "FALLOW FIELD",
  "GRAYSON DRAW",
  "HALE PASTURE",
  "INDIAN MOUND",
  "JUNIPER FLAT",
  "KIOWA SPRING",
  "LONE MESQUITE",
] as const;

const OPERATORS = [
  "ALTON BASIN OPERATING, LLC",
  "BRAZOS RIDGE ENERGY, LP",
  "CORDELL RESOURCES CO",
  "DELMAR PETROLEUM, INC",
] as const;

/** The two counties the sample owner's record sits in — see `sampleOwner`. */
const COUNTIES = ["KARNES", "PANOLA"] as const;

/** See the note above: it lands the sample portfolio near $41,000. */
const SCALE = 0.031;

/** "BLUESTEM RANCH" -> "sample-bluestem-ranch". */
function sampleSlug(name: string): string {
  return `sample-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * A sample lease number that cannot be mistaken for a filed one. Real numbers
 * on this record are six digits beginning 29; these begin 9 and are followed by
 * the position, so `990001` reads as a placeholder at a glance.
 */
function sampleNumber(index: number): string {
  return `99${String(index + 1).padStart(4, "0")}`;
}

export const sampleLeaseRecords: LeaseRecord[] = leaseRecords.map(
  (lease, index) => {
    const name = NAMES[index % NAMES.length];
    return {
      ...lease,
      slug: sampleSlug(name),
      /* THE SUFFIX IS PART OF THE NAME, not a chip beside it. It travels into
         the page title, the breadcrumb, the picker, the prev/next steppers and
         the browser tab — every place the name appears — which is exactly the
         set of places a reader could otherwise take this for their own. */
      name: `${name} — Sample`,
      number: sampleNumber(index),
      operator: OPERATORS[index % OPERATORS.length],
      county: COUNTIES[index % COUNTIES.length],
      mvestimate: Math.round(lease.mvestimate * SCALE),
      countyAppraised: Math.round(lease.countyAppraised * SCALE),
      production: {
        gasMcf: Math.round(lease.production.gasMcf * SCALE),
        oilBbl: Math.round(lease.production.oilBbl * SCALE),
      },
      lastPosted: {
        ...lease.lastPosted,
        gasMcf: Math.round(lease.lastPosted.gasMcf * SCALE),
      },
    };
  },
);

/** Every lease the app knows about — the real ten and the sample ten. */
export const allLeaseRecords: LeaseRecord[] = [
  ...leaseRecords,
  ...sampleLeaseRecords,
];

/** Is this slug a sample one? Used to pick which set a page reads from. */
export function isSampleSlug(slug: string): boolean {
  return slug.startsWith("sample-");
}

/**
 * The record a lease belongs to — the set its picker and steppers should list.
 *
 * Read off the lease itself rather than the funnel state, so no component below
 * the page has to know what state the portal is in.
 */
export function leaseRecordsFor(slug: string): LeaseRecord[] {
  return isSampleSlug(slug) ? sampleLeaseRecords : leaseRecords;
}

/** The sample lease standing in for a real one, by position. */
export function sampleTwinOf(lease: LeaseRecord): LeaseRecord {
  const index = leaseRecords.findIndex((entry) => entry.slug === lease.slug);
  return sampleLeaseRecords[Math.max(index, 0)];
}

/**
 * THE SLUG A LINK SHOULD USE.
 *
 * For a real lease it is its own. For a sample lease it is the real lease at
 * the same position — because a sample slug is a data key and must never end up
 * in the address bar. Every href in the module goes through this.
 */
export function routeSlugFor(lease: LeaseRecord): string {
  if (!isSampleSlug(lease.slug)) return lease.slug;
  const index = sampleLeaseRecords.findIndex(
    (entry) => entry.slug === lease.slug,
  );
  return leaseRecords[Math.max(index, 0)].slug;
}
