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
 * One line, and wide enough to stay one line: stacking the count over its
 * label wrapped "wells in this area" onto three rows and made a small bar into
 * a block. Everything sits on a single baseline instead.
 */

const CARD_WIDTH = 324;

type AreaSelectionBarProps = {
  /** Wells inside the area. */
  count: number;
  /** Screen position of the area's top edge, in view-container pixels. */
  at: { x: number; y: number };
  onExport: () => void;
  onClear: () => void;
};

export function AreaSelectionBar({
  count,
  at,
  onExport,
  onClear,
}: AreaSelectionBarProps) {
  const { left, tail } = edgeClamped(at.x, CARD_WIDTH);

  return (
    <div
      className="pointer-events-auto absolute z-30 w-[324px] max-w-[88vw] -translate-x-1/2 -translate-y-full"
      style={{ left, top: at.y - 12 }}
    >
      <div className="flex items-center gap-[10px] rounded-xl border border-mv-line bg-white px-[12px] py-[8px] shadow-mv-lg">
        <span
          aria-hidden="true"
          className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
        >
          <SquareDashed size={15} strokeWidth={2} />
        </span>

        <span className="min-w-0 flex-1 truncate leading-none">
          <span className="text-[15px] font-bold tabular-nums text-mv-ink">
            {count.toLocaleString("en-US")}
          </span>
          <span className="text-[12px] text-mv-slate">
            {count === 1 ? " well in area" : " wells in area"}
          </span>
        </span>

        {/* Nothing inside the box means nothing to write: the file would come
            out as a header line on its own. */}
        <button
          type="button"
          onClick={onExport}
          disabled={count === 0}
          className="inline-flex shrink-0 items-center gap-[6px] rounded-lg bg-mv-green-deep px-[11px] py-[7px] text-[12px] font-semibold leading-none text-white enabled:cursor-pointer enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={13} strokeWidth={2.25} aria-hidden="true" />
          Export CSV
        </button>

        <button
          type="button"
          onClick={onClear}
          aria-label="Clear this area"
          title="Clear this area"
          className="grid h-[28px] w-[28px] shrink-0 cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-muted hover:border-mv-red hover:bg-mv-red-bg hover:text-mv-red"
        >
          <X size={13} strokeWidth={2.5} aria-hidden="true" />
        </button>
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
