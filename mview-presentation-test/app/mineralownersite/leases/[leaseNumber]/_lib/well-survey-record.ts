/**
 * THE DIRECTIONAL SURVEY — what was filed, how far it is trusted, and the
 * grades that decide whether a path gets drawn at all.
 *
 * ── THE PANEL'S SUBJECT IS ITS OWN RELIABILITY ──
 *
 * A wellbore path is the most persuasive thing this module can draw and the
 * easiest to draw wrongly: a column swapped at import — north for east, feet for
 * metres — yields a plausible-looking line. So the record carries the closure
 * against the Railroad Commission's own bottom-hole coordinate, the station
 * count, and a grade scale in which two of eight grades are drawn without
 * qualification and one is *never* plotted.
 *
 * ── WHY THE EXAMPLE IS SOMEONE ELSE'S WELL ──
 *
 * Well 5L has no survey on file, so there is nothing to plot for it. Rather than
 * leave the tier empty or straighten 5L into a guess, the design plots DEFTONES
 * 2H — a real, fully surveyed horizontal on the four-well unit — and labels it
 * as what a survey looks like when one exists. See `well-survey-paths.ts`.
 */

/** One row of the A-to-N grade scale. */
export interface SurveyGrade {
  code: string;
  /** "verified", "failed read" — absent for the C–E band, which has no one word. */
  label?: string;
  meaning: string;
  /** Grade G: a straight chord between two points is not a survey. */
  neverPlotted?: boolean;
}

export interface WellSurveyRecord {
  /** The surveyed well the projections belong to. */
  example: { name: string; api: string; stations: string };
  /** How far the example's survey is trusted, and why. */
  trust: {
    grade: string;
    closure: string;
    stations: string;
    measuredDepth: string;
    geometry: string;
  };
  grades: SurveyGrade[];
  /** Wellbores drawn without qualification, of those exported so far. */
  drawnWithoutCaveat: { drawn: string; total: string; counties: string };
}

export const smithWellSurvey: WellSurveyRecord = {
  example: { name: "DEFTONES 2H", api: "42-255-35369", stations: "115" },

  trust: {
    grade: "A · verified",
    closure: "16.1 ft",
    stations: "115",
    measuredDepth: "15,335 ft",
    geometry: "horizontal",
  },

  grades: [
    { code: "A", label: "verified", meaning: "survey closes on the RRC bottom hole" },
    { code: "B", label: "confirmed", meaning: "reads cleanly, closes within tolerance" },
    {
      code: "C–E",
      meaning: "plausible, unverified or suspect — shown with the caveat",
    },
    {
      code: "F",
      label: "failed read",
      meaning: "the document exists and we could not read it",
    },
    {
      code: "G",
      label: "straight chord",
      meaning: "a straight line between two points is not a survey",
      neverPlotted: true,
    },
    {
      code: "H",
      label: "none on file",
      meaning: "nothing was filed — the case here",
    },
  ],

  drawnWithoutCaveat: { drawn: "3,744", total: "13,166", counties: "five" },
};
