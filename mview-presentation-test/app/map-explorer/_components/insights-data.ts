/**
 * Static figures behind the Insights panel.
 *
 * Every number here is the mock's. Nothing is derived from the map or the
 * table — this is a stand-in for the aggregate service, and the two will
 * disagree in places (the panel talks about 1.2M wells statewide, the table
 * about the 9,000-well sample) exactly as the mock does.
 */

export const INSIGHTS_HEADER = {
  region: "Texas",
  title: "Texas — all wells",
  chips: ["Statewide", "Oil-leaning", "9,000 sample wells match"],
  meta: "74 counties · 10 operators · drilled 1935–2025",
  trendLabel: "Last 18 months",
} as const;

export const HEADLINE_CARDS = [
  {
    label: "Wells statewide",
    value: "1.2M",
    unit: "wells",
    note: "1,217,270 on record",
    footLabel: "sample drawn",
    footValue: "26,000 dots",
  },
  {
    label: "Producing",
    value: "515k",
    unit: "wells",
    note: "514,812 reporting volumes",
    footLabel: "of wells statewide",
    footValue: "42%",
  },
  {
    label: "Operators",
    value: "10",
    unit: "",
    note: "named in the sample",
    footLabel: "Hilcorp",
    footValue: "5%",
  },
  {
    label: "Texas BOE",
    value: "72B",
    unit: "boe",
    note: "cumulative to date",
    footLabel: "latest month",
    footValue: "338M boe",
    sparkline: true,
  },
] as const;

/** Jun 2024 → Apr 2026, monthly. Values are raw bbl / Mcf. */
export const PRODUCTION_MONTHS = [
  "Jun '24", "Jul '24", "Aug '24", "Sep '24", "Oct '24", "Nov '24",
  "Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25",
  "Jun '25", "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25",
  "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26",
];

export const PRODUCTION_GAS = [
  1.10, 1.07, 1.05, 1.03, 1.0, 0.97, 0.95, 1.36, 1.34, 1.31, 1.28, 1.25,
  1.22, 1.19, 1.16, 1.13, 1.1, 1.07, 1.04, 1.01, 0.98, 0.95, 0.92,
].map((value) => value * 1e9);

export const PRODUCTION_OIL = [
  0.16, 0.16, 0.155, 0.15, 0.15, 0.148, 0.146, 0.2, 0.198, 0.196, 0.194,
  0.192, 0.19, 0.188, 0.186, 0.184, 0.182, 0.18, 0.178, 0.176, 0.174, 0.172,
  0.17,
].map((value) => value * 1e9);

export const PRODUCTION_ROLLING = [
  0.43, 0.43, 0.42, 0.42, 0.42, 0.41, 0.41, 0.44, 0.47, 0.48, 0.47, 0.46,
  0.45, 0.44, 0.44, 0.43, 0.42, 0.42, 0.41, 0.4, 0.4, 0.39, 0.38,
].map((value) => value * 1e9);

export const PRODUCTION_FOOTER = {
  wells: "1.2M wells statewide",
  oil: "Cumulative oil 41B bbl",
  gas: "Cumulative gas 185B mcf",
} as const;

export const WELL_MIX = {
  oilShare: 53,
  legend: [
    { label: "Oil wells", value: "640k", color: "#2e8f6d" },
    { label: "Gas wells", value: "577k", color: "#d1584f" },
    { label: "Counties", value: "74", color: "#4a7fbf" },
    { label: "Operators", value: "10", color: "#8b5cf6" },
  ],
  status: [
    { label: "Producing", value: "515k", share: 100 },
    { label: "Shut-In Producer", value: "347k", share: 67 },
    { label: "Inactive", value: "172k", share: 33 },
    { label: "Plugged", value: "172k", share: 33 },
    { label: "Permitted", value: "10k", share: 2 },
  ],
} as const;

export const TOP_OPERATORS = {
  rows: [
    { label: "Hilcorp", value: "56k", share: 100 },
    { label: "Pioneer", value: "49k", share: 87 },
    { label: "XTO Energy", value: "43k", share: 77 },
    { label: "Occidental", value: "40k", share: 71 },
    { label: "EOG Resources", value: "35k", share: 63 },
    { label: "Exxon", value: "33k", share: 59 },
    { label: "Apache", value: "31k", share: 55 },
  ],
  footer: { label: "All other operators", value: "863k", unit: "wells" },
} as const;

/** Wells drilled, in five-year steps from 1935. */
export const WELLS_DRILLED = [
  2000, 3000, 4500, 6000, 7500, 9000, 11000, 13000, 16000, 20000, 30000,
  45000, 80000, 140000, 225000, 230000, 120000, 60000,
];

export const WELLS_DRILLED_START_YEAR = 1935;

export const TOP_COUNTIES = [
  { label: "Hutchinson", value: "72k", share: 100 },
  { label: "Midland", value: "70k", share: 97 },
  { label: "Dimmit", value: "63k", share: 87 },
  { label: "Garza", value: "61k", share: 85 },
  { label: "Gonzales", value: "58k", share: 80 },
] as const;

export const TOTALS = [
  { label: "Wells", qualifier: "(on record)", value: "1,217,270", unit: "wells" },
  { label: "Oil", qualifier: "(to date)", value: "41,191,364,841", unit: "bbl" },
  { label: "Gas", qualifier: "(to date)", value: "185,432,526,742", unit: "mcf" },
  { label: "Water", qualifier: "(to date)", value: "107,097,548,587", unit: "bbl" },
  { label: "Total BOE", qualifier: "(to date)", value: "72,096,785,965", unit: "boe" },
] as const;

export const REPORTED_THROUGH = "May 2026";
