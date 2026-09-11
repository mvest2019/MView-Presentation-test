import { leaseRecords } from "./lease-records";

/**
 * THE WELLS, FROM THE TEXAS WELL MASTER.
 *
 * ── A SEPARATE RECORD BECAUSE A WELL IS A SEPARATE THING ──
 *
 * The lease table next door deliberately carries no API number, no depth and no
 * field: those describe a WELL, and a lease can hold many. This is that second
 * feed — the one the provenance card on the list page calls "Texas well master"
 * — and it is what the reservoir and well reports are built from.
 *
 * ── ONE WELL PER LEASE ON THIS RECORD, WHICH IS NOT THE GENERAL CASE ──
 *
 * Every lease here has exactly one well, so the reservoir report's "1 well in
 * this rock" is a fact about this owner rather than a simplification. The shape
 * below is a list precisely so a lease with four wells needs no new code — the
 * components group by `leaseSlug` and sum.
 *
 * ── THE OPEN INTERVAL IS THE FIGURE MOST WORTH UNDERSTANDING ──
 *
 * `openTopFt` to `openBottomFt` is the perforated section: the part of the hole
 * the rock is actually being drained through. Everything above it is casing.
 * A reader comparing two wells on total depth is comparing how far somebody
 * drilled; comparing them on open interval is comparing how much reservoir each
 * one is connected to.
 */

export interface WellRecord {
  /** Which lease this well sits on. */
  leaseSlug: string;
  /** The operator's own name for it — "1R", "5L". */
  name: string;
  /** State, county, sequence — "42-123-34970". */
  api: string;
  /** How the hole was put down, as the state files it. */
  drilled: "DIRECTIONAL" | "HORIZONTAL" | "VERTICAL";
  /** Total measured depth, feet. */
  depthFt: number;
  /** The top and bottom of the perforated section, measured depth in feet. */
  openTopFt: number;
  openBottomFt: number;
  /** Lateral length where the well has one; null for a straight hole. */
  lateralFt: number | null;
  /**
   * The compass bearing the hole runs on, where it runs anywhere.
   *
   * A DIRECTION, NOT A DISTANCE, and the two together are what the "1,042 ft
   * NNE" line on the well report states. Null for a vertical hole, which has no
   * bearing to state.
   */
  bearing: string | null;
  /** The month it first produced. */
  cameOn: string;
  /**
   * The state's field name, which is NOT the reservoir name and is worth the
   * distinction: a field is an administrative area the commission names, and
   * the reservoir it produces from is written in a bracket after it —
   * "SAWFISH (WILCOX 10400)". The bracket is where the reservoir on this
   * record is read from; see the reservoir report's own note.
   */
  field: string;
  /** What the well is approved to produce — "Gas", "Oil". */
  type: "Gas" | "Oil";
  /** The day the bit went in the ground, ISO. */
  spudded: string;
  /** The day it first produced, ISO. */
  firstProduction: string;
  /** Who drilled it, which is not always who runs it now. */
  drilledBy: string;
  /** Where the hole starts and finishes, as [longitude, latitude]. */
  surface: [number, number];
  bottom: [number, number];
}

/**
 * The ten wells, one per lease.
 *
 * DE WITT COUNTY IS 42-123 in the state's numbering — the 42 is Texas and the
 * 123 is the county — so every API here shares that prefix and differs only in
 * the five-digit well sequence. The coordinates sit inside the county; they are
 * the filed surface and bottom holes, which is all the state publishes, and the
 * map draws a straight line between them because no directional survey is on
 * file. See the note in the map card.
 */
