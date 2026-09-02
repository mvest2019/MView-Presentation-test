/**
 * THE WEEKLY REPORT — every figure and every sentence the briefing prints.
 *
 * EXTRACTED, NOT AUTHORED, on the same terms as `portal-demo-data.ts`: from
 * `owner/src/routes/app-briefing.html`. Not one figure is computed here.
 *
 * WHY THIS FILE IS SO LARGE. The weekly report is a DOCUMENT, not a dashboard,
 * and its copy is the product — the four answers, the reasons a range is a
 * range, the falsification conditions. Splitting the prose out of the data
 * would leave the components holding half a report each; keeping it here means
 * the whole issue can be read, and proof-read, in one place.
 *
 * THE FOUR VERSIONS ARE ONE DOCUMENT. Ultra, Essentials, Detailed and
 * Professional are not four reports — they are four depths of the same week,
 * and the design's rule is that nothing true in one is hidden from another.
 * Fields below are therefore tagged by the density that shows them, never
 * duplicated with different figures.
 *
 * WHAT IS REAL AND WHAT IS MODELLED, because this document mixes them by
 * design and the distinction is load-bearing:
 *
 *   REAL       posted volumes (RRC), prices (EIA settlements), the standing
 *              permit and adjacency counts, the map coordinates.
 *   MODELLED   every dollar. The MVestimate, the next-statement range, the
 *              per-lease expected month and its (±). Each carries its own
 *              qualifier in the copy, and `cl-lock` wherever it is a money
 *              figure a free account may not read in the clear.
 *   OBSERVED   nothing about payment. The report can raise the produced-versus-
 *              paid question; only a statement settles it. Page 1's
 *              Professional preface says this out loud and it must stay.
 */

/* ============================================================================
   THE ISSUE'S OWN FACTS

   SOURCE · the report generator's header block. In production each issue is a
   stored artifact with a source snapshot, so these are the artifact's fields.
   ============================================================================ */

export const briefingMeta = {
  title: "Weekly Mineral Owner Report",
  weekEnding: "Jul 04, 2026",
  record: "Smith Raymond E record",
  recordFull: "SMITH, RAYMOND E (BEE-084213)",
  leaseCount: "10",
  counties: ["Bee", "Cass", "Hood"],
  delivery: "delivered Saturday morning",
  /** The three read-time claims, one per density. */
  readSimple: "a 9-minute read — it finishes before the cup does",
  readDetailed:
    "the five pages in full, about 22 minutes — a long coffee, deliberately",
  readPro:
    "every page plus the method and the data appendix, about 35 minutes",
} as const;

/* ============================================================================
   THE PAGE RAIL  (v49 · OWNER-50)

   The report's stepper: five numbered pages plus the monthly and the archive,
   each with its minute mark. Navigation, not content — `wr-noprint`.

   ITS JOB IS DEPTH-AWARENESS. Ryan's note on this module reads "shallow enough
   that a user won't drown but deep enough they never reach the bottom"; the
   rail is what stops the second half of that from feeling like the first.
   ============================================================================ */

export interface RailStop {
  /** The circle: a page number, or a glyph for the two non-page stops. */
  mark: string;
  title: string;
  sub: string;
  /** The element the rail scrolls to. */
  target: string;
}

export const reportRail: RailStop[] = [
  { mark: "1", title: "Cover", sub: "the four answers · 2 min", target: "wrPage1" },
  { mark: "2", title: "Money", sub: "every lease vs expected · 4 min", target: "wrPage2" },
  { mark: "3", title: "Activity & map", sub: "around your land · 5 min", target: "wrPage3" },
  { mark: "4", title: "Prices", sub: "what reached you · 5 min", target: "wrPage4" },
  { mark: "5", title: "What to watch", sub: "dated, forward · 4 min", target: "wrPage5" },
  { mark: "✉", title: "Monthly", sub: "June — the keeper", target: "wrMonthly" },
  { mark: "≡", title: "Archive", sub: "every issue kept", target: "wrArchive" },
];

/* ============================================================================
   THE NUMBER PEOPLE OPEN IT FOR — NEXT MONTH'S STATEMENT

   v43 · OW-35/36. A RANGE, NEVER A SINGLE NUMBER, and the five reasons why are
   part of the figure rather than a disclaimer under it. The design treats
   printing a bare midpoint as a defect: the widest part of the band is the part
   only the owner's own paperwork can close, and saying so is what makes the
   upload ask honest.
   ============================================================================ */

export const nextStatement = {
  month: "August 2026",
  low: "$330",
  high: "$540",
  mid: "$435",
  midLine: "Most likely near the middle — about $435",
  qualifier: "an estimate with a range, never a promise",
  simpleBody:
    "That's what your ten leases look set to pay you next month, before your operator's own deductions. We give a range because a single number would be a guess wearing a suit — prices move, and we can't see what comes off your cheque until we see one.",
  quarterLabel: "Next quarter · Aug–Oct 2026:",
  quarterRange: "$980 – $1,600",
  quarterMid: "midpoint about $1,290",
  quarterNote: "three months of the same model",
} as const;

/** The five reasons the estimate is a band. Detailed and above. */
export const rangeReasons = [
  {
    lead: "We hold today's prices flat.",
    body:
      "The model runs WTI at $68.78 and Henry Hub at $3.245 for the whole month. Real prices don't hold still, and neither will your cheque.",
  },
  {
    lead: "The differential varies by oil quality and by area.",
    body:
      "Nobody is paid the benchmark. What your barrel actually sells for is the benchmark minus a discount that depends on gravity, sulphur and where the pipeline takes it — a heavier barrel can fetch a couple of dollars less than a light sweet one out of the same county. On gas it cuts the other way: rich, liquids-heavy gas can pay well above the headline, and in some areas the gas is flared and pays nothing at all.",
  },
  {
    lead: "Deducts are the part we genuinely cannot see.",
    body:
      "Gathering, compression, treating and marketing come off before your cheque and they differ lease by lease. Until you show us a statement, we are estimating them from area norms.",
  },
  {
    lead: "The calendar drifts.",
    body:
      "Operators post production two to three months behind, and the cheque month is not always the production month — a month can land in the next envelope.",
  },
  {
    lead: "Volumes can move.",
    body:
      "A workover, a shut-in, a cold snap or a pipeline outage moves a month either way, and the decline model only learns about it after the fact.",
  },
];

export const rangeNotice = {
  is: "a forward model of your own leases, sliced to next month.",
  isNot:
    "a payment ledger, a promise, or an appraisal. If your statement lands outside this range, the model was wrong — not your operator, and not necessarily either.",
} as const;

/** Where the $435 comes from, lease by lease. Detailed and above. */
export interface EstimateRow {
  lease: string;
  county?: string;
  operator: string;
  range: string;
  mid: string;
  /** The three-inactive row, which names three leases in one cell. */
  aggregate?: boolean;
}

export const estimateByLease: EstimateRow[] = [
  {
    lease: "Smith (305892)",
    county: "Bee",
    operator: "Bluestem Oil and Gas, LP",
    range: "$97 – $159",
    mid: "$128",
  },
  {
    lease: "Ledbetter (74318)",
    county: "Cass",
    operator: "Caddo Pine Resources, LLC",
    range: "$95 – $157",
    mid: "$126",
  },
  {
    lease: "Smith (423065)",
    county: "Bee",
    operator: "Bluestem Oil and Gas, LP",
    range: "$45 – $75",
    mid: "$60",
  },
  {
    lease: "Cedar Bend (578204)",
    county: "Hood",
    operator: "Trinity Fork USA, LLC",
    range: "$33 – $55",
    mid: "$44",
  },
  {
    lease: "Cedar Bend (619473)",
    county: "Hood",
    operator: "Trinity Fork USA, LLC",
    range: "$29 – $47",
    mid: "$38",
  },
  {
    lease: "Cedar Bend (391756)",
    county: "Hood",
    operator: "Trinity Fork USA, LLC",
    range: "$23 – $39",
    mid: "$31",
  },
  {
    lease: "Cedar Bend (480329)",
    county: "Hood",
    operator: "Trinity Fork USA, LLC",
    range: "$6 – $10",
    mid: "$8",
  },
  {
    lease: "Smith (267145) · 508936 · Averitt (65081)",
    operator: "Bluestem · Kestrel",
    range: "$0",
    mid: "$0",
    aggregate: true,
  },
];

export const estimateByLeaseFoot =
  "Each lease's month is its own six-year projection sliced to August and multiplied by your decimal interest; the band is ±24%, which is the model's honest spread once flat prices, unknown deducts and posting lag are allowed for. Ranges are rounded — the rounded rows won't add to the rounded total to the dollar.";

/**
 * The upload ask, framed as a benefit to the owner.
 *
 * IT HAS TO BE TRUE FOR THE OWNER FIRST. The Professional note at the foot of
 * this block says why in the open: layer 4 only ever gets the volume it needs
 * if the owner is better off for uploading, so the ask is written as "narrow
 * your own range", never as "help us improve our data".
 */
