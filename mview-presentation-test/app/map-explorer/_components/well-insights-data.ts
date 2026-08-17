/*
 * The numbers behind the single-well summary.
 *
 * Static, and the same for whichever well is clicked: none of it is in the
 * map API yet — no production history, no wellbore geometry, no filings. The
 * header takes the real well's identity from the click; everything below it
 * is this file. Replace it wholesale when a well-detail endpoint exists.
 */

/** Twenty-four months of oil, in bbl — the shape the mock's chart shows. */
export const WELL_OIL_SERIES = [
  1250, 1310, 1290, 1420, 1520, 1470, 1380, 1490, 1320, 1300, 1180, 1210, 1120,
  1050, 980, 1010, 940, 900, 860, 880, 820, 800, 180, 990,
];

/** The same months of gas, in mcf. */
export const WELL_GAS_SERIES = [
  545, 520, 528, 534, 560, 512, 505, 520, 498, 505, 470, 462, 455, 470, 448,
  442, 430, 425, 410, 402, 395, 388, 120, 405,
];

export const WELL_MONTHS = [
  "Feb '24", "Apr '24", "Jun '24", "Aug '24", "Oct '24", "Dec '24",
  "Feb '25", "Apr '25", "Jun '25", "Aug '25", "Oct '25", "Dec '25",
];

export const WELL_HEADLINE = [
  {
    label: "Cumulative BOE",
    value: "285k",
    unit: "boe",
    note: "284,900 to date",
    foot: "vs. prior 12 months",
    delta: "▼ -26.7%",
    down: true,
  },
  {
    label: "Oil produced",
    value: "272k",
    unit: "bbl",
    note: "39 bbl/d last month",
    foot: "vs. prior 12 months",
    delta: "▼ -26.9%",
    down: true,
  },
  {
    label: "Gas produced",
    value: "80k",
    unit: "mcf",
    note: "13 mcf/d last month",
    foot: "vs. prior 12 months",
    delta: "▼ -22.6%",
    down: true,
  },
  {
    label: "12-month trend",
    value: "-26.7%",
    unit: "",
    note: "vs. prior 12 months",
    foot: "Trend direction",
    delta: "Declining",
    down: true,
  },
];

export const WELL_STREAM_MIX = {
  oilShare: 95,
  rows: [
    { label: "Oil", value: "272k bbl", colour: "#12a13f" },
    { label: "Gas", value: "80k mcf", colour: "#e2231a" },
    { label: "Water", value: "1.1M bbl", colour: "#2f4fd8" },
    { label: "GOR", value: "296 scf/bbl", colour: "#8b5cf6" },
  ],
  peak: "20k – 1k boe",
};

export const WELL_BORE = {
  kind: "Horizontal",
  surface: "SURFACE · 291 ft GL",
  formation: "CLEARFORK",
  tvd: "TVD 6,941 ft",
  td: "TD 18,940 ft",
  lateral: "Lateral 11,500 ft",
  dates: [
    { label: "Spud", value: "Jan '20" },
    { label: "Completed", value: "Mar '20" },
    { label: "First prod.", value: "Apr '20" },
    { label: "Last rep.", value: "Jan '26" },
  ],
};

export const WELL_LOCATION = [
  { label: "Latitude", value: "32.38243° N" },
  { label: "Longitude", value: "101.95799° W" },
  { label: "Survey", value: "J POITEVENT" },
  { label: "Blk / Sec", value: "41 / 19" },
];

export const WELL_LEASE = {
  operator: "Sabine Production",
  operatorMeta: "P-5 425673 · Corpus Christi, TX",
  rows: [
    { label: "Lease", value: "BROWN ESTATE" },
    { label: "RRC lease no.", value: "90330" },
    { label: "Field", value: "KERMIT (SAN ANDRES)" },
    { label: "Acreage", value: "1,200 acres" },
    { label: "Wells on lease", value: "8" },
  ],
};

export const WELL_ACTIVITY = [
  {
    date: "Jan 01, 2026",
    title: "Shut-in status filed",
    detail: "Well reported shut-in; annual W-3C on file.",
    tone: "amber" as const,
  },
  {
    date: "Apr 24, 2020",
    title: "First production reported",
    detail: "Initial month reported 18,850 bbl oil and 4,943 mcf gas.",
    tone: "blue" as const,
  },
  {
    date: "Mar 21, 2020",
    title: "Completion report filed",
    detail: "Form W-2 / G-1 filed; lateral of 11,500 ft at 18,940 ft TD.",
    tone: "green" as const,
  },
];

export const WELL_TOTALS = [
  { label: "Total BOE", qualifier: "(to date)", value: "284,900", unit: "boe" },
  { label: "Oil", qualifier: "(to date)", value: "271,515", unit: "bbl" },
  { label: "Gas", qualifier: "(to date)", value: "80,311", unit: "mcf" },
  { label: "Water", qualifier: "(to date)", value: "1,101,983", unit: "bbl" },
  { label: "GOR", qualifier: "(to date)", value: "296", unit: "scf/bbl" },
];

export const WELL_UPDATED = "Jan 01, 2026";
