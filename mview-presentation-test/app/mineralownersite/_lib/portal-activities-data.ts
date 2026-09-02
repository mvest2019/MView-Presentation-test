/**
 * THE ACTIVITIES RECORD — every figure the Activities module prints.
 *
 * EXTRACTED, NOT AUTHORED, on the same terms as `portal-demo-data.ts`: every
 * count, lease number, operator, county and sentence below is the reference
 * build's own, from `owner/src/routes/app-activities.html`. Nothing is
 * computed, rounded or adjusted here.
 *
 * THE TWO OWNERS, and why both are in one file. The claimed record is Suzie
 * Smith's ten leases; the unclaimed one is the J. T. Callahan SAMPLE. They sit
 * together because the page renders both — CSS picks — and separating them
 * would make it possible to change one without noticing the other went stale.
 *
 * WHAT "ILLUSTRATIVE" MEANS ON A FIELD HERE. Several counts on this page are
 * windowed (last 30/60/90 days, within 1/3/5 miles) and the dated permit feed
 * is not wired, so the reference labels those values `illustrative` in the UI
 * and so do we. The STANDING counts — 228 production records, 22 adjacent
 * leases, 38 permits — are real scan results and carry no such label. Keeping
 * the two apart is the point of the `illustrative` flag on each row.
 *
 * REPLACING THIS FILE IS THE WHOLE JOB when Activities is wired: no component
 * under `_components/activities/` reads a figure from anywhere else.
 */

/* ============================================================================
   THE PAGE'S HEADER FACTS

   SOURCE · PG.claimed_owners (the record) + the activity feed's own coverage
   window.
   ============================================================================ */

export const activitiesMeta = {
  title: "Activities",
  strapline:
    "Everything filed or posted on and around your 10 claimed leases",
  /** The chip on the right of the page head — the feed's coverage. */
  coverage: "Jul 2025 – Jul 2026",
  /** The "as of" date the window note is measured back from. */
  windowEnd: "Jul 04, 2026",
} as const;

/* ============================================================================
   THE TWO SCOPING CONTROLS

   "New" means — last N days. "Nearby" means — within N miles. Both are the
   reference's own three options, and both are Detailed-and-above (`.hide-s`):
   an Essentials reader gets the year in one paragraph instead.
   ============================================================================ */

export const activityWindows = [30, 60, 90] as const;
export const activityRadii = [1, 3, 5] as const;

export type ActivityWindow = (typeof activityWindows)[number];
export type ActivityRadius = (typeof activityRadii)[number];

export const DEFAULT_WINDOW: ActivityWindow = 30;
export const DEFAULT_RADIUS: ActivityRadius = 1;

/* ----------------------------------------------------------------------------
   THE WINDOW × RADIUS COUNT MATRIX  (v41 · AUDIT #26/#29/#30)

   THE NEARBY COUNTS GENUINELY CHANGE with both controls — a selector that
   moved a highlight but not a number would be worse than no selector, because
   it teaches the reader the counts are decorative.

   THE MATRIX IS ILLUSTRATIVE and every card that reads from it says so. What
   is honest about it is its SHAPE: a bigger window and a bigger radius return
   more events, and your-land stays at zero in every cell — widening the search
   never invents a filing on the owner's own units. The real dated radius feed
   is build #7.

   `adjNear` deliberately does not vary with the window: an adjacent lease is a
   fact of geography, not an event, so only the radius moves it.
   ---------------------------------------------------------------------------- */

type CountMatrix = Record<ActivityWindow, Record<ActivityRadius, number>>;

const NEARBY_COUNTS: Record<string, CountMatrix> = {
  permitsNear: {
    30: { 1: 7, 3: 12, 5: 19 },
    60: { 1: 11, 3: 19, 5: 31 },
    90: { 1: 16, 3: 27, 5: 43 },
  },
  complNear: {
    30: { 1: 1, 3: 2, 5: 4 },
    60: { 1: 2, 3: 3, 5: 6 },
    90: { 1: 3, 3: 5, 5: 9 },
  },
  prodNear: {
    30: { 1: 19, 3: 33, 5: 52 },
    60: { 1: 41, 3: 70, 5: 104 },
    90: { 1: 58, 3: 97, 5: 151 },
  },
  adjNear: {
    30: { 1: 22, 3: 41, 5: 63 },
    60: { 1: 22, 3: 41, 5: 63 },
    90: { 1: 22, 3: 41, 5: 63 },
  },
  statusNear: {
    30: { 1: 1, 3: 2, 5: 3 },
    60: { 1: 1, 3: 3, 5: 5 },
    90: { 1: 2, 3: 4, 5: 7 },
  },
};

