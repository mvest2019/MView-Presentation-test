"use client";

import { Pause, Play, X } from "lucide-react";

/*
 * The bar under the replay.
 *
 * It reports three things, because a replay that only animates is impossible
 * to follow: which year is on screen, how far through the span that is, and
 * how many wells have been plotted. The year is the one that matters — the
 * map filling in means nothing without it.
 *
 * The track is a range input rather than a progress bar, so the years are
 * something to move through and not only watch. Dragging it back takes wells
 * off: what is drawn is always the wells recompleted up to the year under the
 * handle, never a trace of where the replay has been.
 */
export function TimeLapseBar({
  playing,
  year,
  firstYear,
  lastYear,
  step,
  steps,
  plotted,
  total,
  undated,
  onSeek,
  onTogglePlay,
  onClose,
}: {
  playing: boolean;
  /** The year on screen, or null before the first step. */
  year: number | null;
  firstYear: number | null;
  lastYear: number | null;
  /** Index of the year on screen. -1 is before the first, an empty map. */
  step: number;
  /** How many years the wells on screen cover. */
  steps: number;
  plotted: number;
  /** Dated wells — the ones the replay can place. */
  total: number;
  /** Wells with no date, which sit the replay out. */
  undated: number;
  onSeek: (step: number) => void;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const ready = steps > 0;
  const last = Math.max(0, steps - 1);
  /* Across the years, not the wells: the handle sits where the date is. */
  const progress = steps === 0 ? 0 : ((step + 1) / steps) * 100;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-30 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-mv-line bg-white/97 px-4 py-3 shadow-mv-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!ready}
          aria-label={playing ? "Pause the replay" : "Play the replay"}
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-mv-green-deep text-white transition-[filter] enabled:cursor-pointer enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {playing ? (
            <Pause size={15} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Play size={15} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>

        {/* The year, big enough to read from across a desk — it is the axis
            the whole replay runs along. */}
        <span className="w-[54px] shrink-0 text-[19px] font-extrabold leading-none tabular-nums text-mv-ink">
          {year ?? "—"}
        </span>

        <div className="min-w-0 flex-1">
          {/* One track under one handle: the filled part is drawn, and a
              transparent range input sits over it to take the drag. */}
          <div className="relative h-[7px]">
            <div className="absolute inset-0 rounded-full bg-mv-line-soft" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-mv-green-deep"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />

            <input
              type="range"
              min={-1}
              max={last}
              step={1}
              value={Math.min(step, last)}
              disabled={!ready}
              aria-label="Year"
              aria-valuetext={year ? String(year) : "Before the first year"}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="mv-range mv-range-overlay cursor-pointer appearance-none disabled:cursor-not-allowed"
            />
          </div>

          <p className="mt-[9px] truncate text-[11.5px] leading-none text-mv-muted">
            <span className="font-bold text-mv-slate">
              {plotted.toLocaleString("en-US")}
            </span>{" "}
            of {total.toLocaleString("en-US")} dated
            {firstYear !== null && lastYear !== null && (
              <>
                {" · "}
                {firstYear}–{lastYear}
              </>
            )}
            {/* Said plainly rather than quietly dropped: the map had more
                wells on it a moment ago, and this is where they went. */}
            {undated > 0 && (
              <> · {undated.toLocaleString("en-US")} undated, back at the end</>
            )}
            {playing && " · plotting"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close the time-lapse"
          className="grid h-[28px] w-[28px] shrink-0 cursor-pointer place-items-center rounded-lg text-mv-muted transition-colors hover:bg-mv-hover hover:text-mv-slate"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