export const accuracyAsk = {
  heading: "Make this estimate more accurate",
  chip: "You keep the documents — we keep the maths",
  body:
    "The widest part of that range is the part only your paperwork can close: your exact decimal, and what your operator actually takes out. Two things shrink it fast.",
  items: [
    {
      lead: "① Your division orders",
      body:
        "They state your exact decimal interest on each lease. Right now we use the decimal on the public record; a division order replaces an assumption with a fact.",
    },
    {
      lead: "② Your last five monthly cheques",
      body:
        "Statements show the real deducts and the real price you were paid — the two inputs we are currently estimating from area norms.",
    },
  ],
  honest: {
    summary: "What we'd do with five cheques — the honest version",
    body:
      'We line up each month you were actually paid against what this model said that month would be, and fit the difference. If the model ran consistently high, we carry that correction forward, and the report starts telling you the size of it in plain words — the sentence takes the form "across your last five cheques we ran about X% high, so we\'ve reduced the estimate by X% from here." We are not claiming a figure today: X only exists once your own statements are in, it is computed from your record and nobody else\'s, and it is re-fitted every time a new cheque lands. Five months is the minimum that makes the fit worth anything; more is better. Documents are analyzed, not stored.',
  },
  method:
    "a per-owner ordinary-least-squares fit of remitted owner-share against modeled owner-share by production month, one fit per operator where the sample allows it (deduct structures are an operator/area property, not an owner property). The correction is applied as a multiplicative bias term to the central estimate; the band is re-derived from the residual spread rather than the fixed ±24% prior, so a well-fitted record gets a genuinely narrower range instead of a cosmetic one. Under five paired months the fit is not reported at all.",
} as const;

/* ============================================================================
   PAGE 1 · THE COVER — THE FOUR ANSWERS

   THE COVER IS THE WHOLE REPORT for a reader who stops here, and it is written
   to be. "If you stop here, you will not have missed anything that mattered
   this week" is a promise the other four pages have to keep, which is why
   nothing below the cover may contain a finding the cover omits.
   ============================================================================ */

export const coverIntros = {
  simple:
    "Nine minutes, one cup. This cover is written so that the four answers below are enough. If you stop here, you will not have missed anything that mattered this week — every page beneath is the evidence for these four lines, kept for when you want it, not because you need it.",
  detailed:
    "This is the long version — the same week, told properly. Twenty-two minutes and five pages: what all ten of your leases actually posted and how far each drifted from expected, who is drilling within a mile of you, what moved in the world and whether it reached your number, and what is coming that already has a date on it. A summary can only tell you the total was fine — the table on page 2 can show you a single lease going quietly sideways underneath a fine total.",
  pro:
    "The version written to be checked. Everything in Detailed, plus the method behind each estimate, decimal interests as recorded, the signal table and the data appendix. Two things first: the production numbers are the operator's own filings, not our measurements — where a lease drifted, the filing is the fact and the model is what was wrong. And no payment figure in this document is observed — every \"were you paid\" question here is a question we can raise, not a finding we can make; the only instrument that settles one is your own statement.",
} as const;

export interface CoverAnswer {
  n: string;
  question: string;
  answer: string;
  page: string;
}

export const coverAnswers: CoverAnswer[] = [
  {
    n: "1",
    question: "Am I making money?",
    answer:
      "Yes — on the expected curve. Fresh gas postings in Bee; Ledbetter easing right on its decline curve.",
    page: "wrPage2",
  },
  {
    n: "2",
    question: "Are new wells being drilled around me?",
    answer:
      "None on your land (0 permits, 0 completions) — but 22 leases and 38 permits next door, densest around Ledbetter.",
    page: "wrPage3",
  },
  {
    n: "3",
    question: "What does the new activity mean for me?",
    answer:
      "Neighbors' drilling in Cass County keeps your acreage relevant — watch for completions that could nudge offers and activity.",
    page: "wrPage3",
  },
  {
    n: "4",
    question: "What do world events mean for prices — and me?",
    answer:
      "Gas firmed (+1.53%), oil eased (−0.13%) — a mix that favors your gas-heavy Bee units this week.",
    page: "wrPage4",
  },
];

export const coverFoot =
  'Estimates are informational only — not a payment ledger, not an appraisal, not legal, tax, or investment advice. On a quiet week this cover says "nothing new" — we never invent activity.';

/** Essentials only: the chart, then the one action. */
export const simpleEvidence = {
  chartHeading: "This week in your money — daily view",
  chartChip:
    "Modeled daily from the Ledbetter curve × your DI · illustrative between posted months",
  chartFoot:
    "Owner-share $/day, 13 weeks — this week highlighted, 12-week average dashed. Daily points are modeled between the posted monthly anchors; production snapshots them for real. An estimate, not a payment ledger.",
  actionHeading: "One next action",
  actionBody:
    "Ledbetter produced gas in 3 months we can see — only your statements show whether you were paid. The check is included with your plan.",
  actionCta: "Run your included Lease Audit",
} as const;

/* ============================================================================
   PAGE 2 · AM I MAKING MONEY?

   RANKED BY DRIFT FROM EXPECTED, BIGGEST EXCEPTION FIRST — not by size, and
   not alphabetically. The ordering is the analysis: a fine total can hide one
   lease going sideways, and this table's job is to put that lease at the top.

   THE TABLE NEVER TRUNCATES. An owner with forty leases gets forty rows. The
   foot says so, because "top 10 shown" on a page titled "am I making money"
   would be the exact failure the page exists to prevent.
   ============================================================================ */

export const page2Intro = {
  verdict: "Making — on the expected curve, across the whole record.",
  body:
    "All 10 leases together posted 160,455 mcf · 1,158 bbl this month — within ±2% of what the model expected. The biggest movers: fresh gas across your Smith Gas Units in Bee (largest: 27,120 mcf on 305892, 37,610 mcf on 423065 — both Bluestem Oil and Gas, LP). No new permits, completions, or status changes touched your units this week. Ledbetter (74318) eased right on its decline curve — your six-year share of it:",
  ledbetterShare: "$5,300",
} as const;

export interface MoneyRow {
  lease: string;
  county?: string;
  posted: string;
  expected: string;
  /** The signed drift, and its direction, drawn as the delta chip. */
  drift: string;
  driftDirection: "up" | "down" | "none";
  means: string;
  /** The six-year share inside `means`, which is a `cl-lock` money figure. */
  meansLocked?: string;
  meansTail?: string;
  total?: boolean;
}

export const page2Rows: MoneyRow[] = [
  {
    lease: "Smith (267145)",
    county: "Bee",
    posted: "58,580 mcf · 189 bbl",
    expected: "57,200 mcf",
    drift: "(+2.4%)",
    driftDirection: "up",
    means: "posts big volumes yet projects $0 to your decimal — the watch item",
  },
  {
    lease: "Smith (423065)",
    county: "Bee",
    posted: "37,610 mcf · 303 bbl",
    expected: "38,400 mcf",
    drift: "(−2.1%)",
    driftDirection: "down",
    means: "steady earner · ",
    meansLocked: "$4,100",
    meansTail: " six-year share",
  },
  {
    lease: "Cedar Bend (619473)",
    county: "Hood",
    posted: "2,520 mcf",
    expected: "2,560 mcf",
    drift: "(−1.6%)",
    driftDirection: "down",
    means: "on its curve · ",
    meansLocked: "$2,600",
    meansTail: " six-year share",
  },
  {
    lease: "Ledbetter (74318)",
    county: "Cass",
    posted: "482 bbl · 399 mcf",
    expected: "490 bbl",
    drift: "(−1.6%)",
    driftDirection: "down",
    means: "oil-weighted · slowing on schedule · ",
    meansLocked: "$5,300",
    meansTail: " six-year share",
  },
  {
    lease: "Cedar Bend (578204)",
    county: "Hood",
    posted: "3,990 mcf",
    expected: "4,050 mcf",
    drift: "(−1.5%)",
    driftDirection: "down",
    means: "steady Barnett tail · ",
    meansLocked: "$3,000",
    meansTail: " six-year share",
  },
  {
    lease: "Cedar Bend (480329)",
    county: "Hood",
    posted: "1,955 mcf",
    expected: "1,980 mcf",
    drift: "(−1.3%)",
    driftDirection: "down",
    means: "the pad's smallest producer · ",
    meansLocked: "$540",
    meansTail: " six-year share",
  },
  {
    lease: "Smith (305892)",
    county: "Bee",
    posted: "27,120 mcf · 133 bbl",
    expected: "26,800 mcf",
    drift: "(+1.2%)",
    driftDirection: "up",
    means: "your strongest lease · ",
    meansLocked: "$8,700",
    meansTail: " six-year share",
  },
  {
    lease: "Smith (508936)",
    county: "Bee",
    posted: "26,220 mcf · 49 bbl",
    expected: "25,900 mcf",
    drift: "(+1.2%)",
    driftDirection: "up",
    means: "quiet sister unit — same recompletion watch as 267145",
  },
  {
    lease: "Cedar Bend (391756)",
    county: "Hood",
    posted: "2,030 mcf",
    expected: "2,010 mcf",
    drift: "(+1.0%)",
    driftDirection: "up",
    means: "on its curve · ",
    meansLocked: "$2,100",
    meansTail: " six-year share",
  },
  {
    lease: "Averitt (65081)",
    county: "Cass",
    posted: "31 mcf · 2 bbl",
    expected: "~0",
    drift: "(trace)",
    driftDirection: "none",
    means: "inactive — county value shown; neighbor activity is its story",
  },
  {
    lease: "Total — all 10 leases",
    posted: "160,455 mcf · 1,158 bbl",
    expected: "within ±2%",
    drift: "of the model",
    driftDirection: "none",
    means: "sum of the rows above · gross lease volumes as posted, not your share",
    total: true,
  },
];

