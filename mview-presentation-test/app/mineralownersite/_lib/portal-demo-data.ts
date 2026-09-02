/**
 * THE DEMO RECORD — every figure the portal shell and Dashboard print.
 *
 * EXTRACTED, NOT AUTHORED. Every number, name, county, operator and date below
 * is the reference build's own, from `owner/src/routes/app.html` and
 * `owner/src/shell/chunk-004.html`. Not one of them is computed, rounded or
 * adjusted here.
 *
 * WHY THESE FIGURES ARE SAFE TO SHIP, when the design's standing rule is
 * "never invent data" and "placeholder numbers on a site that sells data
 * accuracy are the worst possible bug":
 *
 *   BOTH RECORDS ARE WHOLLY FICTIONAL, and the portal says so on every screen —
 *   the fixed ribbon, the "Fictional demo" chip in the top bar, the sidebar
 *   foot, and the drawer's footnote. Suzie Smith / SMITH, RAYMOND E is the
 *   design's claimed persona; J. T. Callahan is its unclaimed SAMPLE owner, and
 *   the sample is additionally wrapped in amber dashed chrome so it can never
 *   be mistaken for a real holding.
 *
 *   NOTHING HERE IS A PUBLISHED SITE FIGURE. No owner count, acreage total or
 *   appraised-value roll-up — the numbers that have to come from the data
 *   charter — appears in this file. These are one imaginary account's own
 *   readings.
 *
 * REPLACING THIS FILE IS THE WHOLE JOB when the portal is wired: every
 * component below reads from here and nowhere else, so a real record arrives by
 * swapping this module for a server read, with no component touched. The source
 * table each group came from is named on it, so the wiring has a target.
 */

import {
  actionRecommended,
  alertCounts,
} from "../alerts/_lib/alert-counts";
import { alertFilters } from "../alerts/_lib/alert-filters";
import { alertRecords } from "../alerts/_lib/alert-records";

/* ============================================================================
   THE SIGNED-IN OWNER  (the claimed / trial / lapsed / paid states)

   SOURCE · PG.members_entity (the account) + PG.claimed_owners (the record).
   ============================================================================ */

export const demoOwner = {
  /** The member's own name — what the greeting and the account menu use. */
  name: "Suzie Smith",
  /**
   * The avatar's initials.
   *
   * "SS", not the "SD" the reference's static markup carries: that markup is
   * overwritten by `mvSetFunnelState` on the first paint, which sets "SS". The
   * live value is the correct one.
   */
  initials: "SS",
  /** The owner RECORD, which is not the same thing as the member's name. */
  record: "SMITH, RAYMOND E",
  /**
   * The same record as the owner chip prints it (app.html:226). The chip is
   * read as a sentence, so the reference title-cases it there while leaving the
   * as-filed form for everywhere the record is quoted verbatim.
   */
  recordDisplay: "Smith Raymond E",
  /** What the greeting line says under the name. */
  asOf: "Jul 04, 2026",
  counties: "Bee, Cass & Hood counties",
  /**
   * The dark strip's own form — middots, no "counties" (app.html:246). The
   * prose form above reads as a sentence; this one sits in a dense cell beside
   * the operator list, which is middot-separated too.
   */
  countiesTight: "Bee · Cass · Hood",
  /** Drives "What's changed since your last visit". */
  lastVisit: "Jul 01",
} as const;

/** What the sidebar foot and the drawer print, so every screen signs the demo. */
export const demoDisclosure = {
  ribbon: "Illustrative — fictional data, not a real account",
  chip: "Fictional demo",
  sidebarFoot: "Prototype demo account — design review",
  drawer:
    "Illustrative — fictional data, not a real account. Pricing shown anywhere in this prototype is illustrative, not an offer.",
} as const;

