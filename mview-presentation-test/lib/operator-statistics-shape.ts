/**
 * The wire shape for one operator's statistics.
 *
 * A types-only module so both halves can share it without either dragging the
 * other in: `operator-statistics-api.ts` is `server-only` and must never reach the
 * client, while `operator-statistics.ts` is imported by the client page and must
 * stay free of the API client.
 *
 * IT CARRIES ONLY WHAT THE NETWORK KNOWS. `slot` and `color` are the picker's, and
 * `short`, `perLease`, `oilPct` and `yearOverYear` are arithmetic on the fields
 * below — none of them belong on the wire, and computing them once at the seam
 * keeps a derived value from being cached as though it were data.
 */
export interface StatisticsOperatorData {
  /**
   * Statewide rank, or null when the source does not report one. `/operators/compare`
   * does not, so the view shows a rank only where it genuinely has one rather than
   * printing a placeholder that reads like a real position.
   */
  rank: number | null;
  /** Detail-page slug, or null when unknown — a link is only rendered with one. */
  slug: string | null;
  name: string;
  monogram: string;
  /**
   * Where to ask for this operator's logo, or null when none is on file.
   *
   * OUR PATH, NOT THE API'S. `/operators/compare` reports `operator_logo` as an
   * absolute URL on the API host, and that response carries
   * `cross-origin-resource-policy: same-origin` — measured — so an `<img>` pointed
   * straight at it downloads a valid PNG and is then refused by the browser. The
   * project already re-serves the same bytes from its own origin.
   */
  logoUrl: string | null;
  operatorNumber: string;
  boeTotal: number;
  oilTotal: number;
  gasTotal: number;
  leases: number;
  counties: number;
  headquarters: string | null;
  /** As the regulator spells them, upper case; title-cased at the seam. */
  topCounties: string[];
  /** Annual BOE across `STATISTICS_TREND_YEARS`, or null when none is filed. */
  trend: number[] | null;
  boeCurrent: number | null;
  boePrevious: number | null;
}

/**
 * One row in the operator picker.
 *
 * Here rather than beside the search that produces it, because that module is
 * `server-only` and the combobox is a client component — a type imported across
 * that boundary has to live outside it.
 *
 * `/operators/names` reports a name and a logo, and no rank or production, so a
 * match is those two and the initials derived from the name. Everything else about
 * the operator arrives when one is chosen.
 */
export interface OperatorNameMatch {
  /** The display spelling, and the key the statistics read is made with. */
  name: string;
  /** The RRC number, or null when the record does not reveal one. */
  operatorNumber: string | null;
  /** Two initials, for the tile when there is no logo or it fails to load. */
  monogram: string;
  /** Same-origin logo path, or null when the record carries none. */
  logoUrl: string | null;
}

/**
 * What one picker request answers with, whether it was a search or the dropdown
 * simply being opened.
 *
 * `total` is every operator on file, not the number of matches — it is what lets
 * the picker say how far typing would reach when it is showing only the head of a
 * 24,742-name list.
 */
export interface OperatorNameResult {
  matches: OperatorNameMatch[];
  total: number;
}
