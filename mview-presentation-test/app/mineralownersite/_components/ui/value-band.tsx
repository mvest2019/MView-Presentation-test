import type { ReactNode } from "react";

import { portalGate } from "./portal-gating";

/**
 * THE DARK VALUE BAND — `portal.css`'s `.pf-strip` / `.pf-cell` as Tailwind.
 *
 * The portfolio's headline figures on one dark card, pinned directly under the
 * page title so the dollars are the first thing read on any route that has them.
 *
 * THE THREE FIXED HEIGHTS ARE THE DESIGN, NOT PADDING. `min-h` on the label, the
 * figure and the caption is what makes five stats of different lengths share
 * three baselines. Without them the labels wrapped to one, two or three lines,
 * every figure sat at a different height, and the row read as ragged — logged
 * against the design as OWNER-49 ("the numbers and text are bouncing around")
 * and fixed there by exactly these three rules.
 *
 * `emphasis` COLOURS THE LEAD FIGURE RATHER THAN ENLARGING IT. Same size as its
 * four neighbours, brand green instead of white — the other half of that same
 * fix. A larger figure broke the shared baseline it was meant to lead.
 */

export interface ValueBandStat {
  label: string;
  value: ReactNode;
  /** A smaller trailing qualifier inside the figure — "of 10", "(+0.5%)". */
  qualifier?: ReactNode;
  /** The honesty line. Required: see `KpiTile`'s `basis`. */
  caption: ReactNode;
  emphasis?: boolean;
  /** Blur this figure while the record is claimed but unpaid. */
  locked?: boolean;
}

export function ValueBand({
  stats,
  className = "",
}: {
  stats: ValueBandStat[];
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap rounded-mv text-white shadow-mv-lg bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))] ${className}`.trim()}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          /* `flex-1` with a 150px floor is what wraps this into two rows on a
             tablet and five columns on a desktop with no media query. */
          className="flex min-w-[150px] flex-1 flex-col border-r border-white/10 px-5 pt-[15px] pb-[13px] last:border-r-0"
        >
          <div className="min-h-[45px] text-[10.5px] font-bold tracking-[0.09em] text-mv-on-head-soft uppercase">
            {stat.label}
          </div>
          <div
            /*
             * TWO SEPARATE GATES, AND THEY CATCH DIFFERENT THINGS.
             *
             * `data-mv-portfolio-figure` is the LAPSED gate: every figure on
             * this band covers all ten leases, and Ryan's rule is that an
             * all-ten number blurs while nine of them are locked. It is on all
             * five cells unconditionally, which is what `.pf-val` does in the
             * prototype.
             *
             * `cl-lock` is the CLAIMED gate and is opt-in per cell, because
             * that state hides exactly one thing — the MVestimate money — and
             * leaves the county roll, the lease count and the county count
             * sharp. See `portalGate.lockedValue`.
             */
            data-mv-portfolio-figure=""
            className={`mt-1 flex min-h-[30px] items-baseline gap-[7px] text-[26px] leading-tight font-bold tabular-nums ${
              stat.emphasis ? "text-mv-green" : ""
            } ${stat.locked ? portalGate.lockedValue : ""}`.trim()}
          >
            {stat.value}
            {stat.qualifier && (
              <span className="text-sm font-semibold text-mv-on-head-soft">
                {stat.qualifier}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] leading-[1.45] text-mv-portal-band-sub">
            {stat.caption}
          </div>
        </div>
      ))}
    </div>
  );
}
