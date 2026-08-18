"use client";

import { Download, SquareDashed, X } from "lucide-react";

import { edgeClamped } from "./tooltip-edge";

/*
 * The card that rides above a drawn area: how many wells fall inside it, and
 * the two things you can do with them.
 *
 * Purely presentational. The rectangle itself is not here — it is an Esri
 * graphic on the map, so it stays pinned to the ground when you pan or zoom.
 * This only has to be told where the top of that rectangle currently is.
 *
 * The count and the actions sit on separate rows. On one row they competed for
 * a width that had to hold "526,627 wells in area", a button and a badge — and
 * the count, the only part that changes, was what got truncated.
 */

const CARD_WIDTH = 306;

type AreaSelectionBarProps = {
  /** Wells inside the area. */
  count: number;
  /** True while this is the box the tool drew for you, not one you drew. */
  sample?: boolean;
  /** Screen position of the area's top edge, in view-container pixels. */
  at: { x: number; y: number };
  onExport: () => void;
  onClear: () => void;
};

export function AreaSelectionBar({
  count,
  sample,
  at,
  onExport,
  onClear,
}: AreaSelectionBarProps) {
  const { left, tail } = edgeClamped(at.x, CARD_WIDTH);

  return (
    <div
      className="pointer-events-auto absolute z-30 w-[306px] max-w-[88vw] -translate-x-1/2 -translate-y-full"
      style={{ left, top: at.y - 12 }}
    >
      <div className="overflow-hidden rounded-xl border border-mv-line bg-white shadow-mv-lg">
        {/* ---------------- what is in the box ---------------- */}
        <div className="flex items-center gap-[10px] px-[13px] pb-[10px] pt-[11px]">
          <span
            aria-hidden="true"
            className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
          >
            <SquareDashed size={16} strokeWidth={2} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px] font-bold leading-none tabular-nums text-mv-ink">
              {count.toLocaleString("en-US")}
            </span>
            <span className="mt-[5px] block text-[11px] leading-none text-mv-muted">
              {count === 1 ? "well in this area" : "wells in this area"}
            </span>
          </span>

          {sample && (
            <span className="shrink-0 self-start rounded bg-mv-mint px-[7px] py-[4px] text-[9px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
              Sample
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-mv-line px-[13px] py-[10px]">
          {/* Nothing inside the box means nothing to write: the file would come
              out as a header line on its own. */}
          <button
            type="button"
            onClick={onExport}
            disabled={count === 0}
            className="inline-flex flex-1 items-center justify-center gap-[7px] rounded-lg bg-mv-green-deep px-[12px] py-[8px] text-[12.5px] font-semibold leading-none text-white enabled:cursor-pointer enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} strokeWidth={2.25} aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-lg border border-mv-line px-[12px] py-[8px] text-[12.5px] font-semibold leading-none text-mv-slate hover:border-mv-red hover:bg-mv-red-bg hover:text-mv-red"
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
            {/* Closing the sample is not clearing your own work, and the word
                should not suggest it is. */}
            {sample ? "Dismiss" : "Clear"}
          </button>
        </div>
      </div>

      {/* The tail, pointing back down at the rectangle. */}
      <span
        aria-hidden="true"
        style={{ left: tail }}
        className="absolute top-full h-[9px] w-[9px] -translate-x-1/2 -translate-y-[5px] rotate-45 border-b border-r border-mv-line bg-white"
      />
    </div>
  );
}