export const page2Foot =
  "Owners with more leases get every lease stacked the same way — this table never truncates. The (±) column compares each posting to the decline model's expected month; drifts beyond ~2σ raise the inflection alert.";

export const page2Trend = {
  heading:
    "Ledbetter owner-share trend (modeled from the production curve — not your full statement)",
  chip: "Modeled — Ledbetter only",
  foot:
    "Ledbetter (74318) owner-share $/mo — modeled from the lease cash-flow curve × your DI 0.00243700; it is not your full portfolio income and not a payment ledger. Portfolio owner-share statement: not available yet. March oil price input: $102.92 — source: market price feed, 2026-03-31, used only in the modeled estimate.",
} as const;

export const page2Anchor = {
  lead: "Monthly production anchor.",
  body:
    "Ledbetter (74318) latest posting: 482 bbl · 399 mcf. Smith (305892) latest: 27,120 mcf · 133 bbl. The weekly report is a slice; the monthly is truth — new monthly numbers always appear here when they post, even on quiet weeks.",
} as const;

/* ============================================================================
   PAGE 3 · ARE NEW WELLS BEING DRILLED AROUND ME?

   THE ANSWER IS ZERO, AND ZERO LEADS THE PAGE. Two of the four KPIs are 0 and
   they are printed as 0 with a sentence explaining what was watched — the
   design's rule that a quiet week is a result, reported, not an empty state.
   ============================================================================ */

export interface ActivityKpiRow {
  label: string;
  value: string;
  sub: string;
  hint: string;
  hot?: boolean;
}

export const page3Kpis: ActivityKpiRow[] = [
  {
    label: "New permits · your land",
    value: "0",
    sub: "no new drilling filed on your units",
    hint: "what we watched →",
  },
  {
    label: "Completions · your land",
    value: "0",
    sub: "no new wells finished on your units",
    hint: "what we watched →",
  },
  {
    label: "Leases that changed",
    value: "5",
    sub:
      "4 Smith units posted fresh gas + Ledbetter eased on schedule · 1 worth a look (Ledbetter) · behind them: 228 raw filings on your + adjacent leases",
    hint: "the evidence →",
    hot: true,
  },
  {
    label: "Adjacent leases · ~1 mi",
    value: "22",
    sub: "plus 38 nearby permits — operator interest, not your income",
    hint: "what “adjacent” means →",
    hot: true,
  },
];

export const page3Explain = {
  summary: "What exactly are the 228, the 22, and the 38? (plain English)",
  body:
    "228 new-production records — each is one month's production filing on one of your leases or a lease adjacent to them. They're how the state learns the neighborhood's wells produced, and how we re-check what your checks should say. 22 adjacent leases — the distinct tracts within about a mile of yours (names: Nora Fay, Walter Bramwell, Westlake, Weldon Heirs, Beckett, Trescott, Ashworth, Chadbourne, Fenwick, Winfield, Patsy Unit — densest around Ledbetter; your Smith corner genuinely returns none). 38 nearby permits — the distinct drilling permits on the same 1-mile lists (11 near Ledbetter · 6 near Averitt · 25 near Cedar Bend). None pay you directly; together they say operators still care about your neighborhood.",
  chip: "Live data",
} as const;

export const drillingAroundYou = {
  heading: "Drilling around you — county · play · your operators, as a trend",
  chip:
    "Standing counts real · month-by-month movement is a labeled sample — dated trend not available yet",
  cells: [
    {
      label: "Your counties",
      value: "Hood 25 · Cass 13",
      note:
        "of the 38 nearby permits (deduped) — Cedar Bend's corridor is the busiest; Bee honestly quiet at 0",
    },
    {
      label: "Your play",
      value: "Haynesville ▲",
      note:
        "East-Texas gas drilling holding firm on LNG pull · Barnett (Hood) recompletion-only · Wilcox (Bee) quiet",
    },
    {
      label: "Your operators",
      value: "1 of 4 filing",
      note:
        "Caddo Pine filed a recompletion permit near Ledbetter (Nov 2025) — the others are producing, not drilling",
    },
    {
      label: "Within 1 mi of you",
      value: "38",
      note:
        "standing permits (real, deduped) · densest at Ledbetter (11) · your own land: 0 — normal, most weeks",
    },
  ],
  body:
    "Whose permits are they? The near-Ledbetter list skews to neighbor-tract operators (EnerVista, Pine Belt, Cedarleaf) rather than your own Caddo Pine — activity that de-risks your area without touching your acreage. Are my operators drilling? Mostly no — and for mature leases that's expected; the one exception (Caddo Pine's recompletion filing) is the healthiest kind. The full operator split, month by month and on a month-colored map, is one click away.",
} as const;

/* ----------------------------------------------------------------------------
   THE THREE COUNTY MAPS

   REAL Esri World Topo rasters at REAL bounding boxes, with pins at the leases'
   reported surface locations. They are rasters rather than a live map on
   purpose: the printed and emailed report has to keep a genuine map image, and
   a canvas map prints blank.

   The pin percentages are positions within the raster, so a bbox and its pins
   must be changed together or the pins drift off their wells.
   ---------------------------------------------------------------------------- */

export interface MapPin {
  /** `hot` = active lease, `idle` = inactive, `adj` = adjacent tract. */
  kind: "hot" | "idle" | "adj" | "plain";
  left: string;
  top: string;
  title: string;
}

export interface CountyMap {
  id: string;
  county: string;
  bbox: string;
  alt: string;
  /** The badge in the raster's top-right — the permit count for this county. */
  badge: string;
  pins: MapPin[];
  labels: { left: string; top: string; text: string }[];
  caption: string;
}

/** One Esri export URL builder, so the three maps cannot drift apart. */
export function esriRaster(bbox: string, size = "600,420"): string {
  return `https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${size}&format=png&f=image`;
}

export const countyMaps: CountyMap[] = [
  {
    id: "wrMapCass",
    county: "CASS CO.",
    bbox: "-94.45,32.84,-93.90,33.16",
    alt: "Cass County — Esri World Topo map with Suzie's leases and nearby activity",
    badge: "11 permits ≤ 1 mi of Ledbetter · 6 of Averitt",
    pins: [
      { kind: "hot", left: "38.2%", top: "57.0%", title: "Ledbetter (74318)" },
      {
        kind: "idle",
        left: "39.3%",
        top: "55.5%",
        title: "Averitt (65081) — 0.4 mi NE of Ledbetter",
      },
      { kind: "adj", left: "38.2%", top: "57.1%", title: "Nora Fay (24106)" },
      { kind: "adj", left: "40.1%", top: "54.7%", title: "Walter Bramwell (24107)" },
      { kind: "adj", left: "40.8%", top: "55.3%", title: "Westlake (24289)" },
      { kind: "adj", left: "37.6%", top: "53.9%", title: "Weldon Heirs (301454)" },
      { kind: "adj", left: "37.8%", top: "51.9%", title: "Beckett (23901)" },
      { kind: "adj", left: "40.0%", top: "52.7%", title: "Ashworth (23415)" },
      { kind: "adj", left: "35.2%", top: "56.9%", title: "Fenwick, Etal (23744)" },
    ],
    labels: [
      { left: "38.2%", top: "61.5%", text: "Ledbetter (74318)" },
      { left: "44.5%", top: "52.5%", text: "Averitt" },
    ],
    caption:
      "Ledbetter (active) · Averitt (inactive) · adjacent events · densest neighbor activity · Haynesville",
  },
  {
    id: "wrMapBee",
    county: "BEE CO.",
    bbox: "-98.028,28.24,-97.572,28.52",
    alt: "Bee County — Esri World Topo map with the four Smith Gas Units",
    badge: "0 permits ≤ 1 mi — honestly quiet",
    pins: [
      {
        kind: "plain",
        left: "70.8%",
        top: "36.0%",
        title:
          "Smith Gas Unit (305892) + 508936 (Temp Abandoned) — shared wellbore",
      },
      {
        kind: "plain",
        left: "70.0%",
        top: "36.9%",
        title:
          "Smith Gas Unit (423065) + 267145 (Temp Abandoned) — shared wellbore",
      },
    ],
    labels: [{ left: "70.4%", top: "44%", text: "Smith Gas Unit × 4 (2 wellbores)" }],
    caption:
      "2 wellbores × 2 RRC leases each (305892+508936 · 423065+267145) · no adjacent leases within 1 mi (real scan) · fresh gas postings · Bluestem",
  },
  {
    id: "wrMapHood",
    county: "HOOD CO.",
    bbox: "-98.03,32.34,-97.62,32.57",
    alt: "Hood County — Esri World Topo map centered on the real Cedar Bend pad, with the Winfield and Patsy Unit neighbors",
    badge: "25 permits ≤ 1 mi of Cedar Bend",
    pins: [
      {
        kind: "plain",
        left: "49.3%",
        top: "51.0%",
        title:
          "Cedar Bend 578204 · 619473 · 391756 · 480329 — wells 6H, 7H, 5H, 1H on one pad",
      },
      { kind: "adj", left: "47.2%", top: "51.1%", title: "Patsy Unit (257466)" },
      {
        kind: "adj",
        left: "52.6%",
        top: "50.7%",
        title: "Winfield (262740 · 267043 · 267044 · 267045)",
      },
      { kind: "adj", left: "49.2%", top: "50.6%", title: "Winfield (251317)" },
    ],
    labels: [
      { left: "49.3%", top: "58%", text: "Cedar Bend × 4 · one pad (6H·7H·5H·1H)" },
    ],
    caption:
      "4 Cedar Bend leases · one pad (all active) · Winfield + Patsy Unit neighbors · quiet Barnett decline · Trinity Fork USA",
  },
];

