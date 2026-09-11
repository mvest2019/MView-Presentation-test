import { seededScatter } from "./seeded-scatter";

/**
 * WHAT A UNIT CLEARED, MONTH BY MONTH.
 *
 * ── GAS IS SEASONAL AND OIL IS NOT, WHICH IS WHY THEY ARE MODELLED DIFFERENTLY ──
 *
 * Gas is burnt for heat, so its forward strip peaks in January and bottoms out
 * in May: the twelve figures below run from $4.54 in the depth of winter to
 * $2.55 in the spring, which is the ordinary shape of a North American gas
 * curve rather than anything about this record. Oil is a globally traded barrel
 * with no such cycle, so it is one number.
 *
 * THIS IS WHY THE CASH COLUMN MOVES WHEN THE VOLUME COLUMN BARELY DOES. A
 * forecast month can show volumes down two percent and cash up eight, and that
 * is not an error in either column — it is January. Without the seasonality the
 * twelve projected rows all printed the same change, which read as a bug in the
 * table rather than as the smooth decline it actually was.
 *
 * ── FILED MONTHS ARE PRICED AS SETTLEMENTS, NOT AS THE STRIP ──
 *
 * The strip is what the market expects. What a month actually cleared is the
 * strip plus basis, plus where in the month the gas was sold, minus whatever
 * the gatherer took — noisy in a way no curve captures. So a month that has
 * been filed is priced at the strip with scatter on it, and a month that has
 * not is priced at the strip clean. The line between the two is the same line
 * the chart draws as solid and dashed.
 *
 * EVERY FIGURE HERE IS NET, not the screen price on the pinned bar above the
 * page. That bar is the front-month settlement at Henry Hub and Cushing; this
 * is what reaches an owner after gathering, treating and the basis differential,
 * which on this record is most of a dollar.
 */

/** Dollars per MCF by calendar month, January first. */
const GAS_STRIP = [
  4.54, 3.94, 2.92, 2.59, 2.55, 2.66, 3.61, 3.43, 3.19, 3.1, 3.34, 4.13,
] as const;

/** Dollars per barrel, flat across the year — see the note above. */
export const OIL_PRICE = 84;

/** How far a settled month strays from the strip it was struck against. */
const SETTLEMENT_SCATTER = 0.2;

/**
 * The gas price for one month.
 *
 * `monthOfYear` is 0 for January. `filed` says whether this month has been
 * reported — a filed month gets the settlement scatter, a modelled one does
 * not.
 */
export function gasPriceAt(
  monthOfYear: number,
  index: number,
  filed: boolean,
): number {
  const strip = GAS_STRIP[monthOfYear];
  return filed ? strip * (1 + SETTLEMENT_SCATTER * seededScatter(index, 3)) : strip;
}

/** One month's revenue, in the units the volumes are already in. */
export function cashAt({
  gas,
  oil,
  monthOfYear,
  index,
  filed,
}: {
  gas: number;
  oil: number;
  monthOfYear: number;
  index: number;
  filed: boolean;
}): number {
  return gas * gasPriceAt(monthOfYear, index, filed) + oil * OIL_PRICE;
}
