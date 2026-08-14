"use client";

import { Pause, Play, X } from "lucide-react";

/*
 * The time-lapse bar, along the bottom of the map.
 *
 * It reports presses and draws progress; the plotting itself belongs to the
 * view, which owns the layers.
 *
 * There is deliberately no year here. An earlier version showed one derived
 * from progress, which looked like data and was not — neither the cluster nor
 * the well endpoint reports a spud or completion date, so nothing on the map
 * can be placed in time. When one does, the year comes back and drives the
 * plot instead of trailing it.
 */

type TimeLapseBarProps = {
  playing: boolean;
  /** 0 to 1. */
  progress: number;
  /** How many marks are on the map, and how many there are in total. */
  plotted: number;
  total: number;
  onTogglePlay: () => void;
  onClose: () => void;
};

export function TimeLapseBar({
  playing,
  progress,
  plotted,
  total,
  onTogglePlay,
  onClose,
}: TimeLapseBarProps) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 w-[min(720px,calc(100%-32px))] -translate-x-1/2 rounded-2xl border border-mv-line bg-white/97 px-4 py-[14px] shadow-mv-lg backdrop-blur-[6px]">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause time-lapse" : "Play time-lapse"}
          className="grid h-[34px] w-[34px] shrink-0 cursor-pointer place-items-center rounded-full bg-mv-green-deep text-white hover:brightness-105"
        >
          {playing ? (
            <Pause size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ) : (
            <Play size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          )}
        </button>

        {/* A progress track, not a slider: the plot runs forwards from empty,
            and there is nothing to scrub back to. */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="Time-lapse progress"
          className="h-[6px] flex-1 overflow-hidden rounded-full bg-mv-line"
        >
          <div
            className="h-full rounded-full bg-mv-green-deep transition-[width] duration-150 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close time-lapse"
          className="grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-full text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-[9px] flex flex-wrap items-baseline gap-x-4 gap-y-1 pl-[50px] text-[12px]">
        <span className="text-mv-slate">
          <span className="font-bold text-mv-ink">
            {plotted.toLocaleString("en-US")}
          </span>{" "}
          of {total.toLocaleString("en-US")} plotted
        </span>
        <span className="text-mv-muted">
          {playing ? "Plotting…" : plotted === 0 ? "Press play to begin" : "Paused"}
        </span>
      </div>
    </div>
  );
}
