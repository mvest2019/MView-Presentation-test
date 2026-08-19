/*
 * The single-well summary, as data.
 *
 * All of it is static and all of it is the same for whichever well is clicked:
 * none of production history, reserves, decline or filings is in the map API
 * yet. Only the top strip is real, and only the parts the map already knows —
 * the API number, the county, the status.
 *
 * Replace this file wholesale when a well-detail endpoint exists.
 */

/** When the summary was last read, as the header prints it. */
export const SUMMARY_UPDATED = "May 12, 2025 10:30 AM";

export const WELL_HEADER = {
  wellNumber: "1",
  api: "42-255-38043",
  county: "Karnes",
  status: "Producing",
  performance: "Good",
};

/*
 * The permit record, as data.
 *
 * The other half of the summary: `recordType` on a well is either "Permit" or
 * "Completion", and this is what the permit filing carries. Static like the
 * rest — only the identity strip is real — so it is the same well's permit
 * whichever well is clicked.
 */
export const PERMIT_SUMMARY = {
  status: "Approved",
  filingPurpose: "New Drill",
  leaseWell: [
    { label: "Lease Name", value: "Ogle" },
    { label: "County", value: "Archer" },
    { label: "District", value: "09" },
  ],
  typeDirection: [
    { label: "Well Type", value: "Permitted Location" },
    { label: "Direction", value: "Vertical" },
    { label: "New Permit", value: "No" },
  ],
  permitInformation: [
    { label: "Filing Purpose", value: "New Drill" },
    { label: "Permit Date", value: "05-08-2014" },
  ],
  operatorField: {
    left: [
      { label: "Operator", value: "Glen D. Gonzenbach Llc (310223)" },
      { label: "Field Name", value: "Arrowhead (Caddo)" },
    ],
    right: [
      { label: "Reservoir", value: "Barnett Shale" },
      { label: "Field No.", value: "03900500" },
    ],
  },
  coordinates: [
    { label: "Surface", value: "33.720538, -98.494098" },
    { label: "Bottom-Hole", value: "33.720538, -98.494098" },
  ],
  nearestWell: { distance: "0.75891 miles", direction: "South" },
};

/*
 * The permit as the record itself has it: one row, one header.
 *
 * The cards above are the readable version — this is the filing, so it keeps
 * the record's own column names and its own order. `tone: "green"` marks a
 * value worth seeing at a glance.
 */
export const PERMIT_TABLE: {
  label: string;
  value: string;
  tone?: "green";
}[] = [
  { label: "API Number", value: "42-255-38339" },
  { label: "Well No.", value: "A1H" },
  { label: "Lease Name", value: "Falks Gas Unit 1" },
  { label: "Status No.", value: "911413" },
  { label: "Permit Status", value: "Approved", tone: "green" },
  { label: "Filing Purpose", value: "New Drill" },
  { label: "New Permit", value: "No" },
  { label: "Submit Date", value: "2025-10-27" },
  { label: "Issued Date", value: "2025-11-07" },
];

/*
 * The written read on the permit — five things worth knowing, generated.
 *
 * `**bold**` marks the figures inside a sentence and `` `code` `` marks a
 * field or table name in the basis line; `ai-summary.tsx` renders both. Static
 * like the rest of this file: when a summariser exists, this is the shape to
 * hand back.
 */
