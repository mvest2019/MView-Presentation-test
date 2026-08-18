"use client";

import { X } from "lucide-react";

/*
 * The readout that rides on the midpoint of a measured line.
 *
 * Presentational: the line and its endpoints are Esri graphics so they stay
 * pinned to the ground; this only needs telling where the midpoint currently
 * sits on screen.
 *
 * A small pill, and nothing else. It sits *on* the line it describes, so every
 * pixel it takes covers the map — an icon tile and a two-row readout made a
 * block out of what is one short number. Miles lead because that is what a
 * Texas lease is described in; the kilometres are the same number said again,
 * so they follow in the muted grey.
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
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[8px] whitespace-nowrap rounded-full border border-mv-line bg-white py-[6px] pl-[14px] pr-[6px] leading-none shadow-mv-lg"
      style={{ left: at.x, top: at.y }}
    >
      <span className="text-[15px] font-bold tabular-nums text-mv-ink">
        {miles.toFixed(1)} mi
      </span>
      <span className="text-[13px] tabular-nums text-mv-muted">
        {kilometres.toFixed(1)} km
      </span>

      <span aria-hidden="true" className="h-[16px] w-px bg-mv-line" />

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear measurement"
        title="Clear measurement"
        className="grid h-[22px] w-[22px] shrink-0 cursor-pointer place-items-center rounded-full text-mv-muted hover:bg-mv-red-bg hover:text-mv-red"
      >
        <X size={13} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
