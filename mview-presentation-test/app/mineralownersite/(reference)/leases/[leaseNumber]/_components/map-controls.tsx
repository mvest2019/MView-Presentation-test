"use client";

import { House } from "lucide-react";

/**
 * THE CONTROLS BOTH LEASE MAPS PUT ON TOP OF THE VIEW.
 *
 * ── RECENTRE SITS IN THE STACK WITH THE ZOOM PAIR ──
 *
 * It was a worded button in the opposite corner, which made it look like a page
 * control that happened to be sitting on a map rather than one of the map's own
 * tools. The three things that move the view now sit together: home, in, out.
 *
 * THE OFFSET IS ARITHMETIC, NOT A GUESS. Esri puts its zoom widget 30px off the
 * bottom (clear of its attribution bar) and it is 64px tall, so its top edge is
 * at 94; this sits 8px above that. Both maps call `view.ui.move("zoom",
 * "bottom-right")`, which is what puts the pair there in the first place.
 *
 * THE LABEL SURVIVES THE MISSING TEXT. `aria-label` is what a screen reader
 * reads and `title` is what a mouse reader gets on hover, so dropping the word
 * from the face loses the affordance to neither.
 */
export function MapResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Reset view"
      title="Reset view"
      className="absolute right-[15px] bottom-[102px] z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] border border-mv-line bg-mv-card text-mv-slate shadow-mv transition-colors hover:bg-mv-bg hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      <House aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

/**
 * One distance pill. The count is the number of OTHER wells inside that ring,
 * so a reader knows what widening the view will show them before they click.
 */
export function RingPill({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-[13px] py-[6px] text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
        selected
          ? "border-mv-ink bg-mv-ink text-white"
          : "border-mv-line bg-mv-card text-mv-slate hover:bg-mv-bg"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
            selected ? "bg-white/20 text-white" : "bg-mv-portal-wash text-mv-slate"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** The tooltip's own size, which `placeTip` needs before it has been drawn. */
export const TIP = { width: 258, height: 248 } as const;

export interface MapTip {
  left: number;
  top: number;
  title: string;
  subtitle: string;
  rows: { label: string; value: string }[];
}

/**
 * WHERE THE TOOLTIP GOES, GIVEN WHERE THE POINTER IS.
 *
 * BESIDE THE POINTER, NOT UNDER IT: a tooltip drawn under the cursor covers the
 * thing it describes, and on a map that thing is the well. Sixteen pixels to
 * the right, lifted slightly, is clear of both the marker and the cursor.
 *
 * IT FLIPS RATHER THAN OVERFLOWS. A well near the right-hand edge would push
 * 258px of card off the map, so past the halfway point it is drawn to the LEFT
 * of the pointer instead. Vertically it is clamped rather than flipped, because
 * a tooltip that jumps above the cursor reads as a different tooltip.
 *
 * `TIP.height` IS MEASURED, NOT ESTIMATED — it was guessed at 200 once and the
 * rendered card is 248, which left the bottom clamp short by 48px and pushed
 * the last row through the floor of the map for a well sitting low in the view.
 */
export function placeTip(
  x: number,
  y: number,
  node: HTMLDivElement | null,
): { left: number; top: number } {
  const width = node?.clientWidth ?? 0;
  const height = node?.clientHeight ?? 0;
  const gap = 16;
  const edge = 8;

  const right = x + gap;
  const left = right + TIP.width > width - edge ? x - gap - TIP.width : right;
  const floor = Math.max(edge, height - TIP.height - edge);

  return {
    left: Math.max(edge, left),
    top: Math.min(Math.max(edge, y - 24), floor),
  };
}

/**
 * The hovered well's detail, in the portal's card rather than the map vendor's.
 *
 * ESRI'S OWN POPUP IS OFF ON BOTH MAPS. It is a widget: a title bar with dock
 * and collapse buttons, a "Zoom to" action, and one line of content under a
 * divider. Three of those four are chrome for tools these maps do not offer —
 * there is nothing to dock to, the ring pills already do the zooming, and the
 * collapse button collapses a panel one line tall.
 *
 * `pointer-events-none` IS THE WHOLE DIFFERENCE BETWEEN A TOOLTIP AND A PANEL.
 * It follows the pointer being over the MARKER, so it must never become a thing
 * the pointer can be over itself — it would otherwise swallow a hover meant for
 * the map underneath and leave itself stuck open. It is also why there is no
 * close button: a tooltip is dismissed by moving away.
 */
export function MapHoverTip({ tip }: { tip: MapTip }) {
  return (
    <div
      role="tooltip"
      aria-label={tip.title}
      style={{ left: tip.left, top: tip.top, width: TIP.width }}
      className="pointer-events-none absolute z-10 rounded-mv border border-mv-line bg-mv-card shadow-mv-lg"
    >
      <div className="border-b border-mv-line px-3.5 py-3">
        <p className="text-[13.5px] leading-tight font-bold">{tip.title}</p>
        <p className="mt-1 text-[10.5px] font-bold tracking-[0.08em] text-mv-muted uppercase">
          {tip.subtitle}
        </p>
      </div>

      <dl className="px-3.5 py-2.5">
        {tip.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline gap-3 border-b border-mv-portal-hairline py-[7px] last:border-b-0"
          >
            <dt className="text-[11px] text-mv-muted">{row.label}</dt>
            <dd className="ml-auto text-right text-[11.5px] font-semibold tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