export const countyMapsFoot =
  "Real Esri World Topo maps — fixed on the page, so the printed and emailed report keep the genuine map image.";

/* ----------------------------------------------------------------------------
   ONE MINI MAP PER LEASE THAT CHANGED

   FIVE CHANGED, FIVE UNCHANGED, and the unchanged five are behind a `<details>`
   rather than dropped: "nothing to map for them" is itself the week's finding.

   LOOK-ALIKE TILES ARE HONEST HERE. Four Cedar Bend leases share one pad and
   each Smith pair rides one wellbore, so several tiles are the same image at
   the same coordinates. The caption says so rather than jittering the bboxes
   to make them look different.
   ---------------------------------------------------------------------------- */

export interface LeaseMini {
  lease: string;
  bbox: string;
  pin: "hot" | "idle";
  note: string;
}

export const changedLeaseMinis: LeaseMini[] = [
  {
    lease: "Ledbetter (74318)",
    bbox: "-94.2754,32.9546,-94.2054,32.9996",
    pin: "hot",
    note: " · Cass · producing",
  },
  {
    lease: "Smith Gas Unit (305892)",
    bbox: "-97.8963,28.4847,-97.8263,28.5297",
    pin: "hot",
    note: " · Bee · producing",
  },
  {
    lease: "Smith Gas Unit (423065)",
    bbox: "-97.8997,28.4821,-97.8297,28.5271",
    pin: "hot",
    note: " · Bee · producing",
  },
  {
    lease: "Smith Gas Unit (267145)",
    bbox: "-97.8997,28.4821,-97.8297,28.5271",
    pin: "idle",
    note: " · Bee · inactive — shares 423065's wellbore",
  },
  {
    lease: "Smith Gas Unit (508936)",
    bbox: "-97.8963,28.4847,-97.8263,28.5297",
    pin: "idle",
    note: " · Bee · inactive — shares 305892's wellbore",
  },
];

export const unchangedLeaseMinis: LeaseMini[] = [
  {
    lease: "Averitt (65081)",
    bbox: "-94.2692,32.9595,-94.1992,33.0045",
    pin: "idle",
    note: " · Cass · inactive",
  },
  {
    lease: "Cedar Bend (578204)",
    bbox: "-97.8628,32.4298,-97.7928,32.4748",
    pin: "hot",
    note: " · Hood · well 6H, shared pad",
  },
  {
    lease: "Cedar Bend (619473)",
    bbox: "-97.8628,32.4298,-97.7928,32.4748",
    pin: "hot",
    note: " · Hood · well 7H, shared pad",
  },
  {
    lease: "Cedar Bend (391756)",
    bbox: "-97.8628,32.4298,-97.7928,32.4748",
    pin: "hot",
    note: " · Hood · well 5H, shared pad",
  },
  {
    lease: "Cedar Bend (480329)",
    bbox: "-97.8628,32.4298,-97.7928,32.4748",
    pin: "hot",
    note: " · Hood · well 1H, shared pad",
  },
];

export const leaseMinisFoot =
  "Each mini is centered on the lease's exact reported surface location (public well records). Look-alike tiles are honest: the four Cedar Bend leases sit on one pad, and each Smith pair rides one shared wellbore.";

export const unchangedNote =
  "5 unchanged leases this week — Cedar Bend ×4 (Hood · steady on their curves) and Averitt (Cass · inactive). Nothing new to map for them.";

export const page3GoodNews = {
  heading: "3 · The good news in this week's activity",
  lead:
    "✓ All 7 producing leases posted on schedule — a perfect posting week, and every posting is money earned.",
  body:
    "Your neighborhood stayed busy on your behalf too: 228 production filings landed on your + adjacent leases, and 38 standing permits within a mile say operators still spend money next to your rock — the quiet force that supports any future offer price. Meanwhile your own land stayed undisturbed (0 permits, 0 completions on your units — no rigs, no surface work). The adjacent tracts at work: Nora Fay, Walter Bramwell, Beckett, Trescott, Weldon Heirs and the Ashworth tracts around Ledbetter; nearby wells that come in strong tend to keep operators interested in your area — historically that shows up as steadier operations and, sometimes, unsolicited offers. If an offer letter arrives, check it against your MVestimate before responding.",
} as const;

/* ============================================================================
   PAGE 4 · PRICES AND THE WORLD

   THE HARDEST PAGE TO WRITE HONESTLY, because it is the one most likely to be
   mistaken for advice. Every bullet therefore ends in "what it means for you"
   tied to THIS record's weighting, and every claim carries a public source
   chip a reader can open. The foot says "context only; never a signal to buy,
   sell, or lease" and that line is not optional.
   ============================================================================ */

export interface PriceTicker {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down";
}

export const priceTickers: PriceTicker[] = [
  { label: "WTI crude ⌕", value: "$68.78", change: "▼ 0.13%", direction: "down" },
  { label: "Brent crude ⌕", value: "$72.13", change: "▲ 0.46%", direction: "up" },
  { label: "Natural gas ⌕", value: "$3.245", change: "▲ 1.53%", direction: "up" },
];

export const priceTickerNote =
  "Tap any price for its chart. A fourth benchmark (NGL basket — Mont Belvieu) joins when the live price series connects.";

export const page4Lead = {
  before: "Your record is gas-weighted: the two strongest Smith units carry ",
  locked1: "$12,800",
  middle: " of your ",
  locked2: "$26,340",
  after:
    " MVestimate. Gas firmed this week (Nat Gas $3.245, +1.53%) while WTI eased to $68.78 (−0.13%) — a mix that favors your Bee units over your oil-weighted Cass lease.",
} as const;

export const whyGasMoved = {
  heading: "Why gas moved this week — +1.53% to $3.245",
  chip: "Sample — illustrative shape · the real 12-week series isn't connected yet",
  drivers: [
    {
      lead: "Summer cooling demand",
      body:
        "hot-weather power burn keeps pulling gas into electricity generation.",
      source: "source: EIA gas weekly ↗",
      href: "https://www.eia.gov/naturalgas/weekly/",
    },
    {
      lead: "Gulf Coast LNG exports",
      body:
        "Europe keeps buying Texas gas, structural support under the price your Bee units sell into.",
      source: "source: EIA ↗",
      href: "https://www.eia.gov/naturalgas/weekly/",
    },
    {
      lead: "Storage injections ran a touch light",
      body:
        "less gas going into storage than expected firms the near-term price.",
      source: "source: EIA Henry Hub ↗",
      href: "https://www.eia.gov/dnav/ng/hist/rngwhhdD.htm",
    },
  ],
  means:
    "each uptick flows to your gas-heavy Bee units first — 92% of unit 305892's EUR is gas. Representative commentary consistent with this issue's real prices; the live driver feed wires in production.",
} as const;

export const estimateByCounty = {
  heading: "Where your MVestimate lives — by county",
  chip: "Estimate — not an appraisal",
  foot:
    "Bee = 4 Smith Gas Units (Bluestem) · Hood = 4 Cedar Bend leases (Trinity Fork) · Cass = Ledbetter (Caddo Pine Resources); Averitt projects $0.",
  countyNote:
    "map-first · active operators · cumulative oil & gas · producing reservoirs",
} as const;