/* ============================================================================
   THE PINNED VALUE

   SOURCE · Mongo.ProdMvestPortal.MVestimateCalculations (total_cashflow_mean).
   A six-year owner-share cash-flow projection across all ten leases.

   IT IS AN ESTIMATE, NOT AN APPRAISAL, and that qualifier travels with the
   figure everywhere it is printed — the design treats dropping it as a defect,
   not a trim.
   ============================================================================ */

export const portfolio = {
  estimate: "$26,340",
  estimateBasis: "MVestimate · estimate, not an appraisal",
  /** v42 · UTK-STEADY — steady is a result, and it is said as one. */
  weekChange: "No change",
  weekChangeNote: "— steady ✓",
  gasThisWeek: "64,730",
  gasUnit: "mcf",
  countyAppraised: "~$11,532",
  producing: 7,
  leaseCount: 10,
  operators: "Bluestem · Caddo Pine · Trinity Fork · Kestrel",
} as const;

/* ============================================================================
   THE DASHBOARD KPI ROW

   SOURCE · MVestimateCalculations · PG.membersclaimedleases ·
   Mongo.ProdMvestPortal.Activity_Production (228 postings) ·
   Adjacent_Lease_Activity (22 adjacent leases, 1 mi radius) ·
   GeoMapPortal.LeaseRadiusData.Near_Permit_List (38 nearby permits).

   `locked: true` marks the one figure state 3 covers up. It is the MVestimate
   money figure and nothing else — see the D-012 note in `portal.css`.
   ============================================================================ */

export interface DashboardKpi {
  label: string;
  value: string;
  /** A smaller trailing qualifier inside the value, e.g. "of 10". */
  valueSuffix?: string;
  subs: string[];
  /** The `.ctx-hint` pill the reference puts under each tile. */
  hint: string;
  /** An inline destination inside the sub, e.g. "activities →". */
  subLink?: string;
  /** The `.cl-lock` opt-in. Only the money figure carries it. */
  locked?: boolean;
  /** The glossary definition shown on the label, where the design has one. */
  glossary?: string;
  /** Sparkline points, in the reference's own 90x20 viewBox. */
  spark?: { points: string; stroke: string; dotFill: string };
  freshness: string;
}

export const dashboardKpis: DashboardKpi[] = [
  {
    label: "MVestimate · owner share",
    hint: "How it’s built →",
    value: portfolio.estimate,
    locked: true,
    glossary:
      "MVestimate is your projected six-year owner-share earnings at the current decline and price outlook. Forward-looking — an estimate, never an appraisal.",
    subs: ["six years · your share"],
    spark: {
      points: "0,13 12,12.4 24,12.8 36,12 48,12.2 60,11.6 72,11.8 90,11.5",
      stroke: "#54bf96",
      dotFill: "#2e8f6d",
    },
    freshness: "updated Jul 04, 6:00 AM",
  },
  {
    label: "Leases earning income",
    hint: "What paused means →",
    value: String(portfolio.producing),
    valueSuffix: `of ${portfolio.leaseCount}`,
    subs: ["3 paused · Bee, Cass, Hood"],
    spark: {
      points: "0,12 30,12 45,12 60,12 90,12",
      stroke: "#94a3b8",
      dotFill: "#54bf96",
    },
    freshness: "updated Jul 04, 6:00 AM",
  },
  {
    label: "New production postings",
    hint: "What a posting is →",
    value: "228",
    subs: ["your + nearby leases"],
    subLink: "activities →",
    spark: {
      points: "0,16 12,15 24,14.4 36,12.8 48,11.8 60,9.6 72,7.8 90,5.5",
      stroke: "#54bf96",
      dotFill: "#2e8f6d",
    },
    freshness: "updated Jul 04, 6:00 AM",
  },
  {
    label: "Adjacent leases · within ~1 mi",
    hint: "Why neighbors matter →",
    value: "22",
    subs: ["plus 38 nearby permits"],
    subLink: "map →",
    spark: {
      points: "0,14 12,11 24,13 36,9 48,11.5 60,7.5 72,9.5 90,6",
      stroke: "#b8892f",
      dotFill: "#b8892f",
    },
    freshness: "updated Jul 04, 6:00 AM",
  },
];

