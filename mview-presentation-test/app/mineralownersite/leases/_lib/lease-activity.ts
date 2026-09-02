/**
 * THE TWO NOTICES ABOVE THE LIST — what changed, and what the records refresh
 * turned up.
 *
 * Both are ILLUSTRATIVE and both say so on screen. They are here as data rather
 * than as markup because both are dismissible: the components that render them
 * need a stable id per item to remember what was marked read, and an id is a
 * data concern.
 */

export interface ChangeItem {
  id: string;
  headline: string;
  detail: string;
  /** The lease this item is about, when it has a report to open. */
  leaseNumber?: string;
  /** The link's wording — the design gives each item its own. */
  linkLabel?: string;
}

/**
 * "WHAT CHANGED SINCE YOUR LAST VISIT" — a few items per visit, each
 * individually dismissible so they never bury the dollar figures above them.
 *
 * `leaseNumber` CARRIES THE LINK, not an `href`. Two of the three items end in
 * a door in the prototype — "Open the report →" and "See the curve →" — and both
 * point at a lease report, which this module now has, so the component builds
 * the URL through `leaseReportPath` rather than storing a path here.
 *
 * The third item's door is "Activities →", and that module does not exist. It is
 * omitted rather than pointed at a 404, which is the portal's own convention for
 * an unbuilt destination — see `_lib/portal-nav.ts`.
 */
export const changesSinceLastVisit: ChangeItem[] = [
  {
    id: "smith-305892-gas",
    headline: "Fresh gas on Smith 305892",
    detail: "27,120 mcf posted; your strongest lease keeps earning.",
    leaseNumber: "305892",
    linkLabel: "Open the report →",
  },
  {
    id: "ledbetter-decline",
    headline: "Ledbetter eased ~8% this quarter",
    detail: "right on its decline curve, not a red flag.",
    leaseNumber: "74318",
    linkLabel: "See the curve →",
  },
  {
    id: "ledbetter-permits",
    headline: "11 permits within 1 mile of Ledbetter",
    detail: "none on your land; nearby drilling is the upside signal.",
  },
];

/**
 * THE RECORDS-UPDATE NOTICE.
 *
 * An EVENT, not a standing nag: it fires when the mineral-owner records refresh
 * (this one, the 2026 roll) and it collapses to a one-line chip once accepted.
 * The distinction matters — the same card as a permanent fixture would be a
 * banner asking the owner to verify three leases on every visit forever.
 *
 * SOURCE · Mongo.MineralOwnersInfoDB.Mineral_Owners_Data name-variant match.
 * The matcher itself is a build item; the copy is careful that a matching name
 * is not proof, and that these three leases are NOT inside the $26,340.
 */
export const recordsUpdate = {
  year: "2026",
  matchCount: 3,
  nameVariant: "SMITH R E",
  counties: "Karnes and DeWitt counties",
  /**
   * THE THREE MATCHED RECORDS, MASKED — and the masking is the feature.
   *
   * The block characters are the design's own. Full names, lease numbers and
   * addresses unmask only inside the claim flow, after an identity check, so
   * that someone glancing over the reader's shoulder learns nothing about a
   * record that may not even be theirs. A name variant is a lead, not proof of
   * ownership, and showing it in full before verification would leak a stranger's
   * details on the strength of a fuzzy string match.
   */
  maskedNames: [
    "SMITH, C■■■■■S D",
    "S■■■ONS, C D ET UX",
    "S■■■ONS FAMILY (C D)",
  ],
  /** What the three records are, without identifying them. */
  matchSummary:
    "2 in Karnes County (one producing gas, one inactive) · 1 in DeWitt County (producing oil)",
} as const;
