/**
 * PRODUCTION & FORECAST — every figure on the page, extracted from the
 * reference route `owner/src/routes/app-production.html`.
 *
 * WHY THE DEMONSTRATION LEASE IS NOT ONE OF SUZIE'S. The chart, the map and the
 * scorecard are all CASPER A2 in Ward County, operated by Apache — a lease that
 * appears nowhere else in this record. That is the reference's own choice and
 * its copy says so twice: the chart is "wired end-to-end so you can see exactly
 * what a lease report contains", and the reader is pointed at their own ten
 * leases for the same chart on their own production. Substituting one of
 * Suzie's leases would need production history this record does not have, and
 * inventing that history is exactly what a labelled fixture exists to avoid.
 *
 * THE TABLE ABOVE IT IS THE REAL RECORD — all ten leases, the same figures the
 * dashboard and My Leases carry. So the page reads: your ten leases first, then
 * one fully-wired example of what each lease's own report will look like.
 */

/* ============================================================================
   1 · THE PAGE HEAD
   ============================================================================ */

export const productionMeta = {
  title: "Production & Forecast",
  /** The strapline breaks around a `<strong>`, so it ships in three parts. */
  straplineLead: "What ",
  straplineStrong: "every one of your leases",
  straplineTail:
    " has produced — and where its decline curve says it's heading",
  coverage: "Real production · Texas state postings",
  purposeLead: "What this page is for:",
  purpose:
    " what your leases have produced — oil and gas always kept separate, in their own units — and where the decline-curve model says they're heading next. Production is what the operator reported to the state of Texas, not what you were paid; payment still shows only on your statements.",
} as const;

/* ============================================================================
   2 · VALUES AT THE TOP  (v43 · OW-45 + OW-35/36)

   A RANGE, NEVER A POINT. OW-35/36 is binding on the first two cards: the model
   states its own uncertainty, so the headline is a band and the midpoint is
   demoted to the sub-line. The six-year card is the MVestimate and is a single
   figure because that is what the estimate is.

   Every money figure here carries `.cl-lock`. This is the one page where a free
   claimed owner sees the product covered up, and it is the MODELLED dollars
   only — the posted volumes beside them stay sharp, because those are the
   owner's own public record rather than the product.
   ============================================================================ */

export interface TopValue {
  label: string;
  value: string;
  /** The sub-line, split so the midpoint can carry `.num .cl-lock` as well. */
  subLead: string;
  subStrong?: string;
  subTail?: string;
  /** The six-year card wears the estimate chip in place of a midpoint. */
  estimateChip?: boolean;
  /** That card is also tinted a shade differently in the reference. */
  borderColor?: string;
}

export const topValues: TopValue[] = [
  {
    label: "Next month · August 2026",
    value: "$330 – $540",
    subLead: "across all 10 leases · midpoint about ",
    subStrong: "$435",
    subTail: " — a range, not a promise",
  },
  {
    label: "Next quarter · Aug–Oct 2026",
    value: "$980 – $1,600",
    subLead: "three months of the same model · midpoint about ",
    subStrong: "$1,290",
  },
  {
    label: "Next six years · your share",
    value: "$26,340",
    subLead: "the MVestimate on your record · ",
    estimateChip: true,
    borderColor: "#cfe3da",
  },
];

export const rangesNote = {
  lead: "Why the first two are ranges:",
  body:
    " we hold today's prices flat, the discount off the benchmark varies with oil quality and with the area, gathering and compression deducts differ lease by lease and we can't see yours until you show us a statement, and operators post two to three months behind. ",
  link: "See the full explanation and make the estimate more accurate →",
  href: "/mineralownersite/briefing",
} as const;

/* ============================================================================
   3 · ALL TEN LEASES  (v43 · OW-45 · OW-06/07/08)

   EVERY ROW IS A DOOR, and so are the county and operator names — OW-07 and
   OW-08. Those destinations are separate modules and not one of them is built,
   so `PortalLink` renders each as inert text carrying the build's own
   explanation rather than a link into a 404.
   ============================================================================ */