export interface NearbyCounts {
  permitsNear: number;
  complNear: number;
  prodNear: number;
  adjNear: number;
  statusNear: number;
  /** The production-vs-estimate read, derived from `prodNear`. */
  prodOver: number;
  prodMet: number;
  prodUnder: number;
}

/**
 * The counts for one window/radius pair.
 *
 * The exceeded/met/missed split is DERIVED rather than tabulated — ~21%
 * exceeded, ~62% met, the remainder missed — so the three always add back to
 * the production count they came from. A hand-written triple would eventually
 * stop summing, and a reader who adds them is exactly the reader this page is
 * for.
 */
export function nearbyCountsFor(
  window: ActivityWindow,
  radius: ActivityRadius,
): NearbyCounts {
  const prodNear = NEARBY_COUNTS.prodNear[window][radius];
  const prodOver = Math.round(prodNear * 0.21);
  const prodMet = Math.round(prodNear * 0.62);

  return {
    permitsNear: NEARBY_COUNTS.permitsNear[window][radius],
    complNear: NEARBY_COUNTS.complNear[window][radius],
    prodNear,
    adjNear: NEARBY_COUNTS.adjNear[window][radius],
    statusNear: NEARBY_COUNTS.statusNear[window][radius],
    prodOver,
    prodMet,
    prodUnder: Math.max(prodNear - prodOver - prodMet, 0),
  };
}

/** Narrow an untrusted `?win=` / `?mi=` value. Anything unknown falls back. */
export function toActivityWindow(
  value: string | null | undefined,
): ActivityWindow {
  const n = Number(value);
  return (activityWindows as readonly number[]).includes(n)
    ? (n as ActivityWindow)
    : DEFAULT_WINDOW;
}

export function toActivityRadius(
  value: string | null | undefined,
): ActivityRadius {
  const n = Number(value);
  return (activityRadii as readonly number[]).includes(n)
    ? (n as ActivityRadius)
    : DEFAULT_RADIUS;
}

/* ============================================================================
   ESSENTIALS · THE YEAR IN ONE PARAGRAPH

   The whole page, said once, for the reader who will not touch a filter. The
   sentence that matters most is the second one: posting production is not the
   same event as being paid, and the page says so before it shows a count.
   ============================================================================ */

export const activitiesSummary = {
  heading: "This year around your leases, in plain English",
  productionRecords: "228",
  body:
    "were logged on and around your leases — posting production means the lease reported production; payment still shows only on your statements. Nothing worrying happened: no shut-downs, no status changes on your producing leases, and zero new drilling permits on your land.",
  neighbourhood:
    "22 leases sit within a mile of yours and 38 drilling permits are on the nearby-permit lists — neighbors' wells and filings. Worth a glance on the map, not a worry.",
} as const;

/** The Ultra page — one verdict, one status, one button. */
export const activitiesUltra = {
  kicker: "Activity",
  headline: "Nothing needs",
  headlineStrong: "your attention",
  status:
    "All year, your wells kept producing on schedule. No drilling permits touched your land, and nothing was shut down.",
  cta: "See what happened",
  note:
    "We watch every filing on and around your leases and will tell you the moment one matters.",
} as const;

/* ============================================================================
   THE THREE TABS

   My-lease events · Nearby development trend · Operator & county trend. The
   tab is a query parameter so a tab is deep-linkable and survives a reload —
   the reference's `?tab=trend` links from the KPI cards depend on it.
   ============================================================================ */

export const activityTabs = [
  { key: "lease", label: "My-lease events" },
  { key: "trend", label: "Nearby development trend" },
  { key: "county", label: "Operator & county trend" },
] as const;

export type ActivityTab = (typeof activityTabs)[number]["key"];

export function toActivityTab(value: string | null | undefined): ActivityTab {
  return activityTabs.some((tab) => tab.key === value)
    ? (value as ActivityTab)
    : "lease";
}

/* ============================================================================
   THE TYPE FILTER

   Six chips. `all` is the default and the only one that is not a filter.
   ============================================================================ */

