import type { LeaseRecord } from "./lease-types";

/**
 * THE TEN LEASES ON RECORD SMITH, RAYMOND E (BEE-084213).
 *
 * EXTRACTED, NOT AUTHORED. Every field is the redesign prototype's own value
 * from `owner/src/routes/app-leases.html` — the wide table's sixteen columns,
 * transposed from markup into data. Nothing here is invented, and nothing is
 * rounded differently than the design rounds it.
 *
 * SOURCE (the prototype's own data contract for this route):
 *   PG.membersclaimedleases        decimal_interest, mvestimate, county,
 *                                  lease_number
 *   PG.memberleases                pv10, oilsoldper / gassoldper
 *   Mongo.MVestimateCalculations   the six-year cash-flow model
 *   Mongo.Mineral_Owners_Data      Apprised_Value (the county column)
 *   Monthly_Reporting_DB           the statements in `lease-statements.ts`
 *
 * WHY THIS FIXTURE AND NOT `_lib/portal-demo-data.ts`'s `leaseSnapshot`. That
 * one is the DASHBOARD's Professional-only strip: seven display strings per
 * lease, enough to print a narrow table and nothing more. This module needs
 * operator, play, field, API, district, acreage, well count, status and the
 * week delta, and it needs the money as numbers it can sort and sum. Rather
 * than widen a dashboard fixture into something the dashboard does not use, the
 * lease module owns the full record and the dashboard keeps its narrow one.
 *
 * THE THREE INACTIVE LEASES CARRY `mvestimate: 0`, and their `countyAppraised`
 * is what the page shows in the money column instead — the decided $0-fallback
 * rule (2026-07-04). The zero is the honest model output; a bare $0 beside a
 * lease somebody owns is what the fallback exists to avoid. Those county
 * figures are display-only and are never summed into the portfolio total;
 * `lease-totals.ts` is where that rule is enforced rather than remembered.
 */
