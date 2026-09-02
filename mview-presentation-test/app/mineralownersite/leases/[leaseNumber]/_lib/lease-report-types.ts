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

/**
 * A RUN OF COPY, with the money marked.
 *
 * ── WHY THE SENTENCES ARE NOT PLAIN STRINGS ──
 *
 * The Essentials rows read "about $8,700 over the next six years" and "the
 * largest piece of your $26,340 — your three other Smith units add about $4,100
 * more". In the CLAIMED state every one of those dollar figures blurs and the
 * words around them do not: the design marks each with `cl-lock` individually.
 *
 * A plain string cannot express that. It was one before, which is why this tier
 * leaked all three figures to a free account — the one state where the MVestimate
 * is the single thing being withheld.
 *
 * So a row's answer is a list: strings are prose, `{ money }` is a figure that
 * carries the gate. The alternative — scanning the sentence for `$` at render
 * time — would silently mark any future figure that happens to be a dollar
 * amount but is not the product, such as the county's own appraised value.
 */
import type { DeclineCurveRecord } from "./decline-curve-record";

export type CopySegment = string | { money: string };

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
  essentials: {
    title: string;
    lede: string;
    rows: { q: string; a: CopySegment[] }[];
  };
  /**
   * The "Compare with …" tile's sentence, and which lease it points at.
   *
   * EDITORIAL AND PER-PAIR. It contrasts two specific leases by weighting, EUR
   * and decimal interest — "oil-weighted (275,798 bbl EUR) with a bigger gross
   * value" against "gas-weighted (3,625,715 mcf EUR) with the bigger share to
   * you". Nothing derivable produces that comparison, and only the two fully
   * captured leases carry the EURs it rests on.
   */
  compareNote?: string;
  compareWith?: string;
  /**
   * THE PER-WELL ALLOCATION SPLIT, and when it was last computed.
   *
   * On a multi-well lease the engine divides the lease's posted volumes between
   * wellbores, and the reader needs to know how current that division is. TWO
   * dates, because a split is only as current as the forecast underneath it:
   * when the split was computed, and when the lease curve it rests on was
   * re-solved. Stating one and not the other would overstate its freshness.
   *
   * Absent where we have not established the dates, and the card does not render.
   */
  /**
   * The engine's published decline-curve document for this lease, if it has one.
   *
   * Absent on nine of the ten leases: the engine publishes per-lease fits and
   * these units have none, so the panel renders nothing rather than a curve we
   * would have had to invent. See `decline-curve-record.ts`.
   */
  declineCurve?: DeclineCurveRecord;
  /**
   * The model's gross valuation BEFORE the rounding shown in the banner.
   *
   * Only the estimate explainer uses it, and only to print the unrounded figure
   * beside the rounded one — so a reader who redoes the arithmetic is not
   * surprised by the last two digits. Undefined where the model's exact output
   * is not recorded, which is where that panel declines to render.
   */
  exactGrossValuation?: number;
  allocation?: { splitComputed: string; curveResolved: string };
  /** See `Recovery`. Absent on the eight leases with no captured curve. */
  recovery?: Recovery;
  reservoir: ReservoirReport;
  wells: WellReport[];
}

/**
 * RECOVERY, AS NUMBERS.
 *
 * Held as figures rather than the formatted strings the tiles print, because
 * three surfaces need them differently: a two-column table, an arithmetic
 * footnote that shows `EUR − produced = reserves` worked out, and the
 * Professional record's "produced vs EUR" percentages. Formatting each at the
 * call site is what keeps those three consistent.
 *
 * Only the two fully captured leases have these. `undefined` is the honest state
 * for the other eight, and the tiles that need it render nothing.
 */
export interface Recovery {
  eurOil: number;
  producedOil: number;
  reservesOil: number;
  eurGas: number;
  producedGas: number;
  reservesGas: number;
}

export interface ReservoirReport {
  /** Field · reservoir name, as the RRC classifies it. */
  name: string;
  /**
   * The formation in one word — "Wilcox", "Pettit". The peer-rank rows read
   * "Rank vs Bee Co. / Wilcox peers", so they need the rock's short name rather
   * than the whole field-and-interval string.
   */
  shortName: string;
  county: string;
  /** Plain-English description. Narrative — descriptive, not data. */
  narrative: string[];
  /** How many of this unit's wells produce from it. */
  wellCount: number;
  /** Lease-level totals for the reservoir. */
  totals: { label: string; value: string }[];
  /** What changed at reservoir level this period. */
  changes: ChangeRow[];
  /**
   * THE EXTENT PANEL'S BASEMAP — `[west, south, east, north]`.
   *
   * The reservoir OUTLINE has no source, and the design says so on the panel.
   * What it does draw is a real Esri topo raster of the area with the unit
   * pinned on it, so a reader can at least see where in the county they are.
   * Absent on the eight leases with no captured reservoir.
   */
  extentBbox?: [number, number, number, number];
}

export interface WellReport {
  name: string;
  api: string;
  status: string;
  /** Surface coordinates, for the Professional record row. */
  location?: string;
  /** "Gas" / "Oil" — the reservoir tab's well row leads with it. */
  wellType?: string;
  /**
   * WHETHER A DIRECTIONAL SURVEY WAS FILED for this wellbore.
   *
   * `false` is a statement, not a gap in our knowledge: Texas only requires a
   * survey where a well DEVIATES, so a vertical well of a certain age usually
   * has nothing on file. That is a gap in the public record, and the card built
   * on this field says so in those words rather than drawing a line nobody
   * measured.
   *
   * `undefined` means we have not established either way, and the card does not
   * render — which is different from asserting there is no survey.
   */
  surveyOnFile?: boolean;
  /** Completion year, which is what makes the survey rule make sense. */
  completedYear?: string;
  /** The most recent posted volume, as that row prints it. */
  latestPosting?: string;
  /** Record fields, in the order the design lists them. */
  record: { label: string; value: string }[];
  /** What flows through this well. */
  flow: { label: string; value: string }[];
  changes: ChangeRow[];
}