export const worldInOneLine =
  "Europe keeps buying Texas gas (good for your Bee units — gas firmed +1.53% this week), and oil is steady in the high $60s (exactly what Ledbetter's math assumes). Nothing this week changes your estimate.";

export interface WorldBullet {
  lead: string;
  body: string;
  means: string;
  source: string;
  href: string;
}

export const worldContext: WorldBullet[] = [
  {
    lead: "Geopolitics — Middle East:",
    body:
      "tanker traffic through the Strait of Hormuz keeps pricing in a persistent risk premium; every flare-up around Iran headlines briefly bids crude up.",
    means:
      "headline spikes touch Ledbetter's oil price for a month or two, but your estimate is built on the boring average, not the spike — we don't re-rate your minerals on a headline.",
    source: "source: EIA · Strait of Hormuz ↗",
    href: "https://www.eia.gov/todayinenergy/detail.php?id=65504",
  },
  {
    lead: "Geopolitics — Russia/Ukraine:",
    body:
      "the war keeps rerouting global gas: Europe still buys heavy LNG volumes, and much of it ships from the Texas Gulf Coast.",
    means:
      "sustained export pull is quiet, structural support under the gas price your Bee units sell into — the most owner-relevant world story on this page.",
    source: "source: EIA gas weekly ↗",
    href: "https://www.eia.gov/naturalgas/weekly/",
  },
  {
    lead: "Oil — the analyst view this week:",
    body:
      "with major producers holding output discipline, consensus keeps crude range-bound in the high $60s–low $70s.",
    means:
      "steady, unexciting months for oil-weighted Ledbetter — exactly what its decline curve already assumes.",
    source: "source: EIA STEO ↗",
    href: "https://www.eia.gov/outlooks/steo/",
  },
  {
    lead: "Natural gas — the analyst view this week:",
    body:
      "summer cooling demand plus LNG pull has analysts leaning constructive on gas near current levels ($3.245 this week).",
    means:
      "each uptick flows to your gas-heavy Bee units first, where 92% of unit 305892's EUR is gas.",
    source: "source: EIA STEO gas ↗",
    href: "https://www.eia.gov/outlooks/steo/report/natgas.php",
  },
  {
    lead: "What would change this picture:",
    body:
      "a sustained gas move above ~$4 or oil back over $100 (like the Mar 2026 spike to $102.92) would lift MVestimates portfolio-wide; a slide toward COVID-era prices would do the opposite.",
    means: "Either would lead this section — and trigger an alert.",
    source: "source: EIA Henry Hub daily ↗",
    href: "https://www.eia.gov/dnav/ng/hist/rngwhhdD.htm",
  },
];

export interface SourceGroup {
  label: string;
  links: { text: string; href: string }[];
}

export const sourceList: SourceGroup[] = [
  {
    label: "Middle East · Strait of Hormuz risk premium",
    links: [
      {
        text: "EIA · Strait of Hormuz ↗",
        href: "https://www.eia.gov/todayinenergy/detail.php?id=65504",
      },
      {
        text: "EIA · World Oil Transit Chokepoints ↗",
        href: "https://www.eia.gov/international/analysis/special-topics/world_oil_transit_Chokepoints",
      },
    ],
  },
  {
    label: "Russia/Ukraine gas rerouting · US Gulf LNG to Europe",
    links: [
      {
        text: "EIA · Natural Gas Weekly Update ↗",
        href: "https://www.eia.gov/naturalgas/weekly/",
      },
    ],
  },
  {
    label: "Oil — OPEC discipline & the crude range",
    links: [
      {
        text: "EIA · Short-Term Energy Outlook ↗",
        href: "https://www.eia.gov/outlooks/steo/",
      },
    ],
  },
  {
    label: "Natural gas — Henry Hub level · summer + LNG pull",
    links: [
      {
        text: "EIA · STEO Natural Gas ↗",
        href: "https://www.eia.gov/outlooks/steo/report/natgas.php",
      },
      {
        text: "EIA · Henry Hub daily spot ↗",
        href: "https://www.eia.gov/dnav/ng/hist/rngwhhdD.htm",
      },
    ],
  },
  {
    label: "Texas permits & production — the state record itself",
    links: [{ text: "Texas Railroad Commission ↗", href: "https://www.rrc.texas.gov/" }],
  },
];

export const page4Foot =
  "Representative commentary for the prototype, consistent with this issue's real prices — a live world-events + analyst feed replaces it in the full product. Context only; never a signal to buy, sell, or lease.";

/* ============================================================================
   PAGE 5 · WHAT TO WATCH

   THE ONLY FORWARD-LOOKING PAGE, and everything on it carries a DATE or a
   TRIGGER. "Watch your mailbox" is not a forecast; "gas sustained above ~$4 on
   a 4-week average" is a condition that can be checked. That distinction is
   what keeps this page from being horoscope.
   ============================================================================ */

export const page5Watch = [
  {
    lead: "Watch your two quiet Smith units",
    body:
      "— they still make gas; if the operator reworks one, your income could grow. We'll alert you.",
  },
  {
    lead: "Watch the drilling near Ledbetter",
    body:
      "— 11 permits sit within a mile of it. Neighbors' wells aren't your money, but they keep your area interesting.",
  },
  {
    lead: "Watch your mailbox",
    body:
      "— activity like this sometimes brings offer letters. Check any offer against your estimate before answering.",
  },
];

export const calendar = [
  {
    when: "~Jul 15–20",
    what: "Next RRC posting window",
    note:
      "Bluestem posts in batches — the next cluster on your four Smith units lands here; the (±) column re-grades then",
  },
  {
    when: "Sat Jul 11",
    what: "Your next weekly report",
    note: "quiet week? it says so honestly — set quiet-week behavior in Settings",
  },
  {
    when: "Price triggers",
    what: "Gas > ~$4 · oil > ~$100",
    note:
      "either sustained move re-rates your estimate and alerts you — gas closed $3.245 this week",
  },
  {
    when: "Oct 03",
    what: "Q3 quarterly deep-dive",
    note: "trend pages + year-over-year — the keeper report for the family file",
  },
];

export const bluestemNote =
  "Bluestem activity in Bee. Units 267145 and 508936 keep posting volumes (58,580 and 26,220 mcf) yet project $0 to your decimal — a recompletion or workover there would be the upside surprise. Also: 22 adjacent leases and 38 nearby permits sit within about a mile of your units, densest around Ledbetter in Cass County — completions there are the leading indicator for new-well interest around your acreage.";

export interface SignalRow {
  signal: string;
  where: string;
  trigger: string;
  action: string;
}

export const signalTable: SignalRow[] = [
  {
    signal: "Recompletion / workover on 267145 · 508936",
    where: "Bee · Bluestem",
    trigger: "W-2/G-1 filing or volume step-change",
    action: "Alert + re-run the unit's projection",
  },
  {
    signal: "Any of the 11 permits near Ledbetter advances",
    where: "Cass · neighbor tracts",
    trigger: "spud or completion filing",
    action: "Alert + re-score new-well band",
  },
  {
    signal: "Gas sustains > ~$4",
    where: "portfolio-wide",
    trigger: "4-week average",
    action: "MVestimate refresh flagged in this report",
  },
  {
    signal: "Ledbetter deductions drift further from area norm",
    where: "Cass · Caddo Pine",
    trigger: "next audited statement",
    action: "Flag in your audit findings",
  },
  {
    signal: "Shut-in / missed posting on any producing lease",
    where: "any",
    trigger: "gap in the monthly postings",
    action: "Alert — the signal that's not normal decline",
  },
];

export const quietWeek = {
  label: "If this had been a quiet week",
  quote:
    '"Nothing new to report on the Smith Raymond E record this week. Quiet weeks are normal — your monthly anchor is unchanged, and we don\'t invent activity. Next on the calendar: new RRC production postings for your Bee units."',
  note:
    'You choose quiet-week behavior in Settings: short "nothing new" note · skip entirely · send with market context.',
} as const;

export const dossierNote = {
  heading: "Dossier note",
  body:
    "Bluestem's four Smith units tend to post production in batches — expect the next cluster of postings to land together, like this week's did.",
  cta: "Ask a follow-up",
} as const;

export const glossaryCorner = [
  {
    term: "Decimal interest",
    def: "Your ownership share of a lease, written as a decimal — e.g. 0.00538700 on Smith 305892. Multiply gross lease dollars by it to get your share.",
  },
  {
    term: "MVestimate",
    def: "Your projected six-year owner-share earnings at the current decline and price outlook. Forward-looking — an estimate, never an appraisal.",
  },
  {
    term: "Reservoir",
    def: "The underground rock layer a lease produces from. One lease → one reservoir → possibly several wells.",
  },
  {
    term: "EUR — estimated ultimate recovery",
    def: "Everything a lease (or a single well) is expected to produce over its whole life. EUR − produced = what's left (reserves).",
  },
];

