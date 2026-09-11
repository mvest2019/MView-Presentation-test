import type { FinancialsScope } from "../../_lib/financials-record";

/**
 * THE FOUR THINGS THE CHART CAN DRAW, AND WHAT EACH ONE IS CALLED.
 *
 * Data rather than a switch statement in the component, because every mode
 * needs the same five strings — the pill, the heading, the note beside the
 * pills, and a name for each axis — and a component that derives them inline
 * ends up with five parallel conditionals that can disagree.
 *
 * `oil & gas` IS THE ONLY DUAL-AXIS MODE and the only one whose note has to
 * explain itself: gas is measured in thousands of cubic feet and oil in
 * barrels, so a single scale puts the oil line flat along the floor. The other
 * three plot one series against one axis and need no apology.
 */

export type ChartMode = "both" | "gas" | "oil" | "cash";

export interface ChartModeCopy {
  /** The pill. */
  label: string;
  /** The card heading, before the scope is appended. */
  title: string;
  /** The line beside the pills. */
  note: string;
}

export const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: "both", label: "Oil & gas" },
  { value: "gas", label: "Gas only" },
  { value: "oil", label: "Oil only" },
  { value: "cash", label: "Cash flow" },
];

export const CHART_MODE_COPY: Record<ChartMode, ChartModeCopy> = {
  both: {
    label: "Oil & gas",
    title: "Oil and gas",
    note: "MCF on the left, BBL on the right — one scale would flatten the oil",
  },
  gas: {
    label: "Gas only",
    title: "Gas",
    note: "MCF filed each month, on one scale",
  },
  oil: {
    label: "Oil only",
    title: "Oil",
    note: "barrels filed each month, on one scale",
  },
  cash: {
    label: "Cash flow",
    title: "Cash flow",
    note: "gas and oil at the realised deck — not the screen price on the bar above",
  },
};

/** "Oil and gas — your share". The heading always names whose figures these are. */
export function chartTitle(mode: ChartMode, scope: FinancialsScope): string {
  return `${CHART_MODE_COPY[mode].title} — ${
    scope === "share" ? "your share" : "full lease"
  }`;
}
