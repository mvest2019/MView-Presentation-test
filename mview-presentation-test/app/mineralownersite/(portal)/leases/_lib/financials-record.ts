import { financialsSeries } from "./financials-series";
import { monthLabel } from "./months";

/**
 * THE FINANCIALS PANEL'S STATED FIGURES, AND THE ONE RATIO THAT SCALES THEM.
 *
 * ── THE OWNER'S SHARE IS ONE NUMBER, NOT TEN ──
 *
 * The ten leases carry decimal interests from 1.07% to 5.14%. Weighted by what
 * each one produces, the record comes out at 4.3%, and that single blended
 * figure is what the panel's "Full lease / Your share" switch multiplies by.
 * The per-lease decimals stay on the lease table where they belong; a reader
 * asking "what is MY half of this chart" is asking one question, not ten.
 *
 * ── THE THREE TILE FIGURES ARE STATED, NOT SUMMED ──
 *
 * They are the valuation engine's own outputs — a six-year cash-flow model over
 * a forward price deck, the same engine behind every MVestimate on the lease
 * table. This page cannot recompute them, and it should not try: the monthly
 * series next door is a SHAPE built from filed volumes (see
 * `financials-series.ts`), and adding it up would print whichever total that
 * simplification happened to produce rather than the figure the product stands
 * behind.
 *
 * WHAT A READER CAN STILL CHECK. The gas figure is the lease table's own
 * 28.02M MCF gross, taken down to this record's 4.3% and then netted for what
 * never reaches the sales meter — which is what its caption says it is. The
 * arithmetic is theirs to do, and it lands here.
 */

/** The production-weighted decimal interest across all ten leases. */
export const OWNER_SHARE = 0.043;

/** The owner's share of each headline, in the units the tile prints. */
export const financialsTotals = {
  /** Dollars cleared on every month already filed. */
  cashFiled: 10_190_000,
  /** MCF of gas, net of what never reached the sales meter. */
  gasFiled: 994_000,
  /** Filed months plus the model, to the end of the curve. */
  cashProjection: 14_630_000,
} as const;

/** The last month anybody has filed — every "filed to date" figure stops here. */
export const lastFiledMonth = monthLabel(
  financialsSeries.firstMonth + financialsSeries.lastPostedIndex,
);

export type FinancialsScope = "lease" | "share";

/**
 * Scale a figure into the chosen scope.
 *
 * The stored figures are the OWNER'S, because those are the ones the design
 * states and the ones a reader is here for. The whole-lease view divides back
 * out — so the two scopes can never drift apart the way two hand-kept sets of
 * totals would.
 */
export function inScope(ownerValue: number, scope: FinancialsScope): number {
  return scope === "share" ? ownerValue : ownerValue / OWNER_SHARE;
}

export const SCOPE_COPY: Record<
  FinancialsScope,
  { label: string; caption: string; possessive: string; heading: string }
> = {
  lease: {
    label: "Full lease",
    caption: "everything the ten leases filed, before your decimal is applied",
    possessive: "Lease",
    heading: "the full lease",
  },
  share: {
    label: "Your share",
    caption: `your part of it — a blended ${(OWNER_SHARE * 100).toFixed(1)}% across the record`,
    possessive: "Your",
    heading: "your share",
  },
};
