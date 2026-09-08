/**
 * THE UNCLAIMED SAMPLE — four leases on a fictional owner.
 *
 * WHAT AN UNCLAIMED VISITOR SEES INSTEAD OF THIS PAGE. `.nc-swap` in
 * `portal.css` hides every sibling of the `.nc-only` panel, so while the record
 * is unclaimed this list replaces the whole module rather than sitting above it.
 * The alternative — an empty lease table with a claim prompt — shows somebody
 * nothing and asks them to trust it.
 *
 * DELIBERATELY FICTIONAL AND SAID SO FOUR TIMES: the badge, the panel heading's
 * chip, the row footnote and the closing CTA. J. T. Callahan is the same sample
 * owner the dashboard's unclaimed state and the claim-flow teaser use, so a
 * visitor walking Dashboard → My Leases sees one consistent example rather than
 * two different invented people.
 *
 * SOURCE · none, on purpose. See the same note in `_lib/portal-demo-data.ts`:
 * synthetic KPIs against a real account is exactly what this fixture exists to
 * avoid.
 */

export interface SampleLease {
  name: string;
  operator: string;
  county: string;
  status: "Producing" | "Inactive";
  /** Six-year owner-share estimate. `0` prints the county-value fallback. */
  estimate: number;
}

export const sampleRecord = {
  owner: "J. T. Callahan",
  id: "KRN-306471",
  counties: "Karnes + Panola Co.",
} as const;

export const sampleLeases: SampleLease[] = [
  {
    name: "Alameda Ranch",
    operator: "Brazos Basin Energy, LLC",
    county: "Karnes",
    status: "Producing",
    estimate: 18900,
  },
  {
    name: "Bluestem 2H",
    operator: "Brazos Basin Energy, LLC",
    county: "Karnes",
    status: "Producing",
    estimate: 13400,
  },
  {
    name: "Red Oak Unit",
    operator: "Pineywoods Operating Co.",
    county: "Panola",
    status: "Producing",
    estimate: 8970,
  },
  {
    name: "Caddo Creek",
    operator: "Pineywoods Operating Co.",
    county: "Panola",
    status: "Inactive",
    estimate: 0,
  },
];
