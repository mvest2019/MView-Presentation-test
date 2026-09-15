"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
 * `onExplain` MAKES THE WHOLE TILE A BUTTON, which is what `portal.css`'s
 * `.kpi-click` note describes: the reference's tiles open a plain-English
 * explainer in a side panel. Pass it and the tile becomes focusable, announces
 * as a button, and says so on hover; leave it off and the tile is a `div` with
 * no affordance, because a tile that looks pressable and does nothing is worse
 * than one that never offered.
 *
 * IT OPENS ON HOVER, AFTER A PAUSE. The pause is the whole of it: a panel that
 * opens the instant a pointer crosses a tile fires on its way to somewhere
 * else, and a reader moving across a row of six would open six. `HOVER_MS` of
 * stillness is what separates "looking at this" from "passing over it", and the
 * timer is dropped the moment the pointer leaves. Click and Enter still open it
 * with no delay, so a reader who knows what they want does not wait, and a
 * keyboard or touch reader — neither of which hovers — is not locked out.
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

/** How long a pointer must rest on a tile before its explainer opens. */
const HOVER_MS = 450;

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
  accent?: boolean;
  locked?: boolean;
}) {
  const Element = onExplain ? "button" : "div";

  /* The hover-intent timer. A ref rather than state because nothing on screen
     depends on it — re-rendering the tile on every pointer move would be work
     done for no picture. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = (): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  return (
    <Element
      {...(onExplain
        ? {
            type: "button" as const,
            onClick: () => {
              cancel();
              onExplain();
            },
            /* `pointerenter`, not `mouseenter`: a touch fires the mouse events
               too, and a tap that opens the panel on the click AND again 450ms
               later opens it twice. A pointer event says which it was. */
            onPointerEnter: (event: React.PointerEvent) => {
              if (event.pointerType !== "mouse") return;
              cancel();
              timer.current = setTimeout(onExplain, HOVER_MS);
            },
            onPointerLeave: cancel,
            onPointerDown: cancel,
          }
        : {})}
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
      className={`rounded-mv border border-mv-line bg-mv-card px-[18px] py-4 ${
        flat ? "" : "shadow-mv"
      } ${accent ? "border-t-[3px] border-t-mv-green" : ""} ${
        onExplain
          ? "cursor-pointer text-left transition-colors hover:border-mv-green hover:bg-mv-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          : ""
      }`.trim()}
    >
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
          <div className="text-[11px] font-bold tracking-[0.08em] text-mv-muted uppercase">
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
    </Element>
  );
}
