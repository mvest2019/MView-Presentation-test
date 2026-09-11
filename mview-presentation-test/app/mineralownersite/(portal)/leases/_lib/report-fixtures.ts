/**
 * THE PARTS OF THE MONTHLY REPORT THAT ARE NOT DERIVED FROM THE FILINGS.
 *
 * Three pages of it come from feeds this module does not model: the rings of
 * permits and wells around the acreage, the published commodity settlements,
 * and whatever the industry put out that period. They are fixtures here, in one
 * file, so it is obvious at a glance which of the twelve pages are computed and
 * which are carried — and so wiring any of them to a real feed means replacing
 * one export rather than editing a component.
 *
 * THE PAGE LIST IS HERE TOO because the jump chips at the top and the twelve
 * cards below have to stay in step. One array, read twice.
 */

/** Page 11 — the two-line chip and the label the report prints on each item. */
export const NOT_YOURS_LABEL = "not one of yours";

export interface ReportPage {
  /** The anchor a jump chip scrolls to. */
  id: string;
  title: string;
}

/**
 * THE TWELVE PAGES, IN ORDER, AND THE ORDER IS AN ARGUMENT.
 *
 * It runs from the answer outward: what happened (1–3), then which lease made
 * it happen (4–5), then where it is going (6–7), then who is running it (8),
 * then what to do (9), then the market and the neighbours it sits in (10–11),
 * and only at the end where every figure came from (12). A reader who stops
 * after page 2 has the month; a reader who goes to the end has the audit.
 */
export const REPORT_PAGES: ReportPage[] = [
  { id: "executive-summary", title: "Executive summary" },
  { id: "the-month", title: "The month" },
  { id: "revenue-trend", title: "Revenue trend" },
  { id: "lease-analysis", title: "Lease analysis" },
  { id: "side-by-side", title: "Every lease, side by side" },
  { id: "three-year-outlook", title: "Three-year outlook" },
  { id: "development-outlook", title: "Development outlook" },
  { id: "operator-analysis", title: "Operator analysis" },
  { id: "cash-flow", title: "What this means for your cash flow" },
  { id: "prices", title: "Prices this month" },
  { id: "press", title: "Around your operators" },
  { id: "year-so-far", title: "The year so far, and where this comes from" },
];

/* ============================================================================
   PAGE 7 · WHAT IS BEING DRILLED AROUND THIS ACREAGE
   ========================================================================= */

export interface DevelopmentRing {
  /** "1 mile". */
  ring: string;
  permits: number;
  leases: number;
  operators: number;
  producing: number;
}

/**
 * COUNTED ONCE ACROSS THE WHOLE PORTFOLIO, NOT ONCE PER LEASE.
 *
 * Ten leases in one county share their neighbours, so summing each lease's own
 * survey would count the same neighbouring lease many times over and report a
 * neighbourhood several times busier than it is. These are the same ring
 * figures the dashboard shows, for the same reason.
 */
export const DEVELOPMENT_RINGS: DevelopmentRing[] = [
  { ring: "1 mile", permits: 3, leases: 7, operators: 2, producing: 6 },
  { ring: "3 miles", permits: 11, leases: 9, operators: 3, producing: 8 },
  { ring: "5 miles", permits: 32, leases: 19, operators: 6, producing: 11 },
];

/**
 * The model's chance of a new well, per lease, banded.
 *
 * A PORTFOLIO SCORE WOULD DESCRIBE NONE OF THEM — the spread on this record runs
 * from 4.5% to 80%, so the page prints the spread and names both ends rather
 * than an average nobody holds.
 */
export const NEW_WELL_ODDS = {
  bands: { veryPoor: 4, average: 3, good: 2, veryGood: 1 },
  best: { lease: "MCCABE ETAL GU · Lease 295750", percent: 80 },
  worst: { lease: "MCCABE ETAL GU · Lease 290271", percent: 4.5 },
} as const;

/* ============================================================================
   PAGE 10 · THE SETTLEMENTS THE INCOME IS PRICED AGAINST
   ========================================================================= */

export interface PriceSettlement {
  label: string;
  unit: string;
  display: string;
  changePercent: number;
  /** The settlement day, as published. */
  stamp: string;
  note: string;
}

/**
 * FIXED TO THE REPORT'S MONTH, NOT LIVE.
 *
 * The pinned bar at the top of the portal carries today's settlements and moves
 * every day. A monthly report must not: it is a document about one month, and a
 * figure in it that changes between two readings makes every other figure on the
 * page suspect. These are the published settlements as at the date stamped on
 * each card.
 */
export const PRICE_SETTLEMENTS: PriceSettlement[] = [
  {
    label: "WTI",
    unit: "$/BBL",
    display: "$97.26",
    changePercent: 3.2,
    stamp: "2026-09-09",
    note: "Your oil sells against this, less a differential for quality and area. It moves more of your money than your volume does, so it moves a statement more than the barrel count suggests.",
  },
  {
    label: "NAT GAS",
    unit: "$/MMBTU",
    display: "$2.810",
    changePercent: -3.1,
    stamp: "2026-09-09",
    note: "The benchmark Texas gas is priced against. It is the number that reaches a gas royalty first, and gas is the volume on this record.",
  },
  {
    label: "BRENT",
    unit: "$/BBL",
    display: "$109.51",
    changePercent: 3.2,
    stamp: "2026-09-09",
    note: "The world crude benchmark. It does not price your oil directly — WTI does — but the gap between the two is what moves US differentials.",
  },
  {
    label: "PROPANE",
    unit: "$/GAL",
    display: "$0.833",
    changePercent: 3.0,
    stamp: "2026-09-09",
    note: "Natural gas liquids track this. Where a gas stream is rich, part of the value follows propane rather than the gas price.",
  },
];

