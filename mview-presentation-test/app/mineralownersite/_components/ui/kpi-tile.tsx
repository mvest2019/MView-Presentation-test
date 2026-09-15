import { ArrowRight } from "lucide-react";
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
 * `icon` PUTS A GLYPH IN FRONT OF THE FIGURE, and it is optional because most
 * rows of these do not want one: six identical grey circles down a page add
 * nothing a reader reads. Where the design asks for them — the well report's
 * headline row — they give a scanning reader a shape to aim at before any word
 * is read. Passing one turns the tile from a stack into a row; the label, the
 * figure and the basis line are unchanged either way.
 *
 * `size` IS THE FIGURE ALONE, and `md` stays the default so the eight places
 * drawn against a 26px figure keep it. `sm` is for a tile carrying an `icon`:
 * forty pixels of glyph and its gutter come out of the same width, and a figure
 * as long as "10.13M MCF" stops reading as one thing when it is a wrap away
 * from being two lines. The label and the basis line do not move — they are
 * already at their floor.
 *
 * `flat` DROPS THE SHADOW, for a tile sitting among cards that have none. The
 * well report's headline row is the case: the four reserve stats and the
 * eighteen wellbore facts under it are plain bordered boxes, and six shadowed
 * tiles above them read as a different kind of object floating over the page.
 * It is a prop rather than a change to the base because the other eight places
 * these appear are still drawn against the shadow.
 *
 * ── `onExplain` PUTS A LINK IN THE CORNER, REVEALED ON HOVER ──
 *
 * `portal.css`'s `.kpi-click` note describes tiles that open a plain-English
 * explainer in a side panel. The panel is that; this is how it is reached, and
 * the shape of the control is the whole decision:
 *
 *   · THE TILE IS NOT THE BUTTON. A 130px-tall card that is one big button
 *     swallows the text inside it — nothing in it can be selected, and a reader
 *     copying a figure out to compare with a statement instead opens a panel.
 *     A figure is for reading; the link beside it is for pressing.
 *
 *   · IT APPEARS ON HOVER AND ON FOCUS. Six standing links down a row of six
 *     tiles is six times the same sentence competing with the figures the row
 *     exists to show. Revealing it on approach keeps the row quiet and still
 *     tells a reader who is looking at one tile that there is more behind it.
 *
 *   · IT IS ALWAYS THERE FOR A READER WHO CANNOT HOVER. On a touch screen — no
 *     hover to give — the link is drawn from the start, and it is in the tab
 *     order either way, so it is never a control only a mouse can find.
 *
 * `locked` opts the FIGURE ALONE into the claimed-state blur — not the label,
 * not the basis line. A claimed-but-unpaid reader should still be able to see
 * what the tile is about and why it is hidden, which is the whole point of
 * `cl-lock` being opt-in per element rather than applied to the tile.
 */

/** The figure's size. See the note above for when `sm` is the right one. */
const FIGURE = {
  md: "text-[26px]",
  sm: "text-[20px]",
} as const;

export function KpiTile({
  label,
  value,
  basis,
  icon,
  size = "md",
  flat = false,
  accent = false,
  locked = false,
  onExplain,
  explainLabel = "How this works",
}: {
  label: ReactNode;
  value: ReactNode;
  basis: ReactNode;
  /** A lucide glyph, already sized. Optional — see the note above. */
  icon?: ReactNode;
  size?: keyof typeof FIGURE;
  /** No drop shadow — see the note above. */
  flat?: boolean;
  /** Opens this figure's explainer. See the note above. */
  onExplain?: () => void;
  /** The corner link's words. Only read when `onExplain` is passed. */
  explainLabel?: string;
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
      className={`group relative rounded-mv border border-mv-line bg-mv-card px-[18px] py-4 ${
        flat ? "" : "shadow-mv"
      } ${accent ? "border-t-[3px] border-t-mv-green" : ""} ${
        onExplain ? "transition-colors hover:border-mv-green/60" : ""
      }`.trim()}
    >
      {onExplain && (
        <button
          type="button"
          onClick={onExplain}
          /* `pr-[18px]`'s worth of inset, level with the label it sits beside.
             `max-w-[55%]` so a long figure and a long link never meet. */
          className="absolute top-[15px] right-[14px] z-10 inline-flex max-w-[55%] cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold text-mv-green-deep opacity-0 transition-opacity group-hover:opacity-100 hover:bg-mv-mint focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-green-deep [@media(hover:none)]:opacity-100"
        >
          <span className="truncate underline decoration-mv-green/50 underline-offset-2">
            {explainLabel}
          </span>
          <ArrowRight aria-hidden="true" className="h-3 w-3 flex-none" />
        </button>
      )}

      <div className={icon ? "flex items-start gap-3.5" : ""}>
        {icon && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-mv-portal-wash text-mv-slate"
          >
            {icon}
          </span>
        )}

        {/* `min-w-0` so a long figure wraps inside the tile rather than pushing
            the icon out of it — a flex child will not shrink without it. */}
        <div className="min-w-0">
          {/* The link overlays this row, so the label keeps clear of it —
              always, not on hover, or the label would reflow under the pointer
              every time the link appeared. */}
          <div
            className={`text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase ${
              onExplain ? "pr-24" : ""
            }`.trim()}
          >
            {label}
          </div>
          <div
            /* The lapsed gate, on every tile's figure — the prototype's
               `.k-val`. `locked` is the narrower claimed gate; see
               `ValueBand`. */
            data-mv-portfolio-figure=""
            className={`mt-1 mb-0.5 leading-tight font-bold tabular-nums ${
              FIGURE[size]
            } ${locked ? portalGate.lockedValue : ""}`.trim()}
          >
            {value}
          </div>
          <div className="text-xs leading-[1.5] text-mv-muted">{basis}</div>
        </div>
      </div>
    </div>
  );
}