export const activityTypes = [
  { key: "all", label: "All types" },
  { key: "production", label: "▤ Production" },
  { key: "permits", label: "⚑ Permits" },
  { key: "completions", label: "◈ Completions" },
  { key: "payments", label: "$ Payments" },
  { key: "audit", label: "✓ Lease Audit" },
] as const;

export type ActivityType = (typeof activityTypes)[number]["key"];

/**
 * What each type chip reveals.
 *
 * `all` and `production` show NOTHING EXTRA and that is correct, not a gap:
 * the by-lease production table below is already the production view, so a
 * note repeating it would be filler. The other four each open a panel the
 * table cannot express.
 *
 * THE PAYMENTS PANEL IS THE ONE TO READ CAREFULLY. It is the only place in the
 * portal that shows a payment event, and every line in it is sourced from
 * something the OWNER supplied — a stub they uploaded, an audit finding. The
 * closing line says so: the public record shows production, never pay. Adding
 * a payment row here from any other source would break the promise the whole
 * product rests on.
 */
export interface TypePanelEvent {
  headline: string;
  detail: string;
  link?: { text: string; href: string };
}

export interface TypePanel {
  heading: string;
  note: string;
  /** Amber rule for permits — a neighbour signal, not your money. */
  accent: "green" | "amber";
  events?: TypePanelEvent[];
  body?: string;
  bodyLink?: { text: string; href: string };
  foot?: string;
}

export const typePanels: Partial<Record<ActivityType, TypePanel>> = {
  permits: {
    heading: "⚑ Permits near your leases — 38 tracked",
    note: "radius ~1 mi · real permit list",
    accent: "amber",
    events: [
      {
        headline: "11 permits within 1 mi of Ledbetter (74318)",
        detail: "neighbor tracts · Cass Co. — the densest cluster on your record",
        link: { text: "see them on the map →", href: "/mineralownersite/map" },
      },
      {
        headline: "27 more across your Bee & Hood areas",
        detail: "none filed on your own tracts",
        link: { text: "my operators' activity →", href: "/mineralownersite/map" },
      },
    ],
  },
  completions: {
    heading: "◈ Completions near your leases — 2 this period",
    note: "sample completions layer",
    accent: "green",
    body:
      "A completion is the strongest “your area is heating up” signal — a finished well, not just a permit. Both completions sit on neighbor tracts; neither touches your land.",
    bodyLink: {
      text: "View the completions layer on the map →",
      href: "/mineralownersite/map",
    },
  },
  payments: {
    heading: "$ Payment-related events",
    note: "from your uploaded statements + audit findings",
    accent: "green",
    events: [
      {
        headline: "Check stub matched — Ledbetter, Mar 2026",
        detail:
          "your uploaded stub matched the posted production month — decimal checks out (0.00243700)",
      },
      {
        headline: "Produced months without a matching stub — Ledbetter",
        detail:
          "Aug 2025, Nov 2025, Feb 2026 — payment unknown until statements are compared",
        link: {
          text: "run the included Lease Audit →",
          href: "/mineralownersite/audit",
        },
      },
    ],
    foot:
      "We only ever see payments you share (stubs, statements) — the public record shows production, never pay.",
  },
  audit: {
    heading: "✓ Lease Audit events",
    note: "findings & status from your audits",
    accent: "green",
    events: [
      {
        headline: "Audit available — included with Premium",
        detail:
          "Ledbetter has produced-months worth checking against your statements",
        link: { text: "start it →", href: "/mineralownersite/audit" },
      },
      {
        headline: "Sample finding — division-order decimal verified",
        detail: "the DI on your uploaded paper matches the public record",
        link: {
          text: "see the worked sample report →",
          href: "/mineralownersite/audit",
        },
      },
    ],
  },
};

export const activityDateRanges = [
  "Last 12 months",
  "Last 6 months",
  "Last 3 months",
  "This month",
  "All time",
] as const;

/* ============================================================================
   THE KPI CARDS — TWO SECTIONS, AND THEY MUST NOT BE MERGED

   ON YOUR LAND    events that touch your checks. All three are zero, and zero
                   is printed as "No new activity", never as a blank: quiet is
                   a result, and the page says so out loud.

   NEARBY          neighbours at work. Signals about the area, never income.

   The design's most repeated warning on this page is that a reader who reads a
   nearby permit as "someone is drilling on my land" has been actively
   misinformed, which is why the two groups carry different headings, different
   accent rules and a legend between them.
   ============================================================================ */

