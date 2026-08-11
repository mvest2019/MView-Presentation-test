/**
 * Static well rows behind the Table view.
 *
 * The whole 9,000-row set is materialised once, rather than a page at a time,
 * so filtering, sorting and the summary strip all work against the same body of
 * data. Page one is the mock's ten Anderson County rows verbatim; the rest are
 * generated deterministically from a hash of the row index, so the set is
 * identical on every render and across reloads.
 *
 * The distributions are tuned to the mock's headline figures — 69.3% oil,
 * 23.4% gas, 7.2% inactive, and about 27% carrying a reported BOE, which is
 * what takes 9,000 down to roughly 2,400 when "Reported BOE only" is on.
 *
 * All of it is a stand-in for the well service. Delete this file when that
 * lands; nothing here should outlive it.
 */

export type WellType = "Oil" | "Gas" | "Injection";

export type WellStatus = "Producing" | "Shut-In Producer" | "Inactive" | null;

export type WellRow = {
  api: string;
  operator: string;
  lease: string;
  type: WellType;
  status: WellStatus;
  county: string;
  /** Barrels of oil equivalent, or null where nothing was reported. */
  boe: number | null;
};

/** Matches the county totals in the filters panel, which add up to 9,000. */
export const TOTAL_WELLS = 9000;

export const PER_PAGE = 10;

export const WELL_TYPES: WellType[] = ["Oil", "Gas", "Injection"];

export const WELL_STATUSES = [
  "Producing",
  "Shut-In Producer",
  "Inactive",
] as const;

/** Operators seen across the mock's screenshots, plus enough to fill a list. */
export const OPERATORS = [
  "Highmark",
  "Peles",
  "Supreme",
  "Dg&e/slocum",
  "Palestine",
  "Hd",
  "Ward",
  "Devon Operating of Texas",
  "Latigo Resources III",
  "Cordillera Partners Corp.",
  "Crown Quest Partners Co.",
  "Lonestar",
  "Colgate Petroleum Texas",
  "Pioneer Natural Resources",
  "Diamondback E&P",
  "ConocoPhillips",
  "Chevron U.S.A.",
  "Apache Corporation",
  "Oxy USA",
  "EOG Resources",
  "UPP Operating",
  "Endeavor Energy",
  "Callon Petroleum",
  "Matador Production",
  "Coterra Energy",
  "Ovintiv USA",
  "Mewbourne Oil",
  "Ameredev Operating",
  "Birch Resources",
  "Tall City Exploration",
  "Henry Resources",
  "CrownRock",
  "Elevation Resources",
  "Rattler Midstream",
  "Steward Energy II",
  "Fasken Oil & Ranch",
  "Sabalo Operating",
  "Discovery Natural",
  "Riley Exploration",
  "Summit Petroleum",
];

/** Thirty-two counties, matching the mock's COUNTIES card. */
export const COUNTIES = [
  "Anderson",
  "Andrews",
  "Bee",
  "Borden",
  "Brown",
  "Crane",
  "Culberson",
  "Dawson",
  "DeWitt",
  "Ector",
  "Gaines",
  "Glasscock",
  "Gonzales",
  "Howard",
  "Irion",
  "Karnes",
  "La Salle",
  "Lea",
  "Loving",
  "Martin",
  "Midland",
  "Mitchell",
  "Pecos",
  "Reagan",
  "Reeves",
  "Sterling",
  "Upton",
  "Ward",
  "Webb",
  "Winkler",
  "Yoakum",
  "Zavala",
];