/** Professional only: the data appendix. Decimal interests as recorded. */
export interface AppendixRow {
  lease: string;
  operator: string;
  decimal: string;
  estimate: string;
  gas: string;
  oil: string;
}

export const dataAppendix: AppendixRow[] = [
  {
    lease: "Smith Gas Unit (305892)",
    operator: "Bluestem Oil and Gas, LP",
    decimal: "0.00538700",
    estimate: "$8,700",
    gas: "27,120",
    oil: "133",
  },
  {
    lease: "Ledbetter (74318)",
    operator: "Caddo Pine Resources, LLC",
    decimal: "0.00243700",
    estimate: "$5,300",
    gas: "399",
    oil: "482",
  },
  {
    lease: "Smith Gas Unit (423065)",
    operator: "Bluestem Oil and Gas, LP",
    decimal: "0.00538600",
    estimate: "$4,100",
    gas: "37,610",
    oil: "303",
  },
  {
    lease: "Cedar Bend (578204)",
    operator: "Trinity Fork USA, LLC",
    decimal: "0.00171900",
    estimate: "$3,000",
    gas: "3,990",
    oil: "0",
  },
  {
    lease: "Cedar Bend (619473)",
    operator: "Trinity Fork USA, LLC",
    decimal: "0.00171900",
    estimate: "$2,600",
    gas: "2,520",
    oil: "0",
  },
  {
    lease: "Cedar Bend (391756)",
    operator: "Trinity Fork USA, LLC",
    decimal: "0.00171900",
    estimate: "$2,100",
    gas: "2,030",
    oil: "0",
  },
  {
    lease: "Cedar Bend (480329)",
    operator: "Trinity Fork USA, LLC",
    decimal: "0.00171900",
    estimate: "$540",
    gas: "1,955",
    oil: "0",
  },
  {
    lease: "Averitt (65081)",
    operator: "Kestrel Exploration LLC",
    decimal: "0.00082906",
    estimate: "$0",
    gas: "31",
    oil: "2",
  },
  {
    lease: "Smith Gas Unit (267145)",
    operator: "Bluestem Oil and Gas, LP",
    decimal: "0.00538600",
    estimate: "$0",
    gas: "58,580",
    oil: "189",
  },
  {
    lease: "Smith Gas Unit (508936)",
    operator: "Bluestem Oil and Gas, LP",
    decimal: "0.00538600",
    estimate: "$0",
    gas: "26,220",
    oil: "49",
  },
];

export const page5Foot =
  "Owner-share figures are estimates using your decimal interests (e.g. 0.00538700 on Smith 305892, 0.00243700 on Ledbetter) and modeled prices. Not a payment ledger, not an appraisal, not tax advice. © 2026 Mineral View, LLC.";

/* ============================================================================
   THE THREE CLOSING CARDS — ONE PER DENSITY

   Same week, three lengths. Essentials gets a paragraph, Detailed gets the
   four things we would actually do, Professional gets the falsification list.

   THE PROFESSIONAL ONE IS THE UNUSUAL ONE and it is the point of the tier: a
   forecast that cannot be wrong in a stated way is not a forecast, so the
   issue publishes the observations that would force a revision. A report meant
   to be handed to an adviser has to name its own failure modes.
   ============================================================================ */

export const closingSimple = {
  heading: "That's your week",
  body:
    "Earning as expected, nothing on your land, one thing worth a few minutes when you have them. If you do only one thing after closing this: run the Lease Audit that comes with your plan on Ledbetter — it is the single question this week raised that only your own paperwork can answer. Otherwise, nothing needs you. We'll be back on Saturday, and if the week is quiet we'll say that too.",
} as const;

export const closingDetailed = {
  heading: "What we'd do with this week, if the record were ours",
  items: [
    {
      lead: "Settle Ledbetter.",
      body:
        "Three produced gas months are visible in the public record and we cannot see a single payment. That is not an accusation — it is the one open question on the whole record, and the audit included with your plan closes it either way. An answer of \"you were paid correctly\" is worth having.",
    },
    {
      lead: "Leave the two quiet Smith units alone, but keep watching them.",
      body:
        "267145 and 508936 post real volumes — 58,580 and 26,220 mcf — and project nothing to your decimal. Nothing to do about that this week. If a recompletion is ever filed on either, that is the largest upside on this record and it will arrive as an alert before it arrives as money.",
    },
    {
      lead: "Do nothing about the price.",
      body:
        "Gas firmed 1.53% and your estimate held. Weeks like this are the argument for not re-reading your minerals every time a headline moves — the six-year figure is built on the boring average, and it should not twitch.",
    },
    {
      lead: "If an offer letter arrives, read it against page 5 before you answer it.",
      body:
        "Eleven permits within a mile of Ledbetter is exactly the kind of activity that puts letters in mailboxes. An offer is only judgeable against a number you already had.",
    },
  ],
} as const;

export const closingPro = {
  heading: "What would change our mind",
  intro:
    "A forecast that cannot be wrong in a stated way is not a forecast. These are this issue's falsification conditions — the observations that would force a revision rather than a footnote.",
  items: [
    {
      lead: "A statement outside the band.",
      body:
        "August lands below $330 or above $540 and the model — not the operator — is the thing that failed. Two consecutive misses in the same direction is a bias, not noise, and re-fits the record.",
    },
    {
      lead: "A drift beyond ~2σ on any lease.",
      body:
        "This month's largest was +2.4% on Smith 267145, well inside the curve's own noise. A single lease past two standard deviations of its expected month raises the inflection alert and the decline parameters get re-estimated before the next issue.",
    },
    {
      lead: "A structural price break.",
      body:
        "Gas sustained above ~$4 or oil back over $100 re-rates the MVestimate portfolio-wide; a slide toward COVID-era prices does the reverse. Both lead the report when they happen — neither is treated as news at a single day's close.",
    },
    {
      lead: "Any paired statement month.",
      body:
        "The band on this record is a ±24% prior, not a measured error — it is what we use because we have measured nothing on this owner yet. The first five paired months replace it with a residual spread, and if that spread is wider than the prior, the range gets wider, published as such.",
    },
    {
      lead: "A deduct schedule we can see.",
      body:
        "Layer 4, above. The differential and the deducts are currently estimated from area norms; one real statement replaces an assumption on this record, and enough of them across an operator replaces it for everyone on that operator.",
    },
  ],
  foot:
    "None of the above is a prediction that it will happen. It is the list of things that would make this issue's numbers wrong, published in the issue itself, because a report you are meant to hand to an adviser has to name its own failure modes.",
} as const;

/* ============================================================================
   BACK MATTER — "ABOUT THIS REPORT"

   COLLAPSED BY DEFAULT AND LABELLED "nothing about this week is in here", so a
   reader can skip it with confidence rather than scanning it for news.
   ============================================================================ */

export const aboutIntro =
  "The print version is the full five-page report — cover, money, activity & map, prices, and what to watch — one section per page, nothing padded. In production every issue is a stored artifact with its source snapshot — the same report opens identically later, and each figure cites its source. The email is a short summary with a link back here, never the full report.";

/** The four written versions — one per VIEW, which is not a plan. */
export const reportVersions = [
  {
    tier: "ultra" as const,
    label: "Ultra · 2 minutes",
    name: "The doorstep read",
    body:
      "one verdict, next month's range, one action. No tables, no jargon, nothing to decode.",
  },
  {
    tier: "simple" as const,
    label: "Essentials · 9 minutes",
    name: "The coffee read",
    body:
      "the bottom line, next month’s range, your money chart, the one thing worth doing, and every page one click away. The only one written to fit a single cup.",
  },
  {
    tier: "detailed" as const,
    label: "Detailed · ~22 minutes",
    name: "The full five pages",
    body:
      "every lease, every map, the world-context bullets and the per-lease build-up of next month's range — read straight through.",
  },
  {
    tier: "pro" as const,
    label: "Professional · ~35 minutes",
    name: "The record of work",
    body:
      "everything above plus the signal table, the method behind each estimate, decimal interests and the data appendix — the version you'd hand an adviser.",
  },
];

export const reportVersionsFoot =
  "Same week, same facts, four different documents — nothing true in one is hidden from another. Switching views never changes your plan or your data.";

/** How much report your PLAN includes — the other axis entirely. */
export const planCoverage = [
  {
    plan: "Free",
    covers: "Pages 1–2 · the answers",
    body: "cover verdicts + am-I-making-money summary · enough to know you're OK",
  },
  {
    plan: "Essentials · $49.95",
    covers: "+ Pages 3–4 · the why",
    body:
      "activity around your leases with the map, and the price/world context moving your number",
  },
  {
    plan: "Premium · $99.95",
    covers: "All 5 + monthly + archive",
    body:
      "what-to-watch forward view, the keeper monthly report, the full archive — and the included Lease Audit",
  },
];