/* ============================================================================
   THE ALERTS ROLLUP  (v43 · OW-33)

   "The dashboard gets an alerts summary box that clicks into the detailed
   section." A rollup, not a fourth copy of the alert list: one count, the split
   by kind, and the single item that asks something of you.

   SOURCE · PG.notification_history + PG.member_session (last visit Jul 01).

   ── EVERY FIGURE HERE IS NOW DERIVED FROM THE ALERTS MODULE ──

   It used to be nine typed literals — `total: 9`, `needsYou: 1`, and a
   four-entry category table. The Alerts route's own note explains why that could
   not stay: "the dashboard summary box now quotes these same counts, so the two
   surfaces have to agree" (v43 · OW-33), and the reference then had to add
   JavaScript to keep a THIRD copy of them honest inside that page (v50 · BG-03).

   The alerts are data now — `alerts/_lib/alert-records.tsx` — so this rollup
   counts them instead of restating them, and the dashboard, the inbox, the
   filter row, the watch ledger and the sidebar badge all move together. Adding a
   tenth alert is one entry in one array.
   ============================================================================ */

export interface AlertCategory {
  count: number;
  label: string;
  key: string;
  actionable: boolean;
}

export const alertSummary: {
  total: number;
  needsYou: number;
  important: number;
  context: number;
  categories: AlertCategory[];
} = {
  total: alertCounts.total,
  needsYou: alertCounts.action,
  /* The three severities the rollup splits by: one asks, some are marked
     Important, and the rest are context. `context` is the remainder rather than
     a count of its own, so the three always sum to the total. */
  important: alertRecords.filter((alert) => alert.severity === "important")
    .length,
  context: alertRecords.filter((alert) => !alert.severity).length,
  categories: alertFilters
    .filter((filter) => filter.value !== "all")
    .map((filter) => ({
      count: filter.count,
      label: filter.label,
      key: filter.value,
      /* "Actionable" marks the ONE bucket holding the alert that asks something
         of the reader, so the chip can carry the emphasis. Derived, because
         which bucket that is depends on which alert it is. */
      actionable: alertRecords.some(
        (alert) => alert.category === filter.value && actionRecommended(alert),
      ),
    })),
};

/* ============================================================================
   WHAT'S CHANGED SINCE THE LAST VISIT

   The Essentials front door. Three items, plain language.

   NOTE THE CAREFUL CLAIM on the first one, which is the design's most-repeated
   correction: the public record shows PRODUCTION, never PAYMENT. We can say
   Ledbetter produced gas in months we can see; we cannot say the owner was
   underpaid, and the copy must not imply it. The Lease Audit is how the two get
   compared.
   ============================================================================ */

export interface ChangedItem {
  headline: string;
  detail: string;
  /** The `.ctx-hint` pill the reference puts after the detail. */
  hint: string;
  /** The reference's second line — the direct evidence shortcut. */
  secondary: string;
}

export const changedSinceLastVisit: ChangedItem[] = [
  {
    headline: "Ledbetter produced gas — were you paid?",
    detail: "3 months in the public record",
    hint: "See the evidence →",
    secondary: "or run your included Lease Audit →",
  },
  {
    headline: "New money posted on your strongest lease",
    detail: "Smith 305892 · 27,120 mcf",
    hint: "See the posting →",
    secondary: "or open the lease report →",
  },
  {
    headline: "11 permits within 1 mile of Ledbetter",
    detail: "neighbors drilling nearby",
    hint: "See 11 permits →",
    secondary: "or open the permit map + list →",
  },
];

/**
 * "Also since Jul 01" — the three quieter events the reference lists under the
 * three headline items.
 */
export const alsoSinceLastVisit: string[] = [
  "gas firmed +1.53% (your estimate held)",
  "Margaret D. posted in your group",
  "2026 owner records updated — 3 possible matches",
];

