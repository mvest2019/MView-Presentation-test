import { Badge } from "../../../../_components/ui/badge";
import { countyGap } from "../../_lib/county-gap";
import { formatCompactDollars, formatDollars } from "../../_lib/lease-format";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE TWO MONEY COLUMNS, AND THE MARKER THAT COMPARES THEM.
 *
 * They are one file because they are one idea: the page shows both numbers and
 * never quietly rescales either, so the cell that prints the county roll is also
 * the cell that says how far our figure sits from it. Splitting them would put
 * the comparison somewhere neither number is.
 *
 * EACH FIGURE CARRIES ITS BASIS UNDERNEATH — "earning · projection" against the
 * MVestimate, the agreement marker against the roll. The money column is the
 * one a reader scans first and it is the one most easily misread as an offer.
 */

export function LeaseEstimateCell({ lease }: { lease: LeaseRecord }) {
  return (
    <>
      {/* Its own type scale: the design gives the money column a larger, bolder
          figure so the eye finds it in an eleven-column row. */}
      <span className="text-[15.5px] font-bold tabular-nums">
        {formatCompactDollars(lease.mvestimate)}
      </span>
      <span className="mt-0.5 block text-[10px] font-normal whitespace-nowrap text-mv-muted">
        earning · projection
      </span>
    </>
  );
}

export function LeaseCountyValueCell({ lease }: { lease: LeaseRecord }) {
  const gap = countyGap(lease);

  return (
    <>
      <span className="tabular-nums">{formatDollars(lease.countyAppraised)}</span>
      <span className="mt-1 block font-normal">
        {gap.kind === "agree" && (
          <Badge tone="mint" size="xs">
            These agree ✓
          </Badge>
        )}

        {gap.kind === "worth-a-look" && (
          <Badge tone="flag" size="xs">
            {/* THE WORDS ARE CAPITALISED AND THE MULTIPLE IS NOT. `uppercase`
                on the whole chip turned "0.4x" into "0.4X", which reads as part
                of the label rather than as the number it is. */}
            <span className="tracking-[0.04em] uppercase">Worth a look ·</span>{" "}
            {gap.ratio}x
          </Badge>
        )}

        {gap.kind === "no-roll-value" && (
          <span className="text-[10px] whitespace-nowrap text-mv-muted">
            no county value on the roll
          </span>
        )}
      </span>
    </>
  );
}