export const PERMIT_AI_SUMMARY = {
  subtitle: "five things worth knowing about this well",
  title: "Falks Gas Unit 1 · A1H",
  context: "Approved New Drill permit · Sugarkane (Eagle Ford) · Karnes County",
  generated: "2026-08-19 12:46",
  lead: "An approved New Drill permit for the longest lateral yet proposed on a lease that has already produced 5.19 MMBOE — still undrilled 285 days into a closing permit window.",
  findings: [
    {
      title: "This is infill on proven rock, not a wildcat",
      badge: "Strength",
      tone: "green" as const,
      body: "Ten wells already produce on this same lease, having recovered **951,829 bbl** of oil and **25.4 Bcf** of gas — about **5.19 MMBOE** — with eight still flowing a combined **5,782 BOE per month**. The permit's target, Eagle Ford, is the better of the two producing intervals here: the eight Eagle Ford wells average **536 MBOE** against **449 MBOE** for the two Austin Chalk wells.",
    },
    {
      title: "The longest lateral ever proposed on this lease",
      badge: "Design",
      tone: "blue" as const,
      body: "At **7,473 ft** of surface-to-bottom-hole displacement, A1H exceeds the previous best on the lease (C5H at 6,995 ft) and runs **25% above** the 5,989 ft lease average. It heads north-west on a **320.5° azimuth** as the westernmost of a five-well pad — A1H through A5H share one surface location within 75 ft and fan out to **36,387 ft** of combined new reservoir contact.",
    },
    {
      title: "Approved quickly, but sitting undrilled",
      badge: "Watch",
      tone: "amber" as const,
      body: "The permit cleared in **11 days**, close to the field average of 11.2 and the Karnes County average of 10.6. Since then **285 days** have passed with no producing wellbore linked to it, leaving roughly **445 days** of the standard two-year permit validity. All five pad permits carry identical dates, so the whole programme burns its window together.",
    },
    {
      title: "The nearest-well figure above understates reality",
      badge: "Data issue",
      tone: "red" as const,
      body: "The record reports the nearest well at **1.02564 miles** west. In fact a producing Eagle Ford horizontal on this very lease — 42-255-32279 (B2H), which has made 131,988 bbl and 3.64 Bcf — sits just **259 ft** away, and **seven completions** are closer than the well the record names. The stored distance is internally consistent, so the calculation appears to run against a restricted record set rather than all completions.",
    },
    {
      title: "Strong neighbourhood, but a real cancellation base rate",
      badge: "Balance",
      tone: "slate" as const,
      body: "Of 588 completions within five miles, **66% still produce** and **69%** of rated wells score Good with only four rated Poor. Against that, **24.4%** of the 336 permits ever filed in Sugarkane ended Cancelled or Abandoned, and two of the ten lease wells are already inactive — including the closest one. Scaling the most recent Eagle Ford phase's per-foot intensity to this lateral implies roughly **108 Mbbl oil** and **3.0 Bcf gas**, though that is an analogue rather than a reserves estimate.",
    },
  ],
  basis:
    "Built from `Api_No 42-255-38339` in `GeoMapPortal.WellGeoData` where `Record_Type` is `Permit`, joined by `lease_name` and location to `Completion` records — the only record type in the collection that carries production and reserves. Laterals, azimuth, review time and distances are computed from the stored coordinate and date fields; the two-year validity is the standard RRC W-1 convention, not a stored value. Permit records hold no depth, acreage or production of their own, so all performance figures come from the joined completions.",
};

/** The six figures across the top. */
export const WELL_METRICS = [
  { label: "Last Month Oil", value: "10,826", unit: "BBL", kind: "oil" },
  { label: "Last Month Gas", value: "19,117", unit: "MCF", kind: "gas" },
  { label: "Next Month Est Oil", value: "9,467", unit: "BBL", kind: "oil" },
  { label: "Next Month Est Gas", value: "16,718", unit: "MCF", kind: "gas" },
  { label: "Reserve Oil", value: "75,000", unit: "BBL", kind: "reserve" },
  { label: "Reserve Gas", value: "130,000", unit: "MCF", kind: "reserve" },
] as const;

export const WELL_INFORMATION = [
  { label: "Well Type", value: "Oil" },
  { label: "Direction", value: "Horizontal" },
  { label: "Well Age", value: "1 year" },
  { label: "Reservoir/Play", value: "Eagle Ford Shale" },
];

export const LEASE_INFORMATION = [
  { label: "Lease Name", value: "Metz-Korth-Rru Usw A" },
  { label: "Lease No.", value: "13071" },
  { label: "Acres", value: "5,618.53" },
  { label: "District", value: "02" },
];

export const OPERATOR_INFO = {
  label: "Operator",
  value: "Burlington Resources O & G Co Lp (109335)",
};

export const DEPTH_GEOMETRY = [
  { label: "Start Depth", value: "11,490 ft" },
  { label: "True Vertical", value: "13,360 ft" },
  { label: "End Depth", value: "25,289 ft" },
  { label: "Nearest Well", value: "0.009 miles" },
];

