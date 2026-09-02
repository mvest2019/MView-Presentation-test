/**
 * THE DECLINE-CURVE ENGINE'S PUBLISHED RECORD — for the one lease that has one.
 *
 * ── WHY THIS IS A REAL UNIT'S RECORD, NOT THIS LEASE'S ──
 *
 * The figures below are the engine's actual published output for CROW A well 2H
 * (RRC lease 266110, Karnes Co.) — the same real pilot unit the production chart
 * draws. The Smith demo lease is fictional and has no engine record, so rather
 * than invent a curve for it the panel prints the real one and says whose it is.
 * On a wired lease report this record comes from the engine keyed by the lease.
 *
 * That is also why only ONE lease carries it. The design gives the panel to the
 * Smith route alone: the other nine reports have no engine document to read, and
 * a decline curve is the single easiest thing on this module to fake convincingly.
 *
 * ── EVERYTHING HERE IS A STRING ──
 *
 * These are transcribed engine outputs, not inputs to our arithmetic: "1 (one
 * well, one completion)", "0.9% of gas · 0.8% of oil", "nRMSE 0.979 · grade E".
 * Storing them as numbers would mean re-deciding their formatting, their units
 * and their precision in the component, and we have no basis to re-round a
 * figure someone else published. Numbers this module DOES compute — the reserves
 * left, the share, the percentage of life remaining — come from `report.recovery`
 * and the lease, not from here.
 */

/** One label/value line in a figure card. `proOnly` adds the `tier-p` gate. */
export interface DeclineFigureRow {
  label: string;
  value: string;
  /** The quiet parenthetical after the value — "(one well, one completion)". */
  note?: string;
  /** Professional tier only: the oil legs and the engine's own null grade. */
  proOnly?: boolean;
}

/** One row of the backtest band table the grades are read off. */
export interface DeclineGradeBand {
  grade: string;
  recentNrmse: string;
  n: string;
  medianError: string;
  p90: string;
  overFifty: string;
}

export interface DeclineCurveRecord {
  /** "CROW A well 2H" — the long form, for the first mention. */
  engineUnit: string;
  /** "CROW A 2H" — the short form used in card titles. */
  engineUnitShort: string;
  /** "RRC lease 266110, Karnes Co." */
  rrcNote: string;
  /** The published grade, or the honest absence of one. */
  gradeChip: string;
  /** "Gas still to come" — the P90 / P50 / P10 spread and what is already out. */
  remaining: DeclineFigureRow[];
  /** "How the curve was built" — the fit's own inputs and caps. */
  build: DeclineFigureRow[];
  /** "How well the curve tracked history" — OUR backfit, not the engine's. */
  backfit: DeclineFigureRow[];
  /** The expected case, repeated in the warning prose. */
  expectedCase: string;
  /** How depleted this unit is — the reason the grade is what it is. */
  depleted: string;
  /** Median miss for the worst band, from the backtest. */
  bandMedianMiss: string;
  /** Months in the recent window that carried scoreable volume, of 24. */
  scoreableMonths: string;
  /** Shut-in months set aside from scoring but not from fitting. */
  setAsideMonths: string;
  /** How far the expected case ran under held-back history. */
  biasUnder: string;
  bands: DeclineGradeBand[];
  /** Automatic model selection, measured and rejected. */
  autoSelection: { auto: string; arps: string };
  /** The published document this panel reads, and its as-of dates. */
  document: string;
  reSolved: string;
  recordTouched: string;
  engineState: string;
  /** Searchable leases in the model workbench, and how many carry a full fit. */
  workbench: { leases: string; baked: string; worked: string; href: string };
}

export const crowA2HCurve: DeclineCurveRecord = {
  engineUnit: "CROW A well 2H",
  engineUnitShort: "CROW A 2H",
  rrcNote: "RRC lease 266110, Karnes Co.",
  gradeChip: "Confidence grade: pending — not published for this lease",

  remaining: [
    { label: "Low case (P90)", value: "8,911 mcf" },
    { label: "Expected (P50)", value: "11,676 mcf" },
    { label: "High case (P10)", value: "14,443 mcf" },
    { label: "Produced to date", value: "1,238,007 / 1,249,684 mcf (99.1%)" },
    { label: "Oil — P90 / P50 / P10", value: "1,525 / 1,996 / 2,467 bbl", proOnly: true },
    { label: "Oil produced to date", value: "241,652 / 243,647 bbl (99.2%)", proOnly: true },
  ],

  build: [
    { label: "Drilling campaigns found", value: "1", note: "(one well, one completion)" },
    { label: "Posted months used", value: "162", note: "(from Oct 2012)" },
    { label: "Months forecast forward", value: "76", note: "(within the 2× history cap)" },
    { label: "Life remaining", value: "0.9% of gas · 0.8% of oil" },
    { label: "Engine's published grade", value: "pending — fit is null", proOnly: true },
  ],

  backfit: [
    { label: "Gas — last 24 months", value: "nRMSE 0.979 · grade E" },
    { label: "Gas — all history", value: "nRMSE 0.661 · grade D" },
    { label: "Oil — last 24 months", value: "nRMSE 0.248 · grade B", proOnly: true },
    { label: "Oil — all history", value: "nRMSE 0.481 · grade C", proOnly: true },
  ],

  expectedCase: "11,676 mcf",
  depleted: "99.1%",
  bandMedianMiss: "70%",
  scoreableMonths: "18",
  setAsideMonths: "Eight",
  biasUnder: "11% under",

  bands: [
    { grade: "A", recentNrmse: "< 0.15", n: "23", medianError: "13%", p90: "56%", overFifty: "17%" },
    { grade: "B", recentNrmse: "0.15–0.30", n: "46", medianError: "25%", p90: "76%", overFifty: "24%" },
    { grade: "C", recentNrmse: "0.30–0.50", n: "33", medianError: "26%", p90: "85%", overFifty: "21%" },
    { grade: "D", recentNrmse: "0.50–0.85", n: "23", medianError: "49%", p90: "97%", overFifty: "43%" },
    { grade: "E", recentNrmse: "≥ 0.85", n: "15", medianError: "70%", p90: "3945%", overFifty: "73%" },
  ],

  autoSelection: { auto: "39% MdAPE", arps: "Arps' 31%" },

  document: "02_266110",
  reSolved: "1 Feb 2026",
  recordTouched: "12 May 2026",
  engineState: "ok",

  workbench: {
    leases: "323,069",
    baked: "202",
    worked: "GALLO ROJO A",
    href: "https://find-your-lease.vercel.app/",
  },
};
