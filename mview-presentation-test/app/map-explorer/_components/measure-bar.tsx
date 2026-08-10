"use client";

import { X } from "lucide-react";

/*
 * The readout that rides on the midpoint of a measured line.
 *
 * Presentational, like the area bar. The line and its endpoints are Esri
 * graphics so they stay pinned to the ground; this only needs telling where the
 * midpoint currently sits on screen.
 */

type MeasureBarProps = {
  /** Ellipsoidal distance, in metres. */
  meters: number;
  /** Screen position of the line's midpoint, in view-container pixels. */
  at: { x: number; y: number };
  onClear: () => void;
};

const METRES_PER_MILE = 1609.344;

export function MeasureBar({ meters, at, onClear }: MeasureBarProps) {
  const miles = meters / METRES_PER_MILE;
  const kilometres = meters / 1000;

  return (
    <div
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[8px] whitespace-nowrap rounded-lg bg-[#1b2430]/95 px-[11px] py-[6px] text-[12.5px] font-semibold leading-none text-white shadow-mv-lg"
      style={{ left: at.x, top: at.y }}
    >
      <span>
        {miles.toFixed(1)} mi ({kilometres.toFixed(1)} km)
      </span>

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear measurement"
        className="-mr-[3px] grid h-[15px] w-[15px] cursor-pointer place-items-center rounded text-white/70 hover:bg-white/15 hover:text-white"
      >
        <X size={12} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
