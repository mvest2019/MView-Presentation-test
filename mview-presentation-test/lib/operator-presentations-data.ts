/**
 * TEMPORARY FIXTURE — delete when a presentations endpoint exists.
 *
 * The operator investor presentations the library lists, newest first. Extracted
 * verbatim from the approved prototype's `DATA` array; `topCounties` is joined
 * from its `KYO_TOPCTY` map.
 *
 * WHY A FIXTURE. Nothing we serve today returns investor-relations documents — the
 * operator search endpoint carries production, not filings — so this is the only
 * source. Swap it behind `lib/operator-presentations.ts`; nothing above that file
 * reads this one.
 *
 * COUNTIES ARE MATCHED BY NUMBER, NOT BY NAME. The prototype resolves an operator's
 * most-active counties by exact RRC number and then, failing that, by a fuzzy name
 * match against the operator directory. That fallback compares the first twelve
 * normalised characters, which is loose enough to be wrong: it pairs "Occidental
 * Petroleum Corp." with OCCIDENTAL PERMIAN LTD (617544) and "SM Energy Company"
 * with a different SM Energy number than the one in the row, then prints the
 * matched entity's Texas counties as though they were the presenting company's.
 * These are separate legal entities — a public issuer and one of its operating
 * subsidiaries — so only the exact-number match is kept here. 4 of
 * 18 rows carry counties as a result; the rest simply omit the line, which is
 * what the design already does for a row with no match.
 *
 * Dates are the filing dates as published, ISO `YYYY-MM-DD`. Quarter and document
 * type are derived at render time from the date and title — see the pure helpers in
 * `lib/operator-presentations.ts` — rather than stored, so they cannot drift from
 * the row they describe.
 */

export interface OperatorPresentationRecord {
  /** Stable key: slugified operator name plus publication date. */
  id: string;
  /** The presenting company, as published. Often a public issuer rather than the
   *  RRC-registered operator, which is why it is not linked to the directory. */
  operator: string;
  /** RRC operator number, or null for a public issuer with no Texas registration. */
  operatorNumber: string | null;
  title: string;
  /** ISO `YYYY-MM-DD`. */
  publishedOn: string;
  /** The operator's investor-relations site. External. */
  url: string;
  summary: string;
  /** Most-active counties, upper case as filed. Empty when no exact number match. */
  topCounties: string[];
}