/* ============================================================================
   THE DEEP-LINKED ALERT STRIP  (Detailed and Professional only)

   Six cards. The two reserved slots the design also carries are Professional
   only — they are dev honesty about banner capacity, and to an owner they read
   as a broken promise.
   ============================================================================ */

export interface AlertCard {
  /**
   * The `.ctx-hint` that closes `.al-s`. v37 · A1 — "card subs trimmed to a
   * short descriptor + expand →", so the descriptor and this are one line.
   */
  hint: string;
  kind: string;
  headline: string;
  detail: string;
  tone: "green" | "gold";
}

export const alertStrip: AlertCard[] = [
  {
    kind: "⚑",
    headline: "11 permits within 1 mi of Ledbetter",
    hint: "See 11 permits →",
    detail: "neighbor tracts · Cass Co.",
    tone: "green",
  },
  {
    kind: "▤",
    headline: "New production — Smith 305892",
    hint: "See the posting →",
    detail: "27,120 mcf · Jul 02 · Bluestem batch",
    tone: "green",
  },
  {
    kind: "✓",
    headline: "Produced — but were you paid?",
    hint: "See the evidence →",
    detail: "Ledbetter · 3 produced gas months",
    tone: "gold",
  },
  {
    kind: "▲",
    headline: "Gas +1.53% touched your estimate",
    hint: "See why gas moved →",
    detail: "gas-weighted Bee units · $26,340 held",
    tone: "green",
  },
  {
    kind: "◉",
    headline: "Margaret D. posted in your group",
    hint: "Read the post →",
    detail: "Smith Gas Unit — Owners · 2h",
    tone: "green",
  },
  {
    kind: "✚",
    headline: "2026 records — 3 new possible matches",
    hint: "See 3 matches →",
    detail: "Smith C D variants · Karnes & DeWitt",
    tone: "gold",
  },
];

/* ============================================================================
   THE VALUE RECEIPT  (v17R · RETENTION)

   What the subscription actually did this period, in one card — the work
   Mineral View does whether the owner signs in or not.

   SOURCE · Activity_Production (228) · Near_Permit_List (38, 11 near
   Ledbetter) · MVestimateCalculations (the daily 6:00 AM re-run) ·
   PG.notification_history (6 alerts) + the weekly briefing cadence.
   ============================================================================ */

export interface WatchedRow {
  label: string;
  detail: string;
  value: string;
  highlight?: boolean;
}

export const watchedThisMonth: WatchedRow[] = [
  {
    label: "Production postings checked",
    detail: "across your leases + the 22 adjacent ones",
    value: "228",
  },
  {
    label: "Nearby permits tracked",
    detail: "within ~1 mi of your leases · 11 near Ledbetter",
    value: "38",
  },
  {
    label: "Estimate re-runs",
    detail: "every morning at 6:00 · steady at $26,340 this week",
    value: "30×",
  },
  {
    label: "Payment-check signal raised",
    detail:
      "Ledbetter · 3 produced gas months in the public record — compare your statements to know if you were paid",
    value: "1",
    highlight: true,
  },
  {
    label: "Alerts + weekly briefings delivered",
    detail: "6 alerts · 4 briefings · email + in-app",
    value: "10",
  },
];

/* ============================================================================
   THE OPERATOR PAYMENT SIGNALS

   Built from findings owners chose to keep — never from their documents.
   INFORMATIONAL, NOT A RATING, and the copy says so: it is a signal to help
   decide what to verify, never an accusation.

   SOURCE · aggregated Lease Audit findings by operator. NOT YET IN THE DB.
   ============================================================================ */

export interface OperatorSignal {
  name: string;
  detail: string;
  band: string;
  tone: "good" | "watch" | "none";
}