const WELLS: Omit<WellRecord, "leaseSlug">[] = [
  {
    name: "1R",
    api: "42-123-34970",
    drilled: "DIRECTIONAL",
    depthFt: 10_561,
    openTopFt: 10_457,
    openBottomFt: 10_511,
    lateralFt: 1_042,
    bearing: "NNE",
    cameOn: "March 2022",
    field: "SAWFISH",
    type: "Gas",
    spudded: "2020-03-10",
    firstProduction: "2022-03-08",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3512, 29.0784],
    bottom: [-97.3468, 29.0831],
  },
  {
    name: "2H",
    api: "42-123-35118",
    drilled: "HORIZONTAL",
    depthFt: 10_486,
    openTopFt: 10_402,
    openBottomFt: 10_463,
    lateralFt: 4_780,
    bearing: "WNW",
    cameOn: "September 2023",
    field: "SAWFISH",
    type: "Gas",
    spudded: "2022-11-02",
    firstProduction: "2023-09-14",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3684, 29.0912],
    bottom: [-97.3601, 29.0978],
  },
  {
    name: "3L",
    api: "42-123-33864",
    drilled: "DIRECTIONAL",
    depthFt: 10_604,
    openTopFt: 10_498,
    openBottomFt: 10_552,
    lateralFt: 986,
    bearing: "NE",
    cameOn: "July 2021",
    field: "SAWFISH",
    type: "Gas",
    spudded: "2020-09-22",
    firstProduction: "2021-07-05",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3391, 29.0668],
    bottom: [-97.3344, 29.0705],
  },
  {
    name: "1H",
    api: "42-123-34215",
    drilled: "HORIZONTAL",
    depthFt: 10_398,
    openTopFt: 10_310,
    openBottomFt: 10_372,
    lateralFt: 5_230,
    bearing: "NNW",
    cameOn: "May 2022",
    field: "THREE RIVERS",
    type: "Gas",
    spudded: "2021-06-18",
    firstProduction: "2022-05-11",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3247, 29.0993],
    bottom: [-97.3158, 29.1054],
  },
  {
    name: "4R",
    api: "42-123-35402",
    drilled: "DIRECTIONAL",
    depthFt: 10_530,
    openTopFt: 10_441,
    openBottomFt: 10_489,
    lateralFt: 1_118,
    bearing: "ENE",
    cameOn: "October 2023",
    field: "SAWFISH",
    type: "Gas",
    spudded: "2022-12-15",
    firstProduction: "2023-10-02",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3803, 29.0621],
    bottom: [-97.3752, 29.0664],
  },
  {
    name: "2L",
    api: "42-123-33991",
    drilled: "DIRECTIONAL",
    depthFt: 10_572,
    openTopFt: 10_476,
    openBottomFt: 10_528,
    lateralFt: 1_004,
    bearing: "NE",
    cameOn: "April 2023",
    field: "THREE RIVERS",
    type: "Gas",
    spudded: "2022-05-30",
    firstProduction: "2023-04-19",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3129, 29.0742],
    bottom: [-97.3081, 29.0788],
  },
  {
    name: "5H",
    api: "42-123-35566",
    drilled: "HORIZONTAL",
    depthFt: 10_441,
    openTopFt: 10_355,
    openBottomFt: 10_418,
    lateralFt: 4_406,
    bearing: "NNE",
    cameOn: "February 2024",
    field: "SAWFISH",
    type: "Gas",
    spudded: "2023-03-08",
    firstProduction: "2024-02-21",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3958, 29.0857],
    bottom: [-97.3874, 29.0921],
  },
  {
    name: "1V",
    api: "42-123-34688",
    drilled: "VERTICAL",
    depthFt: 10_512,
    openTopFt: 10_428,
    openBottomFt: 10_477,
    lateralFt: null,
    bearing: null,
    cameOn: "March 2024",
    field: "KAISER SOUTH",
    type: "Gas",
    spudded: "2023-05-16",
    firstProduction: "2024-03-04",
    drilledBy: "KALER ENERGY CORP.",
    surface: [-97.3065, 29.1108],
    bottom: [-97.3065, 29.1108],
  },
  {
    name: "3R",
    api: "42-123-34037",
    drilled: "DIRECTIONAL",
    depthFt: 10_588,
    openTopFt: 10_489,
    openBottomFt: 10_540,
    lateralFt: 1_076,
    bearing: "NNE",
    cameOn: "July 2022",
    field: "SAWFISH",
    type: "Gas",
    spudded: "2021-08-11",
    firstProduction: "2022-07-26",
    drilledBy: "HURD ENTERPRISES LTD.",
    surface: [-97.3576, 29.1041],
    bottom: [-97.3531, 29.1082],
  },
  {
    name: "1-E",
    api: "42-123-28114",
    drilled: "VERTICAL",
    depthFt: 12_240,
    openTopFt: 12_106,
    openBottomFt: 12_188,
    lateralFt: null,
    bearing: null,
    cameOn: "June 2009",
    field: "COOK (EDWARDS)",
    type: "Gas",
    spudded: "2008-07-14",
    firstProduction: "2009-06-02",
    drilledBy: "BB-SOUTHTEX, LLC",
    surface: [-97.4102, 29.0489],
    bottom: [-97.4102, 29.0489],
  },
];

/**
 * Zipped onto the leases in order, so the two lists cannot drift: a lease added
 * without a well is a compile-time hole rather than a page that silently shows
 * nothing.
 */
export const wellRecords: WellRecord[] = leaseRecords.map((lease, index) => ({
  leaseSlug: lease.slug,
  ...WELLS[index],
}));

/** The wells on one lease. */
export function wellsForLease(slug: string): WellRecord[] {
  return wellRecords.filter((well) => well.leaseSlug === slug);
}