export interface ProductionLeaseRow {
  lease: string;
  /** That lease's own report — a distinct path per lease in the reference. */
  href: string;
  county: string;
  countyHref: string;
  operator: string;
  operatorHref: string;
  posted: string;
  nextMonth: string;
  nextQuarter: string;
  sixYears: string;
  /** Shown beside a $0 six-year figure — a forecast, never lost ownership. */
  countyValue?: string;
  inactive?: boolean;
}

export const productionLeases: ProductionLeaseRow[] = [
  {
    lease: "Smith Gas Unit (305892)",
    href: "/mineralownersite/lease/smith",
    county: "Bee",
    countyHref: "/mineralownersite/county?c=bee",
    operator: "Bluestem Oil and Gas, LP",
    operatorHref: "/operator/detail",
    posted: "27,120 mcf · 133 bbl",
    nextMonth: "$97 – $159",
    nextQuarter: "$290 – $475",
    sixYears: "$8,700",
  },
  {
    lease: "Ledbetter (74318)",
    href: "/mineralownersite/lease/detail",
    county: "Cass",
    countyHref: "/mineralownersite/county?c=cass",
    operator: "Caddo Pine Resources, LLC",
    operatorHref: "/operator/detail",
    posted: "482 bbl · 399 mcf",
    nextMonth: "$95 – $157",
    nextQuarter: "$280 – $465",
    sixYears: "$5,300",
  },
  {
    lease: "Smith Gas Unit (423065)",
    href: "/mineralownersite/lease/g/423065",
    county: "Bee",
    countyHref: "/mineralownersite/county?c=bee",
    operator: "Bluestem Oil and Gas, LP",
    operatorHref: "/operator/detail",
    posted: "37,610 mcf · 303 bbl",
    nextMonth: "$45 – $75",
    nextQuarter: "$135 – $225",
    sixYears: "$4,100",
  },
  {
    lease: "Cedar Bend (578204)",
    href: "/mineralownersite/lease/g/578204",
    county: "Hood",
    countyHref: "/mineralownersite/county?c=hood",
    operator: "Trinity Fork USA, LLC",
    operatorHref: "/operator/detail",
    posted: "3,990 mcf",
    nextMonth: "$33 – $55",
    nextQuarter: "$99 – $164",
    sixYears: "$3,000",
  },
  {
    lease: "Cedar Bend (619473)",
    href: "/mineralownersite/lease/g/619473",
    county: "Hood",
    countyHref: "/mineralownersite/county?c=hood",
    operator: "Trinity Fork USA, LLC",
    operatorHref: "/operator/detail",
    posted: "2,520 mcf",
    nextMonth: "$29 – $47",
    nextQuarter: "$86 – $142",
    sixYears: "$2,600",
  },
  {
    lease: "Cedar Bend (391756)",
    href: "/mineralownersite/lease/g/391756",
    county: "Hood",
    countyHref: "/mineralownersite/county?c=hood",
    operator: "Trinity Fork USA, LLC",
    operatorHref: "/operator/detail",
    posted: "2,030 mcf",
    nextMonth: "$23 – $39",
    nextQuarter: "$70 – $116",
    sixYears: "$2,100",
  },
  {
    lease: "Cedar Bend (480329)",
    href: "/mineralownersite/lease/g/480329",
    county: "Hood",
    countyHref: "/mineralownersite/county?c=hood",
    operator: "Trinity Fork USA, LLC",
    operatorHref: "/operator/detail",
    posted: "1,955 mcf",
    nextMonth: "$6 – $10",
    nextQuarter: "$18 – $30",
    sixYears: "$540",
  },
  {
    lease: "Smith Gas Unit (267145)",
    href: "/mineralownersite/lease/g/267145",
    county: "Bee",
    countyHref: "/mineralownersite/county?c=bee",
    operator: "Bluestem Oil and Gas, LP",
    operatorHref: "/operator/detail",
    posted: "58,580 mcf · 189 bbl",
    nextMonth: "$0",
    nextQuarter: "$0",
    sixYears: "$0",
    countyValue: "county $410",
    inactive: true,
  },
  {
    lease: "Smith Gas Unit (508936)",
    href: "/mineralownersite/lease/g/508936",
    county: "Bee",
    countyHref: "/mineralownersite/county?c=bee",
    operator: "Bluestem Oil and Gas, LP",
    operatorHref: "/operator/detail",
    posted: "26,220 mcf · 49 bbl",
    nextMonth: "$0",
    nextQuarter: "$0",
    sixYears: "$0",
    countyValue: "county $410",
    inactive: true,
  },
  {
    lease: "Averitt (65081)",
    href: "/mineralownersite/lease/g/65081",
    county: "Cass",
    countyHref: "/mineralownersite/county?c=cass",
    operator: "Kestrel Exploration LLC",
    operatorHref: "/operator/detail",
    posted: "31 mcf · 2 bbl",
    nextMonth: "$0",
    nextQuarter: "$0",
    sixYears: "$0",
    countyValue: "county $55",
    inactive: true,
  },
];

