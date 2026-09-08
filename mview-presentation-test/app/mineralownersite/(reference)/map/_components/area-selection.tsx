"use client";

import { Download, SquareDashed, X } from "lucide-react";

import { edgeClamped } from "./tooltip-edge";

/*
 * The card that rides above a drawn area: what is inside it, how big it is, and
 * the two things you can do with it.
 *
 * Purely presentational. The rectangle itself is not here — it is an Esri
 * graphic on the map, so it stays pinned to the ground when you pan or zoom.
 * This only has to be told where the top of that rectangle currently is.
 *
 * Three bands, top to bottom: what it is, what is in it, what you can do. The
 * count and the actions cannot share a row — on one row they competed for a
 * width that had to hold "526,627 wells in area", a button and a badge, and the
 * count, the only part that changes, was what got truncated.
 */

const CARD_WIDTH = 306;

type AreaSelectionBarProps = {
  /** Wells inside the area. */
  count: number;
  /**
   * Whether that count is the wells themselves or an estimate.
   *
   * Past the well band the map draws individual wells and the box can be
   * counted exactly. Zoomed out it holds count bubbles, and a bubble is either
   * in the box or out of it — so the total is as coarse as the bubbles are. The
   * card says which, because the difference matters to anyone about to export.
   */
  exact: boolean;
  /** How big the box is on the ground. */
  size: { acres: number; squareMiles: number } | null;
  /** True while this is the box the tool drew for you, not one you drew. */
  sample?: boolean;
  /** Screen position of the area's top edge, in view-container pixels. */
  at: { x: number; y: number };
  onExport: () => void;
  onClear: () => void;
};

export function AreaSelectionBar({
  count,
  exact,
  size,
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
        {/* ---------------- what this is ----------------
          A pale mint band, as the summary's identity strip has: it names the
          card so the number below it needs no label of its own. */}
        <div className="flex items-center gap-[9px] border-b border-[#dcece3] bg-[#f2faf5] px-[13px] py-[8px]">
          <SquareDashed
            size={13}
            strokeWidth={2.25}
            className="shrink-0 text-mv-green-deep"
            aria-hidden="true"
          />
          <span className="flex-1 text-[9.5px] font-extrabold uppercase leading-none tracking-[.1em] text-mv-green-deep">
            Selected area
          </span>

          {sample && (
            <span className="shrink-0 rounded bg-white px-[6px] py-[3px] text-[9px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
              Sample
            </span>
          )}
        </div>

        {/* ---------------- what is in it ----------------
          The number and its unit on one baseline: "1,798 wells" is one
          reading, and on two lines the unit read as a second fact. */}
        <div className="px-[13px] pb-[11px] pt-[10px]">
          <div className="flex items-baseline gap-[6px]">
            <span className="text-[26px] font-bold leading-none tabular-nums text-mv-ink">
              {count.toLocaleString("en-US")}
            </span>
            <span className="text-[12px] leading-none text-mv-slate">
              {count === 1 ? "well" : "wells"}
            </span>
          </div>

          {/* How big the box is, and how firm the number above it is. Both are
              the sort of thing a reader checks before exporting. */}
          <div className="mt-[9px] flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11px] leading-none text-mv-muted">
            {size && (
              <>
                <span className="tabular-nums text-mv-slate">
                  {Math.round(size.acres).toLocaleString("en-US")} acres
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {size.squareMiles < 10
                    ? size.squareMiles.toFixed(1)
                    : Math.round(size.squareMiles).toLocaleString("en-US")}{" "}
                  sq mi
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}

            <span
              className={
                exact ? "text-mv-muted" : "font-semibold text-mv-amber"
              }
            >
              {exact ? "counted well by well" : "estimated from the bubbles"}
            </span>
          </div>

          {!exact && (
            <p className="mt-[7px] rounded-lg bg-mv-amber-bg px-[9px] py-[7px] text-[10.5px] leading-snug text-mv-slate">
              Zoom in until the wells are drawn for an exact count and a CSV of
              the wells themselves.
            </p>
          )}
        </div>

        {/* ---------------- what you can do ---------------- */}
        <div className="flex items-center gap-2 border-t border-mv-line px-[13px] py-[10px]">
          {/* Nothing inside the box means nothing to write: the file would come
              out as a header line on its own. */}
          <button
            type="button"
            onClick={onExport}
            disabled={count === 0}
            className="inline-flex flex-1 items-center justify-center gap-[7px] rounded-lg bg-mv-green-deep px-[12px] py-[8px] text-[12.5px] font-semibold leading-none text-white enabled:cursor-pointer enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
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