export const planCoverageFoot =
  "Two different things: the panel above picks how the report is written (your view); this one is how much of it your plan includes. Every plan sees its money honestly; higher plans add the why and the what's next, never hide the what.";

/**
 * The four layers — and the reason the report says out loud that it does not
 * have the fourth one.
 *
 * WHY ADMIT A GAP IN YOUR OWN PRODUCT PAGE. Because layer 4 is the honest
 * reason August is a range and not a number, and because it is the only layer
 * the owner can help build. Claiming it would be both false and
 * self-defeating: the upload ask only works if the owner believes the reason
 * for it.
 */
export const knowledgeLayers = [
  {
    label: "Layer 1 · The public record",
    name: "Public, but not accessible",
    body:
      "Texas publishes it all: 1,217,273 wells, 33,696 operators, 915,037 mineral-owner records across the 192 counties with owner data. Free to anyone — scattered across separate systems, keyed on numbers you don't have, and never joined to your name. The joining is the work.",
    accent: "grey" as const,
  },
  {
    label: "Layer 2 · Findable if you go looking",
    name: "Google has it. Nobody has the hour.",
    body:
      "Prices, world events, what's drilling in your county, how your operator behaves. All of it is out there every week. The value isn't in owning it — it's in someone reading it against your three counties every Saturday and saying, in one line, whether it touched your number.",
    accent: "grey" as const,
  },
  {
    label: "Layer 3 · What Mineral View builds",
    name: "Derived, not looked up",
    body:
      "Your decline curves and the six-year MVestimate, the produced-versus-paid signal on Ledbetter, the 1-mile radius lists (22 adjacent leases, 38 permits), the new-well probability band. None of this exists in a public database — it is computed, on your record, and it is most of what you're reading.",
    accent: "green" as const,
  },
  {
    label: "Layer 4 · The one nobody has",
    name: "Lease-to-lease economics",
    chip: "Not built yet",
    body:
      "What a barrel out of your area actually sells for after its differential; whether the gas on your unit is rich enough that the liquids pay well above the headline, or flared and paying nothing; what your operator genuinely deducts. It is owner-held knowledge and it does not exist in any record — it only comes into being when owners pool their own statements.",
    accent: "amber" as const,
  },
];

export const layersWhy = {
  lead: "Why we're telling you this.",
  before: "Layer 4 is the honest reason your August estimate is ",
  locked: "$330 – $540",
  /**
   * SPLIT AROUND ITS TWO POINTERS. The sentence names the upload panel and the
   * private lease group, and in the reference both are links —
   * `?jump=wrEstAcc` and `#/app/groups`. Kept as three fragments so the
   * component can put a real control where each one is named, rather than
   * telling the reader about a panel and leaving them to find it.
   */
  afterBeforeUpload: " and not a single figure — the widest part of that band is the part only paperwork can close. It is also the only layer you can help build: ",
  uploadLink: "your division orders and last five cheques",
  afterUpload: " narrow your own range first, and your ",
  groupsLink: "private lease group",
  afterGroups:
    " is where owners of the same unit compare the same month. We are not claiming to have layer 4 today. We're telling you what it would be worth and what it is going to take.",
  pro:
    "The layers are a build order as much as a value ladder. Layers 1 and 2 are ingest and editorial — commodity work with a real assembly cost and no defensibility. Layer 3 is the current product surface and is defensible only for as long as the modelling stays ahead. Layer 4 is the only layer with a compounding moat, because its input is owner-contributed and its accuracy improves per statement rather than per engineer: a per-operator, per-area regression of remitted owner-share against modeled owner-share needs paired months from many owners on many leases, and every owner who uploads makes the estimate better for every other owner on that operator. That is why the statement upload is framed as a benefit to the owner rather than a data request — it has to be true for the owner first, or it never gets the volume it needs.",
} as const;

export const coffeePromise =
  'The Saturday-with-coffee promise: four questions, answered honestly. On a quiet week we say "nothing new" — we never invent activity to look busy.';

/** The email preview — a summary and a link, never the report itself. */
export const emailPreview = {
  summary:
    "What the email version looks like — a short summary + a link, never the full report",
  subject: "Your weekly report is ready — Jul 04",
  greeting: "Morning, Suzie —",
  lead: "your week in three lines:",
  lines: [
    "You're earning as expected — fresh gas on all four Smith units.",
    "Worth a look: Ledbetter produced gas in months we can see — your included Lease Audit can check whether you were paid.",
    "11 permits within a mile of Ledbetter. None on your land.",
  ],
  cta: "Read the full report on Mineral View →",
  foot:
    "That's the whole email — the report itself, with your numbers, maps, and tables, lives behind your sign-in. We never put your full report in an inbox.",
} as const;

/* ============================================================================
   THE MONTHLY — "THE KEEPER"

   A different document from the weekly, and the copy says why: the weekly is a
   slice, the monthly is truth. This is the issue owners file and forward to
   family, which is why it is the one that gets printed and mailed.
   ============================================================================ */

export interface MonthlyKpi {
  label: string;
  value: string;
  sub: string;
  /** Amber top rule — the one card that asks something of the owner. */
  accent?: "amber";
  /** A money figure, so it carries the `cl-lock` blur. */
  locked?: boolean;
  chip?: string;
  link?: string;
  hint?: string;
}

export interface MonthlyRow {
  lease: string;
  actual: string;
  expected: string;
  drift: string;
  driftDirection: "up" | "down" | "none";
  read: string;
}

export interface MonthlyNotice {
  tone: "mint" | "gold" | "slate";
  glyph: string;
  lead: string;
  body: string;
}

export const monthly: {
  kicker: string;
  title: string;
  headline: string;
  provenance: string;
  provenanceStrong: string;
  provenanceTail: string;
  chip: string;
  kpis: MonthlyKpi[];
  tableHeading: string;
  rows: MonthlyRow[];
  tableFoot: string;
  tableFootChip: string;
  tableFootTail: string;
  notices: MonthlyNotice[];
  planNote: string;
  next: string;
} = {
  kicker: "The keeper — your monthly",
  title: "Monthly Owner Report — June 2026",
  headline:
    "June's find: Ledbetter produced gas in months we can see — only your statements show whether you were paid. Your Lease Audit is included with your 12-month Premium term · 228 postings watched · portfolio steady at $26,340",
  provenance:
    "Issue MOR-2026-06 · closed Jun 30, 2026 · generated Jul 01 (stored artifact + source snapshot) · email delivered Jul 03 · mailed paper copy:",
  provenanceStrong: "queued with the print vendor — status tracked here",
  provenanceTail: "· the report owners file and forward to family",
  chip: "Included with Premium",
  kpis: [
    {
      label: "Payment check to run",
      value: "Ledbetter",
      sub: "3 produced gas months in the public record — your statements hold the answer",
      link: "run your included Lease Audit →",
      accent: "amber",
    },
    {
      label: "Production postings watched",
      value: "228",
      sub: "your + adjacent leases · public record, watched daily",
    },
    {
      label: "Portfolio MVestimate · Jun 30",
      value: "$26,340",
      sub: "+$50 vs May 31 · covers your 10 visible leases (0 archived)",
      chip: "modeled estimate",
      locked: true,
    },
    {
      label: "Permits within 1 mi",
      value: "38",
      sub: "11 near Ledbetter · 25 near Cedar Bend · 0 on your land · deduped",
      hint: "where — by lease →",
    },
  ],
  tableHeading: "June production — our estimate vs actual, per lease",
  rows: [
    {
      lease: "Smith (423065)",
      actual: "37,610 mcf · 303 bbl",
      expected: "38,400 mcf",
      drift: "(−2.1%)",
      driftDirection: "down",
      read: "steady earner",
    },
    {
      lease: "Smith (305892)",
      actual: "27,120 mcf · 133 bbl",
      expected: "26,800 mcf",
      drift: "(+1.2%)",
      driftDirection: "up",
      read: "your strongest lease",
    },
    {
      lease: "Cedar Bend (×4)",
      actual: "10,495 mcf · 0 bbl",
      expected: "10,600 mcf",
      drift: "(−1.0%)",
      driftDirection: "down",
      read: "four Barnett wells, combined",
    },
    {
      lease: "Ledbetter (74318)",
      actual: "482 bbl · 399 mcf",
      expected: "490 bbl",
      drift: "(−1.6%)",
      driftDirection: "down",
      read: "easing on its curve — expected",
    },
    {
      lease: "Averitt (65081)",
      actual: "31 mcf · 2 bbl",
      expected: "~0",
      drift: "(trace)",
      driftDirection: "none",
      read: "the one to watch — not producing meaningfully",
    },
  ],
  tableFoot:
    'Actuals are real RRC-posted volumes on your record. The "we expected" column is each lease\'s decline-model month — every posting landed within ~2% of it (a good month for the model).',
  tableFootChip: "± values illustrative until the estimate feed wires",
  tableFootTail:
    "Owner-share dollars stay labeled modeled until statement wiring lands.",
  notices: [
    {
      tone: "mint",
      glyph: "▲",
      lead: "The market month, in one line.",
      body:
        "Gas firmed to $3.245 (+1.5% on the month) while WTI eased to $68.78 — a mix that favors your gas-weighted Bee units.",
    },
    {
      tone: "slate",
      glyph: "⚑",
      lead: "Nearby, honestly.",
      body:
        "No new permit touched your units in June. The 11 permits within a mile of Ledbetter are the neighborhood's standing interest — the most recent close-in filing remains older; we date every signal so you never mistake old news for new.",
    },
    {
      tone: "gold",
      glyph: "✓",
      lead: "Do these two things.",
      body:
        "1) Run your included Lease Audit on Ledbetter — upload your check stubs and division orders and we compare them to the produced months we can see. 2) Glance at Averitt — still inactive; if a neighbor completion lands, we'll tell you what it means. Everything else ran itself.",
    },
  ],
  planNote:
    "Free: the headline + your 1 visible lease. Essentials · $49.95: the full report on up to 10 leases. Premium · $99.95: everything here — 20-lease limit, mailed paper copy, audit credits.",
  next:
    "Next: your Q3 quarterly deep-dive (trend pages + year-over-year) lands Oct 03, 2026.",
};