/**
 * The table's own total row. The figures are rounded, so they do not tie to the
 * rows to the dollar — which the footnote under the table says out loud rather
 * than quietly reconciling.
 */
export const productionTotals = {
  lease: "All 10 leases",
  county: "3 counties",
  operator: "4 operators",
  posted: "160,455 mcf · 1,158 bbl",
  nextMonth: "$330 – $540",
  nextQuarter: "$980 – $1,600",
  sixYears: "$26,340",
} as const;

export const productionTableMeta = {
  heading:
    "All 10 of your leases — what each produced, and what each looks set to pay",
  chip: "Posted volumes real · owner-share ranges modeled",
  columns: [
    "Lease (no.)",
    "County",
    "Operator",
    "Latest posted month",
    "Next month · your share",
    "Next quarter",
    "Next six years",
  ],
  footLead: "Open any lease name for its own production & forecast report",
  foot:
    " — the same chart, table and decline model, on that lease alone. Posted volumes are the gross lease month as filed with the state; the dollar columns are ",
  footEm: "your share",
  footTail:
    " after your decimal interest. Ranges are rounded, so the rows won't add to the totals to the dollar. Three leases project $0 forward — that is a forecast, never lost ownership, so the county's own value is shown beside it.",
} as const;

/* ============================================================================
   4 · THE WORKED-EXAMPLE CHART — CASPER A2

   ACTUAL THEN FORECAST, CONCATENATED into one array each, exactly as the
   reference stores them. `nActual` is a COUNT, so the last posted month sits at
   index `nActual - 1` — that index is the seam every part of the chart is drawn
   around, and being off by one there moves the solid/dashed boundary a month.
   ============================================================================ */