export const WELL_ACTIVITY = [
  { label: "Filing Type", value: "New Well" },
  { label: "Filing Purpose", value: "Drilling" },
  { label: "Spud Date", value: "12-03-2024" },
  { label: "First Production", value: "03-19-2025" },
  { label: "Completion Date", value: "03-2025" },
  { label: "Last Production", value: "04-2026" },
];

export const WELL_LOCATION = [
  { label: "Latitude", value: "52.38143° N" },
  { label: "Longitude", value: "97.65799° W" },
  { label: "Survey", value: "J POITEVENT" },
  { label: "Blk / Sec", value: "41 / 19" },
];

export const WELLBORE = {
  kind: "Horizontal",
  surface: "Surface · 341 ft GL",
  formation: "Clearfork",
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

/** Decline diagnostics: what the rate curve anchors reveal. */
export const DECLINE_ROWS = [
  { label: "Last month oil", value: "10,826.53", unit: "BBL", tone: "ink" },
  { label: "Next month est oil", value: "9,467.70", unit: "BBL", tone: "ink" },
  { label: "Month-on-month step", value: "-12.55", unit: "%", tone: "down" },
  { label: "Implied annual effective", value: "80.0", unit: "%", tone: "ink" },
  { label: "Last month gas", value: "19,117.48", unit: "MCF", tone: "ink" },
  { label: "Next month est gas", value: "16,718.12", unit: "MCF", tone: "ink" },
  { label: "Gas MoM step", value: "-12.55", unit: "%", tone: "down" },
  { label: "Oil ÷ gas step ratio", value: "1.0000", unit: "", tone: "ink" },
  { label: "Life GOR", value: "1,369", unit: "SCF/BBL", tone: "ink" },
  { label: "Last month GOR", value: "1,766", unit: "SCF/BBL", tone: "ink" },
  { label: "GOR trend to date", value: "+29", unit: "%", tone: "up" },
  { label: "Forecast GOR", value: "1,766", unit: "frozen", tone: "ink" },
  { label: "R/P on last month", value: "0.58", unit: "yr · 7 months", tone: "down" },
  { label: "Reserve ÷ integral of curve", value: "93.4", unit: "%", tone: "ink" },
] as const;

/** Reserve integrity: stated depletion against well age. */
export const RESERVE_INTEGRITY = {
  bars: [
    { label: "under 2 yr", value: 86.99, count: "n = 273" },
    { label: "2 – 4 yr", value: 83.06, count: "n = 315" },
    { label: "4 – 7 yr", value: 91.44, count: "n = 440" },
    { label: "7 – 11 yr", value: 96.25, count: "n = 660" },
    { label: "11 yr +", value: 96.77, count: "n = 1,000" },
  ],
  note: "A well cannot be 87% depleted in its first two years. Yet that is the median for the 273 youngest Karnes wells. The curve should rise monotonically with age; that most steps drop by 3–4 per cent, then plateau, says the reserve is being extrapolated from a model that is cheapest early in life — so young wells get truncated EURs.",
};

/** Cohort EUR — the tell. Median booked EUR by age. */
export const COHORT_EUR = {
  bars: [
    { label: "under 2 yr", value: 216457, display: "216,457" },
    { label: "2 – 4 yr", value: 339225, display: "339,225" },
    { label: "4 – 7 yr", value: 295609, display: "295,609" },
    { label: "7 – 11 yr", value: 203980, display: "203,980" },
    { label: "11 yr +", value: 256109, display: "256,109" },
  ],
  notes: [
    "Newest wells are booked with the smallest EURs. The under-2-yr median EUR is 26.7% below the 4–7 yr cohort — the opposite of reality. Since 2024+ Karnes wells average 7,880 ft of lateral against ~5,300 ft for mature levels. Longer wells, smaller booked EUR: the model, not the rock.",
    "This well's own alone (411,720 BBL at 14 months) already exceeds the median lifetime EUR of every cohort in this table.",
  ],
};

/** The written read, and the cards under it. */
export const INSIGHT_SUMMARY = {
  headline:
    "METZ-KORTH-RRU USW A WELL 1 is a 14-month-old, top-decile Eagle Ford producer whose booked reserves are almost certainly understated. It has recovered 411,720 BBL oil and 563,797 MCF gas — 505,686 BOE — from a 13,599 ft lateral, already clearing the p90 of its own 2024+ vintage cohort (367,957 BBL, n = 281) and exceeding the median lifetime EUR of 11-year-old Karnes wells (256,109 BBL). Yet the operator books only 75,440 BBL remaining, implying an EUR of 487,160 BBL and 84.5% depletion at 14 months old — not physically credible for a well this young.",
  cards: [
    {
      tone: "green" as const,
      title: "Exceptional early performance",
      body: "411,720 BBL in 14 months against a vintage-cohort median of 181,363 BBL — 2.27× the current rate of 12,100 BOE/mo sits at p8 of that cohort.",
    },
    {
      tone: "red" as const,
      title: "The reserve model breaks on young wells",
      body: "Across 5,319 Karnes wells the median well under 2 years old is booked at 86.99% depleted, and most recent months' median EUR (216,457 BBL) sits 26.7% lower than the 4–7 yr cohort's (295,609 BBL) — despite far longer modern laterals.",
    },
    {
      tone: "blue" as const,
      title: "Independent EUR cross-check",
      body: "553k – 1,024k BBL. Mature (7 yr+) Karnes horizontals recover p25 39.2 / p60 54.5 / p75 71.3 BBL per lateral foot. At 13,599 ft that brackets EUR of 553,000 – 1,024,000 BBL mid-case 741,000. The nearest EUR implies just 35.8 BBL/ft — below the mature p25. On the mid-case this well is ~50% depleted, not 84.5%.",
    },
    {
      tone: "blue" as const,
      title: "Long lateral, diminishing per-foot return",
      body: "Pad sibling 42-255-38041 shares identical lease-mates (6,090 of 6,216 math-well groups, 96.6%). This well is clean — sole well at lease 13071 — but 4 of its 8 nearest offsets are not.",
    },
    {
      tone: "green" as const,
      title: "Six-well co-developed cube",
      body: "All 6 wells within 148 ft at surface, all first production Mar 2025, 7,912 downhole ft. Of 6 on cumulative oil but 4th of 6 on current rate and remaining reserves — it is declining faster than its cube-mates.",
    },
    {
      tone: "red" as const,
      title: "25.4% of the collection has lease-level, not well-level, production",
      body: "24,554 of 96,711 reporting wells share identical production figures with their lease-mates. This well is clean — sole well at lease 13071 — but 4 of its 8 nearest offsets are not.",
    },
  ],
};

/*
 * Monthly oil and gas, history then forecast.
 *
 * Generated rather than typed out: eight years is ninety-six points a stream,
 * and the shape is what matters — a sharp ramp, a peak in the first year, then
 * a hyperbolic decline that flattens out. Deterministic, so the chart does not
 * change between renders.
 */
export const PRODUCTION_START_YEAR = 2025;
export const PRODUCTION_END_YEAR = 2032;

/** Months of history before the forecast takes over. */
export const PRODUCTION_HISTORY_MONTHS = 11;

export type ProductionPoint = { month: number; oil: number; gas: number };

export const PRODUCTION_SERIES: ProductionPoint[] = Array.from(
  { length: (PRODUCTION_END_YEAR - PRODUCTION_START_YEAR + 1) * 12 },
  (_, month) => {
    // Ramp over the first two months, then decline hyperbolically.
    const ramp = Math.min(1, (month + 0.35) / 2);
    const decline = 1 / (1 + 0.55 * Math.max(0, month - 2));
    // A small repeating wobble while the well is still being reported.
    const wobble =
      month < PRODUCTION_HISTORY_MONTHS
        ? 1 + 0.07 * Math.sin(month * 1.7)
        : 1;

    return {
      month,
      oil: Math.round(57_000 * ramp * decline * wobble),
      gas: Math.round(74_000 * ramp * decline * wobble),
    };
  },
);
