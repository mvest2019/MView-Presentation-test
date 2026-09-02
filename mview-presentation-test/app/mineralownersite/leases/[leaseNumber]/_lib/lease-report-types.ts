/**
 * THE SHAPES THE LEASE REPORT SPEAKS IN.
 *
 * THREE FIDELITY LEVELS, and the types make that explicit rather than leaving it
 * to whoever reads the fixture. The prototype builds two leases in full and puts
 * the other eight on a stub, because only two have captured curves and surveys:
 *
 *   full      Smith Gas Unit (305892) and Ledbetter (74318). Every panel.
 *   generic   the remaining eight. Real record fields — operator, play, field,
 *             API, volumes, decimal interest — and honest "not captured yet"
 *             for the panels that need a curve or a survey.
 *
 * `LeaseReportRecord.depth` carries which one, so a component asks the data what
 * it may render instead of guessing from whether a field happens to be present.
 */

import type { LeaseRecord } from "../../_lib/lease-types";

export type ReportDepth = "full" | "generic";

/** Which of the three tied reports is showing. */
export type ReportTab = "lease" | "reservoir" | "wells";

/* ============================================================================
   THE UNIT OUTLINE MAP
   ============================================================================ */

export interface UnitOutlineWell {
  /** API-8. Rendered as `42-nnn-nnnnn`. */
  api: string;
  /** Operator's well name, e.g. "2H". Null where the record has none. */
  well: string | null;
  /** RRC lease this well is filed under — not always this unit's. */
  rrc: string | null;
  /** Surface hole, `[lon, lat]`. */
  s: [number, number];
  /** Bottom hole, `[lon, lat]`. */
  b: [number, number];
  /**
   * The digitized directional survey. PRESENT MEANS MEASURED — drawn as a solid
   * amber track. Absent means the bore is drawn as a dashed chord and labelled
   * an estimate, because a Karnes lateral curves through its build section and a
   * straight line can sit hundreds of feet off the true path.
   */
  path?: [number, number][];
  /** Stations in the survey, which is how the tooltip states its resolution. */
  n_sta?: number;
  survey_co?: string | null;
}

export interface UnitOutlineActivity {
  t: "permit" | "filing" | "compl" | "news" | "m1" | "m3";
  p?: [number, number];
  label?: string;
}

export interface UnitOutlineRecord {
  unit: string;
  rrc_lease: string;
  county: string;
  /** Acreage the operator filed. */
  stated_ac: number;
  /** Acreage our trace closes at — the verification, shown on screen. */
  traced_ac: number;
  diff_pct: number;
  /** `[west, south, east, north]` — the unit frame. */
  bbox: [number, number, number, number];
  /** The same, widened, for the zoomed-out neighbours view. */
  bbox_wide: [number, number, number, number];
  wells: UnitOutlineWell[];
  nbr: UnitOutlineWell[];
  activity: UnitOutlineActivity[];
}

/* ============================================================================
   PRODUCTION
   ============================================================================ */

/** A monthly series aligned to `firstMonth`; `null` where nothing is posted. */
export type MonthlySeries = (number | null)[];

export interface ProductionRecord {
  unit: string;
  well: string;
  rrcLease: string;
  county: string;
  firstMonth: string;
  months: number;
  eurGas: number;
  producedGas: number;
  reservesGas: number;
  eurOil: number;
  producedOil: number;
  reservesOil: number;
  /** Goodness of fit, or null while unpublished. See `production-series.ts`. */
  fit: number | null;
  gasActual: MonthlySeries;
  oilActual: MonthlySeries;
  gasMean: MonthlySeries;
  gasDown: MonthlySeries;
  gasHigh: MonthlySeries;
  oilMean: MonthlySeries;
  oilDown: MonthlySeries;
  oilHigh: MonthlySeries;
  gasBackfit: MonthlySeries;
  oilBackfit: MonthlySeries;
}

/* ============================================================================
   THE REPORT ITSELF
   ============================================================================ */

/** One row of the "what has changed" list, with the tone of its glyph. */
export interface ChangeRow {
  tone: "event" | "ok" | "batch";
  glyph: string;
  headline: string;
  body: string;
  /** Other leases in the same filing batch — each links to its own report. */
  batch?: string[];
}

/** A forward money range. Never a point — see the card's own copy. */
export interface PaymentRange {
  label: string;
  low: number;
  high: number;
}

export interface LeaseReportRecord {
  depth: ReportDepth;
  /** The lease this report is for; every hard fact comes from here. */
  lease: LeaseRecord;
  /** RRC district, e.g. "02". */
  district: string;
  firstProduction: string;
  /** Wells producing / wells on the unit — the title card's status chip. */
  wellsProducing: number;
  /** The operator's history, where the record has one. */
  operatorNote?: string;
  /** Gross six-year projection for the whole unit, before any decimal. */
  grossValuation: number;
  /**
   * Whole-unit appraised value. DERIVED — the owner's appraised interest ÷ DI.
   * No appraisal roll publishes a whole-unit figure, and the card says so.
   */
  wholeUnitAppraised: number;
  nextMonth: PaymentRange;
  nextQuarter: PaymentRange;
  changes: ChangeRow[];
  /** Long-form version of the change list, behind "Read more". */
  changeDetail: string[];
  /** The Ultra tier's one headline and one sentence. */
  ultra: { headline: string; body: string };
  /** The Essentials tier's four question/answer rows. */
  essentials: { title: string; lede: string; rows: { q: string; a: string }[] };
  reservoir: ReservoirReport;
  wells: WellReport[];
}

export interface ReservoirReport {
  /** Field · reservoir name, as the RRC classifies it. */
  name: string;
  county: string;
  /** Plain-English description. Narrative — descriptive, not data. */
  narrative: string[];
  /** How many of this unit's wells produce from it. */
  wellCount: number;
  /** Lease-level totals for the reservoir. */
  totals: { label: string; value: string }[];
  /** What changed at reservoir level this period. */
  changes: ChangeRow[];
}

export interface WellReport {
  name: string;
  api: string;
  status: string;
  /** Record fields, in the order the design lists them. */
  record: { label: string; value: string }[];
  /** What flows through this well. */
  flow: { label: string; value: string }[];
  changes: ChangeRow[];
}