export const casperSeries = {
  labels: [
    "Dec '20", "Jan '21", "Feb '21", "Mar '21", "Apr '21", "May '21",
    "Jun '21", "Jul '21", "Aug '21", "Sep '21", "Oct '21", "Nov '21",
    "Dec '21", "Jan '22", "Feb '22", "Mar '22", "Apr '22", "May '22",
    "Jun '22", "Jul '22", "Aug '22", "Sep '22", "Oct '22", "Nov '22",
    "Dec '22", "Jan '23", "Feb '23", "Mar '23", "Apr '23", "May '23",
    "Jun '23", "Jul '23", "Aug '23", "Sep '23", "Oct '23", "Nov '23",
    "Dec '23", "Jan '24", "Feb '24", "Mar '24", "Apr '24", "May '24",
    "Jun '24", "Jul '24", "Aug '24", "Sep '24", "Oct '24", "Nov '24",
    "Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25",
    "Jun '25", "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25",
    "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26",
    "Jun '26", "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26",
    "Dec '26", "Jan '27", "Feb '27", "Mar '27", "Apr '27", "May '27",
    "Jun '27", "Jul '27", "Aug '27", "Sep '27", "Oct '27", "Nov '27",
    "Dec '27", "Jan '28", "Feb '28", "Mar '28", "Apr '28", "May '28",
    "Jun '28", "Jul '28", "Aug '28", "Sep '28", "Oct '28", "Nov '28",
    "Dec '28", "Jan '29", "Feb '29", "Mar '29", "Apr '29", "May '29",
    "Jun '29", "Jul '29", "Aug '29", "Sep '29", "Oct '29", "Nov '29",
    "Dec '29", "Jan '30", "Feb '30", "Mar '30", "Apr '30",
  ],
  /** Barrels per month, gross lease. */
  oil: [
    4838, 25270, 14940, 17236, 12609, 10803, 12477, 10071, 7731, 6767,
    6279, 5030, 5313, 5496, 4456, 4238, 1441, 4921, 3823, 3087, 2671,
    2073, 2424, 2590, 1655, 4070, 4608, 4337, 3849, 4549, 3440, 3862,
    3314, 3233, 3305, 2433, 2173, 2360, 2087, 2330, 1656, 1891, 1766,
    1649, 1540, 1438, 1343, 1254, 1171, 1094, 1022, 954, 891, 832, 777,
    726, 678, 633, 591, 552, 515, 481, 450, 420, 392, 366, 342, 319, 298,
    279, 260, 243, 227, 212, 198, 185, 173, 161, 151, 141, 131, 123, 114,
    107, 100, 93, 87, 81, 76, 71, 66, 62, 58, 54, 50, 47, 44, 41, 38, 36,
    33, 31, 29, 27, 25, 24, 22, 21, 19, 18, 17, 16, 15,
  ],
  /** Mcf per month, gross lease. */
  gas: [
    6511, 41634, 23054, 27582, 23288, 20146, 24611, 17735, 14947, 12527,
    10418, 8493, 9412, 8574, 6762, 6831, 2401, 7833, 6274, 5292, 4286,
    3996, 4928, 3906, 2719, 7422, 7558, 6839, 5843, 4793, 5491, 4584,
    4328, 4742, 5007, 4100, 3149, 3054, 3005, 3192, 2535, 2744, 2586,
    2438, 2298, 2166, 2042, 1925, 1814, 1710, 1612, 1520, 1432, 1350,
    1273, 1200, 1131, 1066, 1005, 947, 893, 842, 793, 748, 705, 664, 626,
    590, 557, 525, 494, 466, 439, 414, 390, 368, 347, 327, 308, 291, 274,
    258, 243, 229, 216, 204, 192, 181, 171, 161, 152, 143, 135, 127, 120,
    113, 106, 100, 95, 89, 84, 79, 75, 70, 66, 63, 59, 56, 52, 49, 47,
    44, 41,
  ],
  /** How many months are POSTED actuals; the rest are the projection. */
  nActual: 41,
  oilMax: 25270,
  gasMax: 41634,
  /** Where "today" falls — inside the forecast, because operators post late. */
  todayIdx: 67,
} as const;

/** Index of the last posted month. Derived once so nothing recomputes it. */
export const CASPER_SEAM = casperSeries.nActual - 1;

/** The preset windows above the brush, as `[a, b]` month indexes. */
export const casperPresets: { label: string; a: number; b: number }[] = [
  { label: "All", a: 0, b: 112 },
  { label: "Actual only", a: 0, b: 40 },
  { label: "Last 24 months", a: 17, b: 40 },
  { label: "Forecast", a: 40, b: 112 },
];

