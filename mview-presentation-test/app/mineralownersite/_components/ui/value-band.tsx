import type { ReactNode } from "react";

import { portalGate } from "./portal-gating";

/**
 * THE DARK VALUE BAND — `portal.css`'s `.pf-strip` / `.pf-cell` as Tailwind.
 *
 * The portfolio's headline figures on one dark card, pinned directly under the
 * page title so the dollars are the first thing read on any route that has them.
 *
 * ── THE THREE LINES ALIGN BY SUBGRID, NOT BY FIXED HEIGHTS ──
 *
 * Five stats of different label lengths have to share three baselines, or the
 * row reads as ragged — logged against the design as OWNER-49 ("the numbers and
 * text are bouncing around"). That was first fixed with a `min-h` on each of
 * the three lines, and the label's was 45px: three lines' worth.
 *
 * IT NEVER NEEDED THREE. Measured across widths, these labels are one line from
 * 1024px up and two lines between about 640 and 820 — never three. So on every
 * desktop the band carried roughly thirty pixels of reserved-and-empty space
 * between each label and its figure, which is the gap this replaces.
 *
 * `grid-rows-subgrid` does the same job without the number: each cell shares the
 * band's three rows, so the label row is exactly as tall as the tallest label
 * ACTUALLY PRESENT at that width — no dead space at one line, still aligned at
 * two. Nothing to re-measure when a stat is renamed.
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
      /*
       * `[display:grid]` AND NOT `grid`, WHICH IS THE WHOLE REASON THIS BAND
       * WORKS ON A PHONE.
       *
       * `dashboard-reference.css` styles `.grid` as one of its OWN layout
       * helpers, and under 768px it carries:
       *
       *   .mv-ref-app .app-body .grid { grid-template-columns: minmax(0,1fr)
       *                                 !important }
       *
       * Tailwind's `grid` utility is the same class name, so the band matched
       * it and every phone got one column — five tiles stacked into a 500px
       * tower above the page. The arbitrary property emits `display:grid`
       * under a class name the reference sheet does not know, so the band's own
       * `auto-fit` decides again. `!important` in an earlier cascade layer is
       * the alternative and it would have to guess this element's template.
       *
       * 140, NOT 150 OR 170. `auto-fit` caps at the number of stats, so nothing
       * changes at the widths where five already fit — the floor only decides
       * when a tile stops wrapping onto a row of its own. 140 is what puts TWO
       * across a 375px phone rather than one.
       */
      className={`[display:grid] grid-cols-[repeat(auto-fit,minmax(140px,1fr))] overflow-hidden rounded-mv text-white shadow-mv-lg bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))] ${className}`.trim()}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          /* `auto-fit` with a 170px floor wraps this into two rows on a tablet
             and five columns on a desktop with no media query — and
             `grid-rows-subgrid` is what keeps the three lines aligned across
             whichever cells end up side by side. */
          className="row-span-3 [display:grid] grid-rows-subgrid border-r border-b border-white/10 px-4 pt-3 pb-2.5 last:border-r-0 sm:px-5 sm:pt-[15px] sm:pb-[13px]"
        >
          <div className="text-[10.5px] font-bold tracking-[0.09em] text-mv-on-head-soft uppercase">
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
            className={`mt-1 flex items-baseline gap-[7px] text-[21px] leading-tight font-bold tabular-nums sm:text-[26px] ${
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