/* ============================================================================
   PAGE 11 · WHAT THE INDUSTRY PUBLISHED THIS PERIOD
   ========================================================================= */

export interface PressItem {
  operator: string;
  title: string;
  summary: string;
  date: string;
}

/**
 * NONE OF THESE COMPANIES RUNS A LEASE ON THIS RECORD, AND THE PAGE SAYS SO ON
 * EVERY ROW.
 *
 * The three operators here are small private companies that publish almost
 * nothing. Leaving the page empty in those months would be honest but useless,
 * so it falls back to the newest items from the wider Texas record — each one
 * marked "not one of yours", because an investor deck from a company a reader
 * has never heard of is context, and reading it as news about their own acreage
 * is the exact mistake this page has to prevent.
 */
export const PRESS_ITEMS: PressItem[] = [
  {
    operator: "Baytex Energy USA, Inc.",
    title: "Investor Presentation – September 2026",
    summary:
      "Baytex Energy's September 2026 investor presentation: Investor Presentation – September 2026.",
    date: "Sep 1, 2026",
  },
  {
    operator: "APA Corporation",
    title: "EnerCom Denver 2026 Presentation",
    summary:
      "APA plans to grow oil production, reduce costs and debt, and increase shareholder returns. Its main growth opportunity is the Suriname project, expected to start production in mid-2028.",
    date: "Aug 18, 2026",
  },
  {
    operator: "NGL Watersolutions Eagleford LLC",
    title: "Quarterly Investor Presentation (August 2026)",
    summary:
      "NGL Energy Partners is built around Water Solutions, now the largest integrated water disposal system in the Delaware Basin, which handled about 3.3 million barrels per day in fiscal first-quarter 2027 as operating cost fell to $0.21 per barrel. The partnership also refinanced with a new $950 million term loan, authorized a $100 million unit repurchase program, and announced an 81-mile LEX II pipeline extension adding roughly 560,000 barrels per day of produced-water capacity.",
    date: "Aug 11, 2026",
  },
  {
    operator: "ConocoPhillips Company",
    title: "Second-Quarter Earnings Conference Call",
    summary:
      "ConocoPhillips reported $3.24 of adjusted earnings per share in the second quarter of 2026, with $7.2 billion of cash from operations and $4.2 billion of free cash flow. It doubled share repurchases to lift total shareholder distributions to $3.0 billion, reached its $5 billion disposition target ahead of schedule through a $1.7 billion sale of noncore Lower 48 assets, and grew its commercial LNG offtake portfolio to 12 MTPA.",
    date: "Aug 6, 2026",
  },
  {
    operator: "Magnolia Oil & Gas Operating LLC",
    title: "Q2 2026 Magnolia Oil & Gas Earnings Presentation",
    summary:
      "Magnolia Oil & Gas reported second-quarter 2026 adjusted net income of $184 million, adjusted EBITDAX of $370 million and free cash flow of $235 million on production of 106.1 Mboe/d, up 8% year over year. It agreed to acquire WildFire Energy for $4.06 billion, adding about 53 Mboe/d and 810,000 net Giddings acres and lifting its oil mix to roughly 50%, and raised the quarterly dividend 9% to 18 cents per share.",
    date: "Aug 6, 2026",
  },
  {
    operator: "Murphy Oil Corporation",
    title: "Second Quarter 2026 Earnings Presentation",
    summary:
      "Murphy Oil produced 169 MBOEPD in the second quarter of 2026 across a portfolio spanning the Eagle Ford, Gulf of America, Canada and international exploration, backed by more than 700 MMBOE of proved reserves. The quarter brought an oil discovery at Bubale-1X in Cote d'Ivoire, conclusion of the Hai Su Vang appraisal in Vietnam, and progress toward first oil at Lac Da Vang in the fourth quarter of 2026, with $50 million returned through dividends.",
    date: "Aug 6, 2026",
  },
];

/* ============================================================================
   PAGE 8 · THE OPERATOR NUMBERS THE FILINGS DO NOT CARRY
   ========================================================================= */

/**
 * The state's operator numbers, and the month each one took over.
 *
 * Keyed by the operator name exactly as the lease records spell it, so a lease
 * looks its operator up rather than carrying a copy. "not recorded" is a real
 * answer for BLACKBRUSH: the handover on COOK GAS UNIT predates what the
 * portal holds, which is why the change feed flags that lease's operator change
 * separately.
 */
export const OPERATOR_DETAIL: Record<
  string,
  { number: string; runningSince: string }
> = {
  "Hurd Enterprises, Ltd": { number: "419886", runningSince: "June 2020" },
  "Kaler Energy, Corp": { number: "450261", runningSince: "January 2024" },
  "Blackbrush O&G, LLC": { number: "073059", runningSince: "not recorded" },
};