/** Newest first — the library's default order. */
export const OPERATOR_PRESENTATIONS: readonly OperatorPresentationRecord[] =
[
  {
    "id": "cms-energy-2026-06-22",
    "operator": "CMS Energy",
    "operatorNumber": null,
    "title": "June Investor Meetings (June 2026)",
    "publishedOn": "2026-06-22",
    "url": "https://www.cmsenergy.com",
    "summary": "CMS Energy's June 2026 investor presentation highlights strategic priorities, financial outlook, and long-term growth including rate-base investment and clean-energy transition milestones.",
    "topCounties": []
  },
  {
    "id": "ovintiv-usa-inc-2026-06-16",
    "operator": "Ovintiv USA Inc.",
    "operatorNumber": "251691",
    "title": "June 2026 Investor Update",
    "publishedOn": "2026-06-16",
    "url": "https://www.ovintiv.com",
    "summary": "Ovintiv's June 2026 update covers Permian and Anadarko development, its durable returns framework, and progress on the debt-reduction target.",
    "topCounties": [
      "FREESTONE",
      "DENTON",
      "PARKER"
    ]
  },
  {
    "id": "devon-energy-corporation-2026-06-10",
    "operator": "Devon Energy Corporation",
    "operatorNumber": "201920",
    "title": "Investor Presentation – June 2026",
    "publishedOn": "2026-06-10",
    "url": "https://www.devonenergy.com",
    "summary": "Devon's June 2026 presentation outlines Delaware Basin development, fixed-plus-variable dividends, and multi-basin inventory depth across Texas and Oklahoma.",
    "topCounties": []
  },
  {
    "id": "baytex-energy-usa-inc-2026-06-06",
    "operator": "Baytex Energy USA, Inc.",
    "operatorNumber": "101444",
    "title": "Investor Presentation – June 2026",
    "publishedOn": "2026-06-06",
    "url": "https://www.baytexenergy.com",
    "summary": "Baytex Energy expects growth through increased oil production, disciplined spending, and shareholder returns, with Eagle Ford development at the core of the U.S. program.",
    "topCounties": []
  },
  {
    "id": "matador-resources-company-2026-06-03",
    "operator": "Matador Resources Company",
    "operatorNumber": "523430",
    "title": "June 2026 Investor Presentation",
    "publishedOn": "2026-06-03",
    "url": "https://www.matadorresources.com",
    "summary": "Matador's June 2026 presentation covers Delaware Basin drilling and completion efficiencies, midstream value at San Mateo, and a growing base dividend.",
    "topCounties": []
  },
  {
    "id": "ngl-watersolutions-eagleford-llc-2026-05-28",
    "operator": "NGL Watersolutions Eagleford, LLC",
    "operatorNumber": "609267",
    "title": "Quarterly Investor Presentation (May 2026)",
    "publishedOn": "2026-05-28",
    "url": "https://www.nglenergypartners.com",
    "summary": "NGL Energy's May 2026 investor presentation: water solutions volumes, contracted acreage dedications across the Eagle Ford, and the partnership's deleveraging progress.",
    "topCounties": []
  },
  {
    "id": "range-resources-corporation-2026-05-22",
    "operator": "Range Resources Corporation",
    "operatorNumber": "697750",
    "title": "May 2026 Company Presentation",
    "publishedOn": "2026-05-22",
    "url": "https://www.rangeresources.com",
    "summary": "Range's May 2026 presentation highlights multi-decade Marcellus inventory, NGL exports, and a sustaining capital program among the lowest in the sector.",
    "topCounties": []
  },
  {
    "id": "sm-energy-company-2026-05-20",
    "operator": "SM Energy Company",
    "operatorNumber": "778063",
    "title": "May 2026 Investor Presentation",
    "publishedOn": "2026-05-20",
    "url": "https://www.sm-energy.com",
    "summary": "SM Energy's May 2026 presentation focuses on Midland Basin and South Texas performance, inventory additions from Klondike, and net-debt reduction.",
    "topCounties": []
  },
  {
    "id": "eog-resources-inc-2026-05-15",
    "operator": "EOG Resources, Inc.",
    "operatorNumber": "253162",
    "title": "Investor Presentation – May 2026",
    "publishedOn": "2026-05-15",
    "url": "https://www.eogresources.com",
    "summary": "EOG's May 2026 presentation details premium drilling returns, double-premium inventory across South Texas and the Delaware Basin, and its regular-plus-special dividend framework.",
    "topCounties": [
      "GONZALES",
      "MONTAGUE",
      "KLEBERG"
    ]
  },
  {
    "id": "apa-corporation-apache-2026-05-14",
    "operator": "APA Corporation (Apache)",
    "operatorNumber": "022680",
    "title": "First Quarter 2026 Financial & Operational Supplement",
    "publishedOn": "2026-05-14",
    "url": "https://www.apacorp.com",
    "summary": "APA's Q1 2026 supplement details Permian oil volumes, Egypt and North Sea contributions, exploration offshore Suriname, and cost-reduction initiatives.",
    "topCounties": []
  },
  {
    "id": "comstock-resources-inc-2026-05-13",
    "operator": "Comstock Resources, Inc.",
    "operatorNumber": "171596",
    "title": "Q1 2026 Results Presentation",
    "publishedOn": "2026-05-13",
    "url": "https://www.comstockresources.com",
    "summary": "Comstock's Q1 2026 presentation reviews Haynesville and Western Haynesville results, gas marketing to Gulf Coast LNG demand, and cost improvements.",
    "topCounties": []
  },
  {
    "id": "encana-oil-and-gas-usa-inc-2026-05-12",
    "operator": "Encana Oil & Gas (USA) Inc.",
    "operatorNumber": "251691",
    "title": "Q1 2026 Results",
    "publishedOn": "2026-05-12",
    "url": "https://www.ovintiv.com",
    "summary": "Ovintiv's May 2026 investor presentation: Q1 2026 Results.",
    "topCounties": [
      "FREESTONE",
      "DENTON",
      "PARKER"
    ]
  },
  {
    "id": "occidental-petroleum-corp-2026-05-09",
    "operator": "Occidental Petroleum Corp.",
    "operatorNumber": "627650",
    "title": "First Quarter 2026 Earnings Deck",
    "publishedOn": "2026-05-09",
    "url": "https://www.oxy.com",
    "summary": "Occidental's Q1 2026 deck reviews Permian well productivity, OxyChem contributions, debt-reduction progress, and low-carbon venture milestones.",
    "topCounties": []
  },
  {
    "id": "conocophillips-2026-05-08",
    "operator": "ConocoPhillips",
    "operatorNumber": "168087",
    "title": "Q1 2026 Earnings Review",
    "publishedOn": "2026-05-08",
    "url": "https://www.conocophillips.com",
    "summary": "ConocoPhillips' Q1 2026 review covers Lower 48 production, Permian and Eagle Ford activity, and its returns-focused capital framework.",
    "topCounties": []
  },
  {
    "id": "diamondback-energy-inc-2026-05-07",
    "operator": "Diamondback Energy, Inc.",
    "operatorNumber": "217012",
    "title": "Q1 2026 Investor Presentation",
    "publishedOn": "2026-05-07",
    "url": "https://www.diamondbackenergy.com",
    "summary": "Diamondback's Q1 2026 presentation covers Midland Basin efficiency gains, cash operating margins, and returning the majority of free cash flow to stockholders.",
    "topCounties": [
      "MARTIN",
      "MIDLAND",
      "ECTOR"
    ]
  },
  {
    "id": "murphy-oil-corporation-2026-05-06",
    "operator": "Murphy Oil Corporation",
    "operatorNumber": "285230",
    "title": "First Quarter 2026 Earnings Presentation",
    "publishedOn": "2026-05-06",
    "url": "https://www.murphyoilcorp.com",
    "summary": "Murphy Oil had a strong Q1 2026 — solid production, cash-flow generation, shareholder returns, and progress on Gulf of Mexico and onshore development.",
    "topCounties": []
  },
  {
    "id": "coterra-energy-inc-2026-05-05",
    "operator": "Coterra Energy Inc.",
    "operatorNumber": "139372",
    "title": "Q1 2026 Update",
    "publishedOn": "2026-05-05",
    "url": "https://www.coterra.com",
    "summary": "Coterra's Q1 2026 update balances Permian oil growth with Marcellus gas optionality, highlighting capital flexibility as prices shift.",
    "topCounties": []
  },
  {
    "id": "chevron-corporation-2026-05-01",
    "operator": "Chevron Corporation",
    "operatorNumber": null,
    "title": "May 2026 Chevron Investor Presentation",
    "publishedOn": "2026-05-01",
    "url": "https://www.chevron.com",
    "summary": "Chevron's May 2026 presentation highlights increasing cash flow, growing Permian production efficiently, and maintaining capital discipline through the commodity cycle.",
    "topCounties": []
  }
];