export interface ActivityKpi {
  /** The `k-label` line. */
  label: string;
  /**
   * The figure. A string, because half of these are the words "No new
   * activity" — a zero rendered as `0` reads as a data gap on a page whose
   * whole argument is that quiet is a finding.
   */
  value: string;
  /** True when the value is a count and should carry `.num`. */
  numeric: boolean;
  /** The `k-sub` explanation, as nodes the component assembles. */
  sub: string;
  /** A second `k-sub` line, where the reference carries one. */
  subExtra?: string;
  /** Green top border — this card has new activity this period. */
  hot?: boolean;
  /** Adds the `illustrative` chip: the count moves with the window/radius. */
  illustrative?: boolean;
  /** The `?tab=` deep link the reference puts on the card, when it has one. */
  trendTab?: ActivityTab;
  /** The expand affordance's wording. */
  expand?: string;
}

export const onYourLandKpis: ActivityKpi[] = [
  {
    label: "New permits · your land",
    value: "No new activity",
    numeric: false,
    sub: "quiet said honestly — zero filings touched your units",
    trendTab: "trend",
  },
  {
    label: "Completions · your land",
    value: "No new activity",
    numeric: false,
    sub: "a recompletion is the upside to watch",
    trendTab: "trend",
  },
  {
    label: "Well status changes · your leases",
    value: "No new activity",
    numeric: false,
    sub: "all 7 producing leases posted on schedule",
    subExtra: "nearby changes: 1",
    illustrative: true,
  },
];

export const nearbyKpis: ActivityKpi[] = [
  {
    label: "New permits · nearby",
    value: "7",
    numeric: true,
    sub: "filed in the last {window} days within {radius} mi · 38 standing within 1 mi all-time",
    hot: true,
    illustrative: true,
  },
  {
    label: "Completions · nearby",
    value: "1",
    numeric: true,
    sub: 'in {window} d / {radius} mi — a finished neighbor well is the strongest "heating up" signal',
    illustrative: true,
  },
  {
    label: "New-production records",
    value: "19",
    numeric: true,
    sub: "in {window} d / {radius} mi (all-time on your 10 + adjacent: 228) · vs our estimate: 4 exceeded · 12 met · 3 missed",
    subExtra:
      '7 are "this is me" (your leases) · 5 same-reservoir neighbors (meaningful) · the rest other rock nearby',
    hot: true,
    illustrative: true,
    expand: "expand · filter by reservoir →",
  },
  {
    label: "Adjacent leases · ~{radius} mi",
    value: "22",
    numeric: true,
    sub: "named tracts next door — leases you own that adjoin each other are counted once, never double",
    hot: true,
  },
  {
    label: "Well status changes · nearby",
    value: "1",
    numeric: true,
    sub: "in {window} d / {radius} mi — shut-ins and reactivations on neighbor tracts",
    illustrative: true,
  },
];

/**
 * The seventh card, which is not a count at all.
 *
 * IT SHIPS AS "COMING SOON" ON PURPOSE. The unexpected-production-change flag
 * is the most valuable card on this page and it is not built; the reference
 * names it and links a worked example rather than leaving a gap the reader
 * would fill with an assumption.
 */
export const comingSoonKpi = {
  label: "Unexpected production change",
  chip: "Coming soon",
  sub: "flags months that break the decline trend — see",
  linkText: "a worked example →",
} as const;

/** The line between the two KPI groups. */
export const activityLegend =
  "Green-topped cards have new activity this period; the rest are quiet — quiet is a result, not a failure.";

export const activitySectionLabels = {
  land: "■ ON YOUR LAND",
  landNote: "your 10 claimed leases — the events that touch your checks",
  near: "◈ NEARBY · within",
  nearNote:
    "neighbors at work — signals, not your income · counts follow the window + radius above",
} as const;

/* ============================================================================
   PROFESSIONAL · THE ADJACENCY LEDGER

   SOURCE · the nearby-lease activity + nearby-permit scans, deduped.

   THE DEDUPLICATION NOTE IS PART OF THE DATA, not a footnote to it: Averitt
   shares four of its six permits with Ledbetter, and Suzie's own Ledbetter and
   Averitt flank each other. A reader adding the column would get 32 and 66;
   the true distinct counts are 22 and 38.
   ============================================================================ */