export const casperMeta = {
  title: "CASPER A2 — monthly oil & gas, actual + forecast",
  exampleChip: "Worked example lease",
  operator: "Apache Corporation",
  operatorHref: "/operator/detail",
  /** The quiet meta line, middot-separated in the reference. */
  facts: ["Phantom (Wolfcamp)", "Ward County, TX", "110 wells", "643.9 acres"],
  disclaimerStrong: "This is a demonstration lease, not one of yours.",
  disclaimer:
    " It is wired end-to-end so you can see exactly what a lease report contains — ",
  disclaimerLink: "open any of your own ten leases",
  disclaimerHref: "/mineralownersite/lease/smith",
  disclaimerTail: " for the same chart on your own production.",
  legendOil: "Oil · bbl/mo",
  legendGas: "Gas · mcf/mo",
  legendNote: "solid = posted actuals · dashed = forecast",
  lastPostedLabel: "Last posted · Apr 2024",
  todayLabel: "Today · Jul 2026",
  forecastFlag: "FORECAST →",
  oilAxis: "OIL · bbl / month",
  gasAxis: "GAS · mcf / month",
  chartAria:
    "CASPER A2 monthly oil and gas production, December 2020 through April 2024 actual state postings, with a decline-curve forecast to April 2030 shown dashed. Oil on the left axis in barrels per month, gas on the right axis in mcf per month.",
  brushNoteLead:
    "Drag either handle to zoom. Solid lines are the public state record — posted through ",
  brushNoteMonth: "Apr 2024",
  brushNoteMid:
    " (operators post ~2–3 months behind). Dashes are a decline projection anchored to estimated remaining reserves — ",
  brushNoteStrong: "estimate, not an appraisal",
  brushNoteTail: "; when real months drift off the line, the model is re-fit.",
} as const;

/* ============================================================================
   5 · THE TWO LIGHTER READINGS OF THE SAME CHART  (v43 · OW-10)

   Ryan: "Production & Forecast is pretty good — but the charts assume
   knowledge. The tables are good." So NOTHING was removed from any tier: the
   scorecard table stays whole in all four views, and the chart GAINS two
   lighter readings rather than being cut down.
   ============================================================================ */

export const casperUltra = {
  heading: "This well is slowing down, gently and on schedule",
  body:
    "It has been pumping since the end of 2020, it made the most in its first year, and it gets a little smaller every month — which is what oil wells do. Nothing here is going wrong.",
} as const;

export const casperSimple = {
  heading: "How much oil this lease makes each month — and where it's heading",
  chartAria:
    "Monthly oil production for the CASPER A2 lease from December 2020 to April 2030. The solid line is what was actually reported to the state through April 2024; the dashed line is the model's estimate of what comes next, sloping gently down.",
  keySolidStrong: "Solid line",
  keySolid: " — what the operator actually reported",
  keyDashedStrong: "Dashed line",
  keyDashed: " — our estimate of what comes next",
  noteLead: "Read it in one go: the line climbs, peaks, then eases downhill. ",
  noteStrong: "That downhill slope is normal",
  noteTail:
    " — every oil and gas well produces most of its life's output early and tails off after. The dashed part is an estimate, not a promise, and it gets re-drawn whenever a new month is reported. Gas follows the same shape on this lease; the full two-line version is in the Detailed view.",
  /** The words this chart prints on its axes, in place of numbers. */
  axisTop: "its best month",
  axisZero: "nothing",
  seamBefore: "reported up to here",
  seamAfter: "our estimate from here",
  annotationEarly: "busiest early on",
  annotationTail: "a long, slow tail",
  xCaption:
    "barrels of oil produced each month, for the whole lease — not your share",
} as const;

/* ============================================================================
   6 · WHERE THE LEASE SITS
   ============================================================================ */

export const casperMap = {
  heading: "Where this lease sits",
  aria: "Map of Texas with a pin on Ward County in West Texas",
  pinLabel: "Ward Co.",
  caption: "Ward County · Permian Basin · West Texas",
  sub:
    "CASPER A2 sits in the Delaware Basin side of the Permian — the Phantom (Wolfcamp) field, just southeast of the New Mexico corner.",
} as const;

/* ============================================================================
   7 · THE LEASE SCORECARD

   OIL AND GAS ALWAYS SEPARATE, NEVER BOE — stated in the card's own footer, and
   the reason the grid carries four value columns rather than two. The
   owner-share columns come from a LABELLED example interest, because CASPER A2
   is not on this record and implying a real decimal applies to it would be the
   one dishonest thing on the page.
   ============================================================================ */

export interface ScorecardRow {
  label: string;
  /** The amber "estimate — not an appraisal" line under the label. */
  estimate?: boolean;
  oil: string;
  oilUnit: string;
  oilShare: string;
  oilShareUnit: string;
  gas: string;
  gasUnit: string;
  gasShare: string;
  gasShareUnit: string;
  /** A decline rate has no owner-share equivalent, so both share cells read "—". */
  shareNotApplicable?: boolean;
}