export const archive = {
  heading: "Past briefings — your archive",
  chip: "Every issue kept",
  issues: [
    {
      week: "Week ending Jun 27, 2026",
      note: 'quiet week — "nothing new," monthly anchor unchanged',
    },
    {
      week: "Week ending Jun 20, 2026",
      note: "Smith postings landed · gas −0.8%",
    },
    {
      week: "Week ending Jun 13, 2026",
      note: "Ledbetter produced-months signal first raised — Lease Audit suggested",
    },
  ],
  foot:
    'Prototype list — the archive keeps every issue in production, searchable, so "what did it say in March?" always has an answer.',
} as const;

/* ============================================================================
   THE ULTRA REPORT — THE DOORSTEP READ

   One verdict, next month's range, one button. The estimate box is the ONE
   thing Ultra keeps beyond the verdict, because it is the number people open
   the report for at every density.
   ============================================================================ */

export const briefingUltra = {
  kicker: "This week · a 2-minute read",
  headline: "You're earning",
  headlineStrong: "as expected",
  status:
    "Fresh gas posted on your Bee wells, prices moved your way, and nothing needs action. One thing when you have a minute: the Lease Audit included with your plan can check the months Ledbetter produced against your statements.",
  boxLabel: "What we think August brings you",
  boxRange: "$330 – $540",
  boxBody: "Most likely near the middle, about",
  boxMid: "$435",
  boxTail:
    ". It's a range on purpose — we can't see what your operator takes out before the cheque, so we don't pretend to.",
  boxCta: "Show me how to make it sharper",
  cta: "Read the full report",
  note:
    "A report like this arrives every Saturday morning. On a quiet week, we say so.",
} as const;

/* ============================================================================
   THE UNCLAIMED SAMPLE ISSUE  (state 1 — the guest view)

   THE WHOLE REPORT, NOT A TEASER. That is the design's decision and the badge
   says it out loud: a visitor sees a complete issue about J. T. Callahan —
   cover verdicts, the money table, all five page summaries, and the number
   people open it for — rather than a blurred page with an upsell over it.

   A BLURRED SAMPLE WOULD BE THE WRONG GATE. There is nothing to protect here:
   the figures belong to a fictional owner. What the visitor is missing is not
   access, it is a record of their own, and the claim CTA is the only thing the
   sample withholds.
   ============================================================================ */

export interface SampleVerdict {
  lead: string;
  body: string;
  /** Green — the good-news verdict. */
  up?: boolean;
  /** Amber — the one worth a look. */
  amber?: boolean;
}

export interface SampleMoneyRow {
  lease: string;
  county?: string;
  posted: string;
  expected: string;
  drift: string;
  driftDirection: "up" | "down" | "none";
  means: string;
  total?: boolean;
}

export const sampleIssue: {
  heading: string;
  strapline: string;
  badgeLead: string;
  badgeOwner: string;
  badgeBody: string;
  masthead: string;
  greeting: string;
  meta: string;
  metaStrong: string;
  metaChip: string;
  page1Heading: string;
  page1: SampleVerdict[];
  page2Heading: string;
  page2Rows: SampleMoneyRow[];
  page2Foot: string;
  pageCards: { label: string; body: string }[];
  estimateHeading: string;
  estimateRange: string;
  estimateMid: string;
  estimateNote: string;
  foot: string;
} = {
  heading: "Weekly Report",
  strapline:
    "Every Saturday morning, in plain English. Below is a complete sample issue — the real thing, start to finish, about a made-up owner.",
  badgeLead: "This is the whole report, not a teaser.",
  badgeOwner: "J. T. Callahan, a fictional sample owner",
  badgeBody:
    "— nothing here is anyone's real record. Yours is written about your leases, from the public record on them.",
  masthead: "Weekly Mineral Owner Report · sample issue",
  greeting: "J. T., here's your week.",
  meta:
    "Week ending Jul 04, 2026 · sample record KRN-306471 · 6 leases · Karnes & DeWitt counties ·",
  metaStrong: "a 9-minute read",
  metaChip: "FICTIONAL OWNER — EXAMPLE FIGURES",
  page1Heading: "Page 1 · Bottom line — four questions, answered honestly",
  page1: [
    {
      lead: "✓ You're making money, on schedule.",
      up: true,
      body:
        "Fresh gas posted on Alameda Ranch and Bluestem 2H — both right on their decline curves.",
    },
    {
      lead: "⚑ Drilling nearby: alive, not on your land.",
      body:
        "1 new permit within a mile of Bluestem 2H; nothing filed on your own tracts.",
    },
    {
      lead: "▲ Prices favored you.",
      body: "Gas firmed +1.5% — good for a gas-weighted record; oil eased slightly.",
    },
    {
      lead: "✓ One thing worth a look.",
      amber: true,
      body:
        "Caddo Creek posted volumes but projects $0 forward — the report explains what that means and what to ask the operator.",
    },
  ],
  page2Heading:
    "Page 2 · Am I making money? — every lease, ranked by drift from expected",
  page2Rows: [
    {
      lease: "Alameda Ranch (118402)",
      county: "Karnes",
      posted: "21,440 mcf · 96 bbl",
      expected: "20,900 mcf",
      drift: "(+2.6%)",
      driftDirection: "up",
      means: "the strongest lease on this record",
    },
    {
      lease: "Bluestem 2H (204775)",
      county: "Karnes",
      posted: "14,880 mcf · 61 bbl",
      expected: "15,200 mcf",
      drift: "(−2.1%)",
      driftDirection: "down",
      means: "steady earner, on its curve",
    },
    {
      lease: "Wexler Unit (91633)",
      county: "DeWitt",
      posted: "312 bbl · 205 mcf",
      expected: "318 bbl",
      drift: "(−1.9%)",
      driftDirection: "down",
      means: "oil-weighted · easing on schedule",
    },
    {
      lease: "Caddo Creek (77120)",
      county: "DeWitt",
      posted: "9,610 mcf",
      expected: "9,500 mcf",
      drift: "(+1.2%)",
      driftDirection: "up",
      means: "posts volumes yet projects $0 forward — the watch item",
    },
    {
      lease: "Total — all 6 leases",
      posted: "47,270 mcf · 483 bbl",
      expected: "within ±3%",
      drift: "of the model",
      driftDirection: "none",
      means: "2 quiet leases posted nothing — listed in full in the issue",
      total: true,
    },
  ],
  page2Foot:
    "Illustrative figures for a fictional owner. Your issue shows your leases — all of them, never truncated.",
  pageCards: [
    {
      label: "Page 3 · Activity around you",
      body:
        "0 permits, 0 completions on your land. 1 new permit and 14 standing permits within a mile; 9 neighbor tracts at work. A labelled mini-map for every lease that changed.",
    },
    {
      label: "Page 4 · Prices & the world",
      body:
        "Gas $3.245 (+1.53%) · WTI $68.78 (−0.13%). Why each moved, in plain English, with the public source next to it — and what it means for a gas-weighted record like this one.",
    },
    {
      label: "Page 5 · What to watch",
      body:
        "Three dated things: the next posting window, the price levels that would re-rate the estimate, and the one lease worth a question to the operator.",
    },
  ],
  estimateHeading:
    "And the number people open it for — next month's cheque, as a range",
  estimateRange: "$690 – $1,140",
  estimateMid: "· midpoint about $915",
  estimateNote:
    "J. T.'s August estimate. A range, never a single number — we hold today's prices flat, we can't see this operator's deducts, and the differential on a barrel varies with oil quality and area. The report says all of that out loud, and shows how to narrow it.",
  foot:
    'On a quiet week we say "nothing new" — no filler, ever. Every issue is written to be finished over one cup of coffee.',
};