export interface AdjacencyRow {
  lease: string;
  adjacent: string;
  permits: string;
  permitsNote?: string;
  reservoir: string;
}

export const adjacencyLedger: AdjacencyRow[] = [
  {
    lease: "Ledbetter (74318)",
    adjacent: "7",
    permits: "11",
    reservoir: "Haynesville corridor — same-play neighbors",
  },
  {
    lease: "Averitt (65081)",
    adjacent: "11",
    permits: "6",
    permitsNote: "(4 shared w/ Ledbetter)",
    reservoir: "same corridor · idle unit beside live permits",
  },
  {
    lease: "Cedar Bend (578204)",
    adjacent: "7",
    permits: "24",
    reservoir: "Barnett — near-identical pad lists",
  },
  {
    lease: "Cedar Bend (619473)",
    adjacent: "7",
    permits: "25",
    reservoir: "Barnett — near-identical pad lists",
  },
  {
    lease: "Smith units ×4 (Bee)",
    adjacent: "0",
    permits: "0",
    reservoir: "genuinely quiet — sparse Wilcox country",
  },
];

export const adjacencyLedgerFoot =
  "Distinct counts de-duplicate shared neighbors (and leases you own next to each other are never double-counted): 22 adjacent leases · 38 distinct permits across the record.";

/* ============================================================================
   THE TWO "WHAT ARE THESE NUMBERS" DISCLOSURES

   Both are `<details>` in Detailed and above. They exist because 228 and 22
   are meaningless counts until someone says what one record and one adjacent
   lease actually are — and the second one NAMES the neighbours, which is what
   turns a number into a checkable claim.
   ============================================================================ */

export const explainProduction = {
  summary:
    "What the 228 new-production activity records are — and what they mean for you",
  what:
    'each record is one "New Production" activity row in the state\'s feed — one month\'s production filed on one of your leases or a lease adjacent to them: "we produced this much oil and gas here this month." Your 10 leases plus the 22 adjacent ones is how the neighborhood adds up to 228.',
  means:
    "posting production means the lease reported production — your payment still depends on your decimal, statement timing, deductions, and operator remittance. Records on your leases feed the estimate model and the decline curve behind your MVestimate; records on the adjacent leases tell you the neighborhood is still working. The table below is the per-lease rollup for your own leases.",
  provenance:
    "Definition wired: New-Production rows on your + adjacent leases, current through cycle 07/2026.",
  chip: "Wired — production activity",
} as const;

export const explainAdjacency = {
  summary: "Who the 22 adjacent leases (and 38 nearby permits) are — the real list",
  what:
    "the distinct leases within about 1 mile of yours on the adjacency scan — neighboring tracts with their operators, plus the drilling-permit lists for the same radius. None of them touch your land or your checks directly; they're the earliest signal of operator interest in your area.",
  cass:
    "Nora Fay (24106, Caddo Pine) · Walter Bramwell (24107, EnerVista) · Westlake (24289, EnerVista — shut-in) · Weldon Heirs (301454, Caddo Pine) · Beckett (23901) · Trescott (24030) · Ashworth (23415 · 274813 · 278529, Pine Belt) · Chadbourne (23577) · Fenwick, Etal (23744 · 24034, Cedarleaf — Rusk Co.) — and your own Ledbetter & Averitt flank each other.",
  hood:
    "Winfield (251317 · 262740 · 267043 · 267044 · 267045, Trinity Fork) · Patsy Unit (257466) — and your own 578204/619473 are each other's neighbors.",
  bee: "the scan returns no adjacency rows — a sparse rural corner of Bee County, said honestly.",
  permits:
    "11 within a mile of Ledbetter · 6 near Averitt (4 shared with Ledbetter) · 24–25 near each Cedar Bend lease (near-identical lists, 25 distinct) — 38 distinct permit filings in total.",
  provenance:
    "Per-lease adjacency: Ledbetter 7 leases / 11 permits · Cedar Bend 578204 7/24 · 619473 7/25 · Averitt 11/6 · Smith 0/0.",
  chip: "Wired — nearby-lease activity + nearby permits",
} as const;

/* ============================================================================
   TAB 2 · THE NEARBY DEVELOPMENT TREND

   One question: is drilling moving TOWARD your leases or away? Two panels,
   each comparing a period to the one before it.

   EVERY VALUE HERE IS LABELLED ILLUSTRATIVE, and that label is not decoration:
   the standing counts are real, but the dated permit/completion feed that
   would let us say "7 this month vs 4 last month" is build #7 and is not
   connected. Printing the comparison unlabelled would be inventing a trend.
   ============================================================================ */

