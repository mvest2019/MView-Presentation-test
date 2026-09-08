/*
 * What the Completion summary still has no endpoint for.
 *
 * Everything the service answers — the identity, the lease, the wellbore, the
 * dates, the production and the analytics — comes from
 * `/wells/{api}/summary` and `/wells/{api}/production` and is mapped in
 * `well-summary-fields.ts`. The reserve and cohort comparisons have gone the same
 * way — `/wells/{api}/insights` computes them, notes and all. What is left is
 * the two labels inside the wellbore picture that no response carries.
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
