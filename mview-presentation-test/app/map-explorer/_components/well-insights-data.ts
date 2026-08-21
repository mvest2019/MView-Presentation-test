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
