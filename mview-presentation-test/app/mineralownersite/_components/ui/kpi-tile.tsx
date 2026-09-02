import type { ReactNode } from "react";

import { portalGate } from "./portal-gating";

/**
 * THE PORTAL'S KPI TILE — `portal.css`'s `.kpi` / `.k-label` / `.k-val` /
 * `.k-sub`.
 *
 * One figure, its label above and its caveat below. The caveat is not optional
 * in this product and the prop is named `basis` to say why it is there: every
 * number on a lease page is either measured, derived or modelled, and the tile's
 * job is to print which. A KPI with no basis line is how "≈ $4,390" gets read as
 * an amount somebody will be paid.
 *
 * `accent` draws the design's 3px green top rule, which marks the one tile in a
 * row that is the actual answer.
 *
 * `locked` opts the FIGURE ALONE into the claimed-state blur — not the label,
 * not the basis line. A claimed-but-unpaid reader should still be able to see
 * what the tile is about and why it is hidden, which is the whole point of
 * `cl-lock` being opt-in per element rather than applied to the tile.
 */

export function KpiTile({
  label,
  value,
  basis,
  accent = false,
  locked = false,
}: {
  label: ReactNode;
  value: ReactNode;
  basis: ReactNode;
  accent?: boolean;
  locked?: boolean;
}) {
  return (
    <div
      /*
       * `data-mv-kpi` IS THE HOST FOR TWO CAPTIONS THIS COMPONENT NEVER PRINTS.
       * `portal.css` appends one line to a stat tile per funnel state — "What
       * it's worth unlocks with your free 7-day trial" when the account is
       * claimed but never trialed, "Portfolio totals cover all 10 leases —
       * Premium" when it has lapsed — as a `::after` on the tile. The claimed
       * one only fires on a tile that actually contains a `cl-lock` figure, so
       * a tile with nothing withheld stays silent. Without this attribute the
       * Tailwind tile is invisible to both rules and neither caption appears.
       */
      data-mv-kpi=""
      className={`rounded-mv border border-mv-line bg-mv-card px-[18px] py-4 shadow-mv ${
        accent ? "border-t-[3px] border-t-mv-green" : ""
      }`.trim()}
    >
      <div className="text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase">
        {label}
      </div>
      <div
        /* The lapsed gate, on every tile's figure — the prototype's `.k-val`.
           `locked` is the narrower claimed gate; see `ValueBand`. */
        data-mv-portfolio-figure=""
        className={`mt-1 mb-0.5 text-[26px] leading-tight font-bold tabular-nums ${
          locked ? portalGate.lockedValue : ""
        }`.trim()}
      >
        {value}
      </div>
      <div className="text-xs leading-[1.5] text-mv-muted">{basis}</div>
    </div>
  );
}