export interface TrendRow {
  label: string;
  value: string;
  /** "up" draws the green delta, "flat" the muted ≈. */
  direction: "up" | "flat" | "none";
  compare?: string;
}

export interface TrendPanel {
  heading: string;
  rows: TrendRow[];
  reading: string;
}

export const trendPanels: TrendPanel[] = [
  {
    heading: "Last 30 days vs prior 30 days",
    rows: [
      {
        label: "Permits within 1 mi of your leases",
        value: "7",
        direction: "up",
        compare: "▲ vs 4",
      },
      {
        label: "Completions within 1 mi",
        value: "1",
        direction: "up",
        compare: "▲ vs 0",
      },
      {
        label: "New-production postings (your + adjacent)",
        value: "19",
        direction: "flat",
        compare: "≈ vs 20",
      },
    ],
    reading:
      "nearby permitting ticked up around Ledbetter (Cass Co.) — neighbors moving toward your acreage, not away. None on your land yet.",
  },
  {
    heading: "Last 6 months vs prior 6 months",
    rows: [
      {
        label: "Permits within 1 mi",
        value: "21",
        direction: "up",
        compare: "▲ vs 16",
      },
      {
        label: "Completions within 1 mi",
        value: "3",
        direction: "flat",
        compare: "≈ vs 3",
      },
      {
        label: "Direction of activity",
        value: "clustering near Ledbetter & Cedar Bend",
        direction: "none",
      },
    ],
    reading:
      "a slow, steady rise in neighbor drilling over the half-year — your area stays of interest to operators. Your Smith corner in Bee remains genuinely quiet.",
  },
];

export const trendNotice = {
  heading: "Is drilling moving toward your leases, or away?",
  body:
    "This tab compares recent activity to the period before it, near your leases.",
  chip:
    "Trend values illustrative until the dated permit/completion feed wires (build #7)",
} as const;

export const trendFoot =
  "Toward/away is measured from the distance of each new filing to your nearest lease.";

/* ============================================================================
   TAB 1 · LATEST POSTED PRODUCTION, BY LEASE

   SOURCE · RRC production postings. GROSS LEASE VOLUMES, not the owner's
   share — the column headers say so and the foot repeats it, because a reader
   who takes 58,580 mcf as "mine" has misread the single most important number
   on the page.

   Ordered by gas volume descending, which is the reference's order and puts
   the two inactive-but-still-posting Smith units at the top: that juxtaposition
   IS the page's argument, so it must not be re-sorted.
   ============================================================================ */

export interface PostedProductionRow {
  lease: string;
  operator: string;
  county: string;
  gas: string;
  oil: string;
  boe3mo: string;
}

export const latestPostedByLease: PostedProductionRow[] = [
  {
    lease: "Smith Gas Unit (267145)",
    operator: "Bluestem Oil and Gas, LP",
    county: "Bee",
    gas: "58,580",
    oil: "189",
    boe3mo: "0",
  },
  {
    lease: "Smith Gas Unit (423065)",
    operator: "Bluestem Oil and Gas, LP",
    county: "Bee",
    gas: "37,610",
    oil: "303",
    boe3mo: "1",
  },
  {
    lease: "Smith Gas Unit (305892)",
    operator: "Bluestem Oil and Gas, LP",
    county: "Bee",
    gas: "27,120",
    oil: "133",
    boe3mo: "2",
  },
  {
    lease: "Smith Gas Unit (508936)",
    operator: "Bluestem Oil and Gas, LP",
    county: "Bee",
    gas: "26,220",
    oil: "49",
    boe3mo: "0",
  },
  {
    lease: "Cedar Bend (578204)",
    operator: "Trinity Fork USA, LLC",
    county: "Hood",
    gas: "3,990",
    oil: "0",
    boe3mo: "0",
  },
  {
    lease: "Cedar Bend (619473)",
    operator: "Trinity Fork USA, LLC",
    county: "Hood",
    gas: "2,520",
    oil: "0",
    boe3mo: "0",
  },
  {
    lease: "Cedar Bend (391756)",
    operator: "Trinity Fork USA, LLC",
    county: "Hood",
    gas: "2,030",
    oil: "0",
    boe3mo: "0",
  },
  {
    lease: "Cedar Bend (480329)",
    operator: "Trinity Fork USA, LLC",
    county: "Hood",
    gas: "1,955",
    oil: "0",
    boe3mo: "0",
  },
  {
    lease: "Ledbetter (74318)",
    operator: "Caddo Pine Resources, LLC",
    county: "Cass",
    gas: "399",
    oil: "482",
    boe3mo: "2",
  },
  {
    lease: "Averitt (65081)",
    operator: "Kestrel Exploration LLC",
    county: "Cass",
    gas: "31",
    oil: "2",
    boe3mo: "0",
  },
];