export const casperScorecard = {
  heading: "Lease scorecard — CASPER A2",
  interest: "Your interest · 0.01250",
  interestTag: "example",
  groupOil: "Oil",
  groupGas: "Gas",
  subLease: "Lease",
  subShare: "Your share",
  strip: [
    { value: "110", label: "active wells" },
    { value: "643.9", label: "acres" },
    { value: "Dec '20", label: "first posting" },
    { value: "Apr '24", label: "last actual posting" },
  ],
  footLead: '"Your share" = lease volume × ',
  footInterest: "0.01250",
  footTail:
    " example decimal interest — your actual interest is on your owner record. Oil and gas are always shown separately, in their own units — never combined into BOE.",
} as const;

export const casperScorecardRows: ScorecardRow[] = [
  {
    label: "Produced to date",
    oil: "239,059",
    oilUnit: "bbl",
    oilShare: "2,988",
    oilShareUnit: "bbl",
    gas: "387,914",
    gasUnit: "mcf",
    gasShare: "4,849",
    gasShareUnit: "mcf",
  },
  {
    label: "Last full month posted · Apr '24",
    oil: "1,656",
    oilUnit: "bbl",
    oilShare: "21",
    oilShareUnit: "bbl",
    gas: "2,535",
    gasUnit: "mcf",
    gasShare: "32",
    gasShareUnit: "mcf",
  },
  {
    label: "Current monthly rate · decline-anchored",
    oil: "2,024",
    oilUnit: "bbl",
    oilShare: "25",
    oilShareUnit: "bbl",
    gas: "2,911",
    gasUnit: "mcf",
    gasShare: "36",
    gasShareUnit: "mcf",
  },
  {
    label: "Decline rate",
    oil: "6.61",
    oilUnit: "%/mo",
    oilShare: "",
    oilShareUnit: "",
    gas: "5.74",
    gasUnit: "%/mo",
    gasShare: "",
    gasShareUnit: "",
    shareNotApplicable: true,
  },
  {
    label: "Projected · next 12 months",
    estimate: true,
    oil: "16,013",
    oilUnit: "bbl",
    oilShare: "200",
    oilShareUnit: "bbl",
    gas: "24,287",
    gasUnit: "mcf",
    gasShare: "304",
    gasShareUnit: "mcf",
  },
  {
    label: "Remaining reserves",
    estimate: true,
    oil: "30,399",
    oilUnit: "bbl",
    oilShare: "380",
    oilShareUnit: "bbl",
    gas: "50,009",
    gasUnit: "mcf",
    gasShare: "625",
    gasShareUnit: "mcf",
  },
  {
    label: "EUR · estimated ultimate recovery",
    estimate: true,
    oil: "269,458",
    oilUnit: "bbl",
    oilShare: "3,368",
    oilShareUnit: "bbl",
    gas: "437,923",
    gasUnit: "mcf",
    gasShare: "5,474",
    gasShareUnit: "mcf",
  },
];

/* ============================================================================
   8 · THE TWO UNIT NOTES  (v43 · OW-10)

   Ryan: "would somebody on Ultra even know what MCF means?" The tables stay
   whole in every view; what the lighter views get is the two words explained
   once, right where the table is.
   ============================================================================ */

export const unitNoteSimple = {
  lead: "The two units in that table, in plain English.",
  bbl: "bbl",
  bblBody: " is a barrel of oil — 42 gallons. ",
  mcf: "mcf",
  mcfBody:
    " is a thousand cubic feet of gas, roughly what an average home burns in four days. We never add them together: a barrel and a thousand cubic feet are different things that sell at different prices, so mixing them would hide which one is actually earning your money.",
} as const;

export const unitNoteUltra = {
  lead: "About the numbers above.",
  body:
    " Oil is counted in barrels and gas in thousands of cubic feet. We keep them apart because they sell at different prices — adding them together would hide which one is paying you.",
} as const;
