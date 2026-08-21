/*
 * What the Completion summary still has no endpoint for.
 *
 * Everything the service answers — the identity, the lease, the wellbore, the
 * dates, the production and the analytics — comes from
 * `/wells/{api}/summary` and `/wells/{api}/production` and is mapped in
 * `well-summary-fields.ts`. What is left here is the part of the Insights page
 * the API does not cover yet: the reserve and cohort comparisons, the written
 * read, and the two labels inside the wellbore picture.
 *
 * The permit side of this file is gone — `/wells/{api}/permit` answers all of
 * it, and the permit's summary is written by the model.
 */

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