export const postedProductionFoot =
  "Volumes as posted to RRC — gross lease, not your share. The 228 new-production activity records (yours + adjacent) are the individual monthly rows behind these totals and the neighborhood's.";

/* ============================================================================
   TAB 3 · BY COUNTY & OPERATOR

   Three cards, one per county. Each one says what KIND of record it is —
   gas-heavy, oil-weighted, dry-gas — because that is what decides whether this
   week's price move reached the owner at all.
   ============================================================================ */

export interface CountyActivityCard {
  county: string;
  slug: string;
  leases: string;
  operators: string;
  body: string;
}

export const countyActivity: CountyActivityCard[] = [
  {
    county: "Bee Co.",
    slug: "bee",
    leases: "4 leases",
    operators: "Bluestem Oil and Gas, LP · Smith Gas Units",
    body:
      "Gas-heavy: 162,501 mcf posted across the four units — the biggest volumes on your own leases (no adjacent leases here: the scan returns none in this sparse corner).",
  },
  {
    county: "Cass Co.",
    slug: "cass",
    leases: "2 leases",
    operators: "Caddo Pine Resources, LLC · Kestrel Exploration LLC",
    body:
      "Oil-weighted: Ledbetter posted 482 bbl / 399 mcf. Dense neighbor activity — 12 of your 22 adjacent leases sit here (plus Ledbetter & Averitt flanking each other), with 13 of the 38 nearby permits.",
  },
  {
    county: "Hood Co.",
    slug: "hood",
    leases: "4 leases",
    operators: "Trinity Fork USA, LLC · Cedar Bend (Barnett Shale)",
    body:
      "Dry-gas: 11,401 mcf posted, zero oil — steady Barnett decline, no status changes.",
  },
];

/* ============================================================================
   THE UNCLAIMED SAMPLE  (state 1 — the guest view)

   J. T. Callahan again, the same fictional owner the claim flow and the
   Dashboard's sample use, so the three tell one story rather than three.

   A MONTH, NOT A YEAR, and five events rather than a page of KPIs: the point
   of this block is to show what KIND of thing lands in the feed and that each
   one arrives with a plain-English note. A visitor with nothing claimed does
   not need a filter bar.
   ============================================================================ */

export const sampleActivities = {
  heading: "Activities",
  strapline:
    "Once you claim, this page becomes your event log — here's what a month of it looks like.",
  badge:
    "This is what your activity feed looks like once you claim your record.",
  badgeOwner: "J. T. Callahan, a fictional sample owner",
  badgeTail: "— not to you or any real lease.",
  panelHeading: "June around J. T.'s 4 leases",
  panelNote: "every event, with a plain-English note on what it means",
  events: [
    {
      headline: "New production posted — Alameda Ranch",
      detail:
        "4,120 mcf gas + 61 bbl oil filed for June. Posting production means earning — this is the filing a royalty check is computed from.",
    },
    {
      headline: "New production posted — Bluestem 2H",
      detail:
        "2,840 mcf gas. On its expected decline curve — smaller months are the plan, not a problem.",
    },
    {
      headline: "Permit filed 0.8 mi from Bluestem 2H",
      detail:
        "a neighbor tract — the earliest public signal operators like the area. Pays nothing directly; keeps acreage interesting.",
    },
    {
      headline: "Completion reported 1.2 mi from Red Oak Unit",
      detail:
        'a finished well nearby is the strongest "your area is heating up" signal there is.',
    },
    {
      headline: "No status changes",
      detail:
        "no shut-ins or reactivations on any producing lease this period — quiet said honestly.",
    },
  ],
  ctaLead: "That month belongs to a made-up owner.",
  ctaBody:
    "Claim your record and this feed becomes every filing on and around your own leases — with a plain-English note on what each one means.",
} as const;
