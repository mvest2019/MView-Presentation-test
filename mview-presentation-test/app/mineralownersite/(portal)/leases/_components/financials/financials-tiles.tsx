import { KpiTile } from "../../../../_components/ui/kpi-tile";
import {
  financialsTotals,
  inScope,
  lastFiledMonth,
  SCOPE_COPY,
  type FinancialsScope,
} from "../../_lib/financials-record";
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
 */
export function FinancialsTiles({ scope }: { scope: FinancialsScope }) {
  const owner = SCOPE_COPY[scope].possessive;

  return (
    <div className="mb-4 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      <KpiTile
        accent
        /* The claimed-but-unpaid blur covers the money and leaves the volume
           sharp — the same split the value band makes. */
        locked
        label={`${owner} cash · filed to date`}
        value={formatCompactDollars(
          inScope(financialsTotals.cashFiled, scope),
        )}
        basis={`through ${lastFiledMonth}`}
      />
      <KpiTile
        label={`${owner} gas · filed to date`}
        value={`${formatCompactVolume(inScope(financialsTotals.gasFiled, scope))} MCF`}
        basis="net of what never reached the sales meter"
      />
      <KpiTile
        locked
        label={`${owner} cash · whole projection`}
        value={formatCompactDollars(
          inScope(financialsTotals.cashProjection, scope),
        )}
        basis="filed months plus the model, to the end of the curve"
      />
    </div>
  );
}