export const operatorSignals: OperatorSignal[] = [
  {
    name: "Bluestem Oil and Gas, LP",
    detail: "your 4 Smith units · volumes match the public record",
    band: "Pays close to expected",
    tone: "good",
  },
  {
    name: "Caddo Pine Resources, LLC",
    detail:
      "Ledbetter · other owners' audits of this operator flagged deductions above the area norm — your record not audited yet",
    band: "Worth verifying",
    tone: "watch",
  },
  {
    name: "Trinity Fork USA, LLC",
    detail: "your 4 Cedar Bend leases · no audit run yet",
    band: "Not yet audited",
    tone: "none",
  },
];

/* ============================================================================
   THE RAW PORTFOLIO SNAPSHOT  (Professional only)

   The ten leases, as filed. Volumes are GROSS LEASE as posted to the RRC — not
   the owner's share — which is why the decimal interest sits beside them.

   SOURCE · PG.membersclaimedleases · Activity_Production.
   ============================================================================ */

export interface LeaseRow {
  lease: string;
  county: string;
  decimal: string;
  estimate: string;
  gas: string;
  oil: string;
  boe: string;
}

export const leaseSnapshot: LeaseRow[] = [
  {
    lease: "Smith Gas Unit (305892)",
    county: "Bee",
    decimal: "0.00538700",
    estimate: "$8,700",
    gas: "27,120",
    oil: "133",
    boe: "2",
  },
  {
    lease: "Ledbetter (74318)",
    county: "Cass",
    decimal: "0.00243700",
    estimate: "$5,300",
    gas: "399",
    oil: "482",
    boe: "2",
  },
  {
    lease: "Smith Gas Unit (423065)",
    county: "Bee",
    decimal: "0.00538600",
    estimate: "$4,100",
    gas: "37,610",
    oil: "303",
    boe: "1",
  },
  {
    lease: "Cedar Bend (578204)",
    county: "Hood",
    decimal: "0.00171900",
    estimate: "$3,000",
    gas: "3,990",
    oil: "0",
    boe: "0",
  },
  {
    lease: "Cedar Bend (619473)",
    county: "Hood",
    decimal: "0.00171900",
    estimate: "$2,600",
    gas: "2,520",
    oil: "0",
    boe: "0",
  },
  {
    lease: "Cedar Bend (391756)",
    county: "Hood",
    decimal: "0.00171900",
    estimate: "$2,100",
    gas: "2,030",
    oil: "0",
    boe: "0",
  },
  {
    lease: "Cedar Bend (480329)",
    county: "Hood",
    decimal: "0.00171900",
    estimate: "$540",
    gas: "1,955",
    oil: "0",
    boe: "0",
  },
  {
    lease: "Averitt (65081)",
    county: "Cass",
    decimal: "0.00082906",
    estimate: "$0",
    gas: "31",
    oil: "2",
    boe: "0",
  },
  {
    lease: "Smith Gas Unit (267145)",
    county: "Bee",
    decimal: "0.00538600",
    estimate: "$0",
    gas: "58,580",
    oil: "189",
    boe: "0",
  },
  {
    lease: "Smith Gas Unit (508936)",
    county: "Bee",
    decimal: "0.00538600",
    estimate: "$0",
    gas: "26,220",
    oil: "49",
    boe: "0",
  },
];

/* ============================================================================
   THE REFERRAL CARD

   SOURCE · PG.referral_bonus + PG.invitations · claimed-owner count by county.

   Credits are NON-CASH and the copy says so, along with the condition that
   earned them: a referred co-owner who became a PAID member. Free signups earn
   nothing, and stating that up front is the point.
   ============================================================================ */

export const referral = {
  earned: "$100.00",
  invited: 2,
  target: 5,
  countyProof: "142 owners in Bee Co.",
  groupRate: "at 12, the $5,000 audit is $417 each",
} as const;

