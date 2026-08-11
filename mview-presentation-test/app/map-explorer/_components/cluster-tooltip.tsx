"use client";

/*
 * The card that appears over a well-count bubble on hover.
 *
 * Purely presentational and non-interactive — `pointer-events-none` matters
 * here: the card sits directly over the bubble it describes, and if it took
 * the pointer it would steal the hover from the very thing being hovered and
 * flicker.
 */

type ClusterTooltipProps = {
  name: string;
  wells: number;
  /** Percentage of the cluster producing oil. */
  oilShare: number;
  /** Screen position of the bubble's top edge, in view-container pixels. */
  at: { x: number; y: number };
};

export function ClusterTooltip({
  name,
  wells,
  oilShare,
  at,
}: ClusterTooltipProps) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 w-max -translate-x-1/2 -translate-y-full rounded-lg border border-mv-line bg-white px-[13px] py-[9px] shadow-mv-lg"
      style={{ left: at.x, top: at.y - 10 }}
    >
      <div className="text-[13.5px] font-bold leading-none text-mv-ink">
        {name} area
      </div>
      <div className="mt-[6px] text-[12.5px] leading-none text-mv-slate">
        {wells.toLocaleString("en-US")} wells · {oilShare}% oil
      </div>
      <div className="mt-[6px] text-[11.5px] leading-none text-mv-muted">
        Click to open this area
      </div>
    </div>
  );
}