export const leaseRecords: LeaseRecord[] = [
  {
    number: "305892",
    name: "Smith Gas Unit",
    county: "Bee",
    acres: null,
    operator: "Bluestem Oil and Gas, LP",
    play: "Not classified (source gap)",
    field: "Blanco Creek (Wilcox Massive E)",
    api: "42-025-71286",
    district: "02",
    wells: 1,
    decimalInterest: 0.005387,
    mvestimate: 8700,
    countyAppraised: 3510,
    production: { gasMcf: 27120, oilBbl: 133, threeMonthBoe: 2 },
    status: "producing",
    detail: "Blanco Creek (Wilcox Massive E) · well 5L",
    weekChangePercent: 0,
  },
  {
    number: "74318",
    name: "Ledbetter",
    county: "Cass",
    acres: 380,
    operator: "Caddo Pine Resources, LLC",
    play: "Haynesville/Bossier Shale",
    field: "Lake Marlow (Pettit, Upper)",
    api: "42-067-51840",
    district: "06",
    wells: 1,
    decimalInterest: 0.002437,
    mvestimate: 5300,
    countyAppraised: 5060,
    production: { gasMcf: 399, oilBbl: 482, threeMonthBoe: 2 },
    status: "producing",
    detail: "Lake Marlow (Pettit, Upper)",
    weekChangePercent: 0,
  },
  {
    number: "423065",
    name: "Smith Gas Unit",
    county: "Bee",
    acres: null,
    operator: "Bluestem Oil and Gas, LP",
    play: "Not classified (source gap)",
    field: "Blanco Creek (Wilcox Massive E)",
    api: "42-025-40593",
    district: "02",
    wells: 1,
    decimalInterest: 0.005386,
    mvestimate: 4100,
    countyAppraised: 410,
    production: { gasMcf: 37610, oilBbl: 303, threeMonthBoe: 1 },
    status: "producing",
    detail: "Blanco Creek (Wilcox Massive E) · well 1-L",
    weekChangePercent: 0,
  },
  {
    number: "578204",
    name: "Cedar Bend",
    county: "Hood",
    acres: 412.6,
    operator: "Trinity Fork USA, LLC",
    play: "Barnett Shale",
    field: "Newark, East (Barnett Shale)",
    api: "42-221-60754",
    district: "09",
    wells: 1,
    decimalInterest: 0.001719,
    mvestimate: 3000,
    countyAppraised: 230,
    production: { gasMcf: 3990, oilBbl: 0, threeMonthBoe: 0 },
    status: "producing",
    detail: "Newark, East (Barnett Shale) · well 6H",
    weekChangePercent: 0,
  },
  {
    number: "619473",
    name: "Cedar Bend",
    county: "Hood",
    acres: 412.6,
    operator: "Trinity Fork USA, LLC",
    play: "Barnett Shale",
    field: "Newark, East (Barnett Shale)",
    api: "42-221-18327",
    district: "09",
    wells: 1,
    decimalInterest: 0.001719,
    mvestimate: 2600,
    countyAppraised: 110,
    production: { gasMcf: 2520, oilBbl: 0, threeMonthBoe: 0 },
    status: "producing",
    detail: "Newark, East (Barnett Shale) · well 7H",
    weekChangePercent: 0,
  },
  {
    number: "391756",
    name: "Cedar Bend",
    county: "Hood",
    acres: null,
    operator: "Trinity Fork USA, LLC",
    play: "Barnett Shale",
    field: "Newark, East (Barnett Shale)",
    api: "42-221-45906",
    district: "09",
    wells: 1,
    decimalInterest: 0.001719,
    mvestimate: 2100,
    countyAppraised: 175,
    production: { gasMcf: 2030, oilBbl: 0, threeMonthBoe: 0 },
    status: "producing",
    detail: "Newark, East (Barnett Shale) · well 5H",
    weekChangePercent: 0,
  },
  {
    number: "480329",
    name: "Cedar Bend",
    county: "Hood",
    acres: null,
    operator: "Trinity Fork USA, LLC",
    play: "Barnett Shale",
    field: "Newark, East (Barnett Shale)",
    api: "42-221-86142",
    district: "09",
    wells: 1,
    decimalInterest: 0.001719,
    mvestimate: 540,
    countyAppraised: 220,
    production: { gasMcf: 1955, oilBbl: 0, threeMonthBoe: 0 },
    status: "producing",
    detail: "Newark, East (Barnett Shale) · well 1H",
    weekChangePercent: 0,
  },
  {
    number: "65081",
    name: "Averitt",
    county: "Cass",
    acres: 165,
    operator: "Kestrel Exploration LLC",
    play: "Haynesville/Bossier Shale",
    field: "Wexford (Travis Peak Prorated)",
    api: "42-067-27368",
    district: "06",
    wells: 1,
    decimalInterest: 0.00082906,
    mvestimate: 0,
    countyAppraised: 55,
    production: { gasMcf: 31, oilBbl: 2, threeMonthBoe: 0 },
    status: "inactive",
    detail: "Wexford (Travis Peak Prorated) · well 1",
    weekChangePercent: null,
  },
  {
    number: "267145",
    name: "Smith Gas Unit",
    county: "Bee",
    acres: null,
    operator: "Bluestem Oil and Gas, LP",
    play: "Not classified (source gap)",
    field: "Blanco Creek (Wilcox Massive)",
    api: "42-025-40593",
    district: "02",
    wells: 1,
    decimalInterest: 0.005386,
    mvestimate: 0,
    countyAppraised: 410,
    production: { gasMcf: 58580, oilBbl: 189, threeMonthBoe: 0 },
    status: "inactive",
    detail: "Blanco Creek (Wilcox Massive) · well 1-U · Temp Abandoned",
    weekChangePercent: null,
  },
  {
    number: "508936",
    name: "Smith Gas Unit",
    county: "Bee",
    acres: null,
    operator: "Bluestem Oil and Gas, LP",
    play: "Not classified (source gap)",
    field: "Blanco Creek (Wilcox Massive)",
    api: "42-025-71286",
    district: "02",
    wells: 1,
    decimalInterest: 0.005386,
    mvestimate: 0,
    countyAppraised: 410,
    production: { gasMcf: 26220, oilBbl: 49, threeMonthBoe: 0 },
    status: "inactive",
    detail: "Blanco Creek (Wilcox Massive) · well 5-U · Temp Abandoned",
    weekChangePercent: null,
  },
];

/**
 * THE RECORD THESE LEASES HANG OFF, plus the two portfolio figures that are not
 * derivable from the ten rows above.
 */
export const leaseOwnerRecord = {
  name: "SMITH, RAYMOND E",
  id: "BEE-084213",
  /**
   * The county roll's 2026 total across all ten leases.
   *
   * NOT the sum of the `countyAppraised` column, which comes to $10,590. The
   * prototype prints `~$11,532` in both places it shows a county total, so it
   * is carried as its own figure rather than derived from a column it does not
   * match — and the `~` is the design's own hedge about that. Worth reconciling
   * against `Apprised_Value` when the DB is reachable; deriving it instead
   * would silently move a number the design states twice.
   */
  countyAppraisedTotal: 11532,
  /**
   * Today against the daily value snapshot taken seven days ago. ILLUSTRATIVE:
   * the snapshot service is not connected, and the page says so beneath the
   * figure rather than letting a made-up delta read as measured.
   */
  weekChange: { amount: 140, percent: 0.5 },
  /** The model run behind every MVestimate on the page. */
  modelRun: {
    asOf: "Jul 04, 2026 6:00 AM",
    priceDeck: "PD-2026-06",
    declineModel: "ARPS-v3",
    diSource: "membersclaimedleases.decimal_interest",
  },
} as const;