/* ============================================================================
   THE UNCLAIMED SAMPLE OWNER  (state 1)

   v24 · #1 — the no-claim dashboard is a RICH SAMPLE of the claimed
   experience, on a clearly fictional owner: J. T. Callahan, Karnes and Panola
   counties, the same fictional leases the claim-flow teaser uses.

   AMBER DASHED SAMPLE CHROME EVERYWHERE, so it is never confusable with real
   data. Green means "live, watched daily"; amber means "a labelled example, not
   yours yet" — and the claim box states that rule out loud rather than leaving
   the reader to infer it.

   SOURCE · none. Deliberately no synthetic KPIs against a real account: this
   fixture exists so a signed-in owner with zero claims sees what the portal
   becomes instead of an empty page with four zeroes in it.
   ============================================================================ */

export interface SampleKpi {
  label: string;
  value: string;
  /** The plain sub-line. Absent when the tile's sub is a chip instead. */
  sub?: string;
  /** `chip-est` in the sub slot, which is how the value tile qualifies itself. */
  chip?: string;
  /** The `▲ 3.1%` half is coloured; only the income tile carries a delta. */
  delta?: boolean;
  /**
   * The reference's per-tile density class. The sample thins out with the rest
   * of the page: Essentials drops the two count tiles, Ultra drops the value
   * too, so the calm views show one or two figures rather than four.
   */
  density?: "hide-u" | "hide-s";
}

/** One of the sample record's three alerts. */
export interface SampleAlert {
  headline: string;
  detail: string;
}

export const sampleOwner: {
  name: string;
  greetingName: string;
  /** The header chip: signed in, but nothing claimed yet. */
  headerChip: string;
  planLine: string;
  /** `.smp-tag` on the badge above the panel. */
  sampleTag: string;
  /** `.smp-chip` in the panel header. */
  fictionalChip: string;
  /** The panel's own sub-line — the record id makes the fixture identifiable. */
  recordLine: string;
  kpis: SampleKpi[];
  alerts: {
    total: number;
    line: string;
    categories: { count: number; label: string }[];
    items: SampleAlert[];
  };
} = {
  name: "J. T. Callahan",
  greetingName: "J. T.",
  headerChip: "Signed in · claim pending",
  planLine: "Free account · no owner record claimed yet",
  sampleTag: "SAMPLE PREVIEW",
  fictionalChip: "FICTIONAL SAMPLE OWNER",
  recordLine:
    "Sample owner record KRN-306471 · Karnes & Panola counties · 4 leases",
  kpis: [
    {
      label: "Owner-share income · Jun",
      value: "$212.40",
      sub: "▲ 3.1% vs May",
      delta: true,
    },
    {
      label: "Est. portfolio value",
      value: "$41,270",
      chip: "Estimate — not an appraisal",
      density: "hide-u",
    },
    {
      label: "Leases on the record",
      value: "4",
      sub: "3 producing · 1 inactive — all found automatically at claim",
      density: "hide-s",
    },
    {
      label: "New activity nearby",
      value: "2",
      sub: "1 permit within 1 mi · 1 completion",
      density: "hide-s",
    },
  ],
  /* v43 · OW-33 (unclaimed half) — the sample gets the SAME alerts summary box
     the claimed dashboard gets, so what an owner is being sold is the thing
     they will actually receive. Chip-labelled throughout: these are J. T.
     Callahan's three alerts, never a count of anything belonging to the reader.

     "None need an answer" is the honest reading of the three: two are activity
     and one is a price move, so nothing here asks the owner to do something. */
  alerts: {
    total: 3,
    line: "since J. T. last visited · none need an answer, all three are context",
    categories: [
      { count: 2, label: "Activity" },
      { count: 1, label: "Money & prices" },
      { count: 0, label: "Community" },
    ],
    items: [
      {
        headline: "New production posted on Alameda Ranch",
        detail:
          "4,120 mcf of gas filed for June — the lease reported production (payment shows on statements)",
      },
      {
        headline: "1 permit within a mile of Bluestem 2H",
        detail:
          "a neighbor is drilling close by — a good sign for the area, not income by itself",
      },
      {
        headline: "Gas firmed +1.5% — touched the estimate",
        detail: "good for a gas-weighted record like this one",
      },
    ],
  },
};
