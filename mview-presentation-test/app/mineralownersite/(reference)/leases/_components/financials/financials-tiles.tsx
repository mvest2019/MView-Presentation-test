import { KpiTile } from "../../../../_components/ui/kpi-tile";
import type { FinancialsTotals } from "../../_api/leases-api";
import { SCOPE_COPY, type FinancialsScope } from "../../_lib/financials-record";
import {
  formatCompactDollars,
  formatCompactVolume,
} from "../../_lib/lease-format";

/**
 * THE THREE HEADLINES — cash filed, gas filed, cash projected.
 *
 * THE ORDER IS PAST, PAST, FUTURE. Two figures a reader can in principle check
 * against their own statements, then one that is a model output — and the third
 * tile is the only one of the three that is not a fact, which is why it says
 * "plus the model" in its own basis line rather than leaving the word off and
 * looking like the other two.
 *
 * THE FIRST TILE CARRIES THE GREEN RULE because cash filed to date is the
 * answer to the question people open a Financials tab with. The other two are
 * the context that makes it readable: what produced it, and what is left.
 *
 * EVERY LABEL LEADS WITH THE SCOPE — "Your cash" or "Lease cash" — so a tile
 * screenshotted out of the panel still says whose money it is. That is the same
 * reason `KpiTile` makes its basis line a required prop.
 *
 * THE FIGURES ARRIVE AS PROPS, already at the chosen scope. They used to be one
 * stored set scaled by a blended decimal; the service now sends both scopes, so
 * the panel picks a set and hands it over. That also means these three tiles
 * cannot be showing a different scope from the chart beneath them — there is
 * only one place the choice is made.
 */
export function FinancialsTiles({
  scope,
  totals,
  filedThrough,
}: {
  scope: FinancialsScope;
  /** The three headlines, at `scope` — see `_api/leases-api.ts`. */
  totals: FinancialsTotals;
  /** `"June 2026"` — the last month anybody has filed. */
  filedThrough: string;
}) {
  const owner = SCOPE_COPY[scope].possessive;

  return (
    /* ── THREE ACROSS ON A PHONE, BY SCROLLING ──
     *
     * Stacked, the three tiles ran to about 380px before the chart even began —
     * a whole screen of headline with nothing under it. A horizontal strip puts
     * the first one in view at full size and the second half in view behind it,
     * which is what tells a reader there are more without a control saying so.
     *
     * `[display:flex]` AND NOT `flex`, for the reason the grid card records at
     * length: `dashboard-reference.css` styles `.flex` as its own helper and
     * sets `flex-wrap: wrap` on it below 768px, which would wrap these back
     * into a stack and leave the scroller with nothing to scroll.
     *
     * The children are sized from here with `[&>*]`, because `KpiTile` takes no
     * `className` — and it should not grow one for a layout decision its caller
     * is making.
     *
     * Everything reverts at `sm`: two columns, then three at `lg`, no scroller,
     * no snapping.
     */
    <div className="mb-4 [display:flex] snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [&>*]:min-w-[250px] [&>*]:shrink-0 [&>*]:snap-start sm:mb-4 sm:[display:grid] sm:snap-none sm:grid-cols-2 sm:gap-[18px] sm:overflow-visible sm:pb-0 sm:[&>*]:min-w-0 lg:grid-cols-3">
      <KpiTile
        accent
        /* The claimed-but-unpaid blur covers the money and leaves the volume
           sharp — the same split the value band makes. */
        locked
        label={`${owner} cash · filed to date`}
        value={formatCompactDollars(totals.cashFiled)}
        basis={`through ${filedThrough}`}
      />
      <KpiTile
        label={`${owner} gas · filed to date`}
        value={`${formatCompactVolume(totals.gasFiled)} MCF`}
        basis="net of what never reached the sales meter"
      />
      <KpiTile
        locked
        label={`${owner} cash · whole projection`}
        value={formatCompactDollars(totals.cashProjection)}
        basis="filed months plus the model, to the end of the curve"
      />
    </div>
  );
}