const LEASES = [
  "FAIRWAY /JAMES LIME/ UNIT",
  "EATON G. W. ESTATE",
  "BOWERS ESTATE A. L.",
  "BROYLES & WOOLVERTON",
  "SOUTHERN PINE LBR. CO.",
  "WEBB CARL A",
  "VICKERY J. R.",
  "LOPER VERNA",
  "PRIDDY J. R.",
  "WEBB LBR. CO.",
  "CRAWFORD SOUTH",
  "CANTU VERNA",
  "PRIDDY UNIT",
  "EATON STATE",
  "SPRABERRY DEEP UNIT",
  "MABEE RANCH",
  "PARKER & PARSLEY",
  "GRISHAM ESTATE",
  "MCCLINTIC BROS.",
  "SAWYER CANYON",
  "TIPPETT RANCH",
  "HALFF ESTATE",
  "BRUNSON NORTH",
  "DOLLARHIDE UNIT",
];

const PAGE_ONE: WellRow[] = [
  { api: "42-001-00106", operator: "Highmark", lease: "FAIRWAY /JAMES LIME/ UNIT", type: "Oil", status: null, county: "Anderson", boe: null },
  { api: "42-001-00114", operator: "Highmark", lease: "FAIRWAY /JAMES LIME/ UNIT", type: "Oil", status: null, county: "Anderson", boe: null },
  { api: "42-001-00267", operator: "Peles", lease: "EATON G. W. ESTATE", type: "Oil", status: "Shut-In Producer", county: "Anderson", boe: 8320 },
  { api: "42-001-00305", operator: "Peles", lease: "BOWERS ESTATE A. L.", type: "Oil", status: "Shut-In Producer", county: "Anderson", boe: 5410 },
  { api: "42-001-01271", operator: "Supreme", lease: "BROYLES & WOOLVERTON", type: "Oil", status: null, county: "Anderson", boe: null },
  { api: "42-001-01717", operator: "Dg&e/slocum", lease: "SOUTHERN PINE LBR. CO.", type: "Oil", status: null, county: "Anderson", boe: null },
  { api: "42-001-01764", operator: "Palestine", lease: "WEBB CARL A", type: "Oil", status: null, county: "Anderson", boe: null },
  { api: "42-001-02078", operator: "Hd", lease: "VICKERY J. R.", type: "Oil", status: "Shut-In Producer", county: "Anderson", boe: 3120 },
  { api: "42-001-02415", operator: "Ward", lease: "LOPER VERNA", type: "Gas", status: null, county: "Anderson", boe: null },
  { api: "42-001-02525", operator: "Hd", lease: "VICKERY J. R.", type: "Oil", status: "Producing", county: "Anderson", boe: 12850 },
];

/**
 * Deterministic value in [0, 1) from a row index and a salt. A hash rather than
 * `Math.random`, so the table is stable — sorting or filtering must not deal a
 * different set of wells each time it runs.
 */
function unit(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function pick<T>(pool: T[], index: number, salt: number): T {
  return pool[Math.floor(unit(index, salt) * pool.length)];
}

let cache: WellRow[] | null = null;

/** The whole result set. Built once, on first use. */
export function allWells(): WellRow[] {
  if (cache) return cache;

  const rows: WellRow[] = [...PAGE_ONE];

  for (let index = PAGE_ONE.length; index < TOTAL_WELLS; index++) {
    const county = pick(COUNTIES, index, 1);

    const typeRoll = unit(index, 2);
    const type: WellType =
      typeRoll < 0.693 ? "Oil" : typeRoll < 0.927 ? "Gas" : "Injection";

    const statusRoll = unit(index, 3);
    const status: WellStatus =
      statusRoll < 0.4
        ? "Producing"
        : statusRoll < 0.65
          ? "Shut-In Producer"
          : statusRoll < 0.722
            ? "Inactive"
            : null;

    const hasBoe = unit(index, 4) < 0.27;

    rows.push({
      api: `42-${String(1 + (index % 499) * 2).padStart(3, "0")}-${String(
        100 + ((index * 37) % 89000),
      ).padStart(5, "0")}`,
      operator: pick(OPERATORS, index, 5),
      lease: pick(LEASES, index, 6),
      type,
      status,
      county,
      boe: hasBoe ? Math.round((1000 + unit(index, 7) * 19000) / 10) * 10 : null,
    });
  }

  cache = rows;
  return rows;
}
