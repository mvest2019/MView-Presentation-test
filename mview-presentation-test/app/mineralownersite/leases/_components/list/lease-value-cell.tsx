import { Badge } from "../../../_components/ui/badge";
import { formatDollars } from "../../_lib/lease-format";
import type { LeaseRecord } from "../../_lib/lease-types";

/**
 * THE MONEY COLUMN, and the two columns that argue with it.
 *
 * These three cells are one file because they implement ONE RULE between them —
 * the $0-fallback and the county-gap flag — and splitting them across the table
 * row would put half a policy in each half of a `<tr>`.
 *
 * ── THE RULE ──
 *
 * A producing lease shows its MVestimate. An inactive lease has an MVestimate of
 * $0, and $0 beside a lease somebody owns reads as "worthless"; so the cell
 * shows the county's appraised value instead, in green, labelled "county
 * appraised value" so nobody mistakes it for our projection. Those dollars are
 * NEVER summed into the portfolio total — see `lease-totals.ts`.
 *
 * ── THE FLAG ──
 *
 * Our forward projection typically runs ~1.9× the county's lagging tax value; a
 * gap of roughly 3× or more earns a "Worth a look" marker. It is NOT a warning
 * about somebody's money, and the closing notice on the page says so in those
 * words — it usually means our model sees upside the tax roll has not caught up
 * with. Where the two figures land close together the cell says so instead
 * ("These agree ✓"), which is the more reassuring and rarer case.
 */

/**
 * Gap at which the county figure earns a flag.
 *
 * ⚠ THE DESIGN STATES ONE THRESHOLD AND APPLIES ANOTHER. Its closing notice on
 * this page says "Gaps of roughly 3× or more get a Worth a look flag", but its
 * markup flags Smith 305892 at 2.48× and Cedar Bend 480329 at 2.45×. Taken at
 * 3× those two leases lose a flag the design shows them with, so the applied
 * rule is treated as the operative one and 2.4 is where it actually sits — the
 * notice's "roughly" is doing the reconciling. Worth confirming with whoever
 * owns the calibration study before this reaches live data: it is the difference
 * between flagging two of ten leases and flagging none of them.
 */
/*
 * EXPORTED, because the closing notice on this page STATES this threshold in
 * prose ("Gaps of roughly N× or more get a Worth a look flag") while these cells
 * APPLY it. The prototype hard-coded "3×" in that sentence and flagged at 2.45×
 * in its markup, so the page contradicted itself. Reading the constant means the
 * sentence cannot drift from the rule again.
 */
export const WORTH_A_LOOK_RATIO = 2.4;

/**
 * Below this the two figures are close enough to call agreement.
 *
 * NOT IN THE DESIGN, which hard-codes "These agree ✓" onto the one lease where
 * it happens to be true (Ledbetter, 1.05×). A literal on one row is not a rule,
 * and with live data every lease needs to fall into some band — so the case is
 * expressed as a threshold. 1.25 is chosen to sit well clear of the ~1.9× median
 * gap the calibration study reports, so "agree" means genuinely close and not
 * merely typical.
 */
const AGREEMENT_RATIO = 1.25;

export function LeaseEstimateCell({ lease }: { lease: LeaseRecord }) {
  if (lease.mvestimate === 0) {
    return (
      <>
        <strong className="font-bold text-mv-green-deep">
          {formatDollars(lease.countyAppraised)}
        </strong>
        <span className="block text-[10px] font-normal whitespace-nowrap text-mv-muted">
          county appraised value
        </span>
      </>
    );
  }

  return (
    <>
      {/* 16.5px bold with tabular figures — the design gives the money column
          its own scale so the eye finds it in a sixteen-column row.

          NO `cl-lock` ON THIS SPAN. The claimed gate is applied to the whole
          CELL in `lease-table-row.tsx`, matching the prototype's own
          column-scoped rule (`#lsMainWrap tbody td.mv-cell`) — which covers the
          inactive rows and the totals row as well, not only the seven earning
          ones. Marking the figure here instead would leave four cells sharp. */}
      <span className="text-[16.5px] font-bold tabular-nums">
        {formatDollars(lease.mvestimate)}
      </span>
      <span className="block text-[9.5px] font-semibold tracking-[0.02em] text-mv-green-deep">
        earning · 6-yr projection
      </span>
    </>
  );
}

export function LeaseCountyValueCell({ lease }: { lease: LeaseRecord }) {
  return (
    <>
      {formatDollars(lease.countyAppraised)}
      <span className="mt-0.5 block font-normal">
        <CountyGapMarker lease={lease} />
      </span>
    </>
  );
}

function CountyGapMarker({ lease }: { lease: LeaseRecord }) {
  /* An inactive lease's money column already IS this county figure, so a gap
     marker would be comparing the number with itself. */
  if (lease.mvestimate === 0) {
    return (
      <Badge tone="blue" size="xs">
        $0-fallback shown
      </Badge>
    );
  }

  /* Guard the division: a lease with no county value on the roll cannot have a
     ratio, and `x / 0` would print "Worth a look · Infinity×". */
  if (lease.countyAppraised === 0) {
    return (
      <span className="text-[10px] whitespace-nowrap text-mv-muted">
        no county value on the roll
      </span>
    );
  }

  const ratio = lease.mvestimate / lease.countyAppraised;

  if (ratio >= WORTH_A_LOOK_RATIO) {
    return (
      <Badge tone="flag" size="xs">
        {/* One decimal place, and never "2.0×" — `Number()` drops the trailing
            zero so a clean multiple prints as "10×". */}
        Worth a look · {Number(ratio.toFixed(1))}×
      </Badge>
    );
  }

  if (ratio <= AGREEMENT_RATIO) {
    return (
      <Badge tone="mint" size="xs">
        These agree ✓
      </Badge>
    );
  }

  return (
    <span className="text-[10px] whitespace-nowrap text-mv-muted">
      {Number(ratio.toFixed(1))}× the county value
    </span>
  );
}
