"use client";

import { Pause, Play, X } from "lucide-react";

/*
 * The bar under the replay.
 *
 * It reports three things, because a replay that only animates is impossible
 * to follow: which year is on screen, how far through the span that is, and
 * how many wells have been plotted. The year is the one that matters — the
 * bubbles growing mean nothing without it.
 *
 * The track is a real range input rather than a progress bar, so the years are
 * something you can move through rather than only watch. Dragging it back
 * takes wells off the map: the bubbles are always the wells completed up to
 * the year under the handle, so the map is a picture of that date and not of
 * everywhere the replay has been.
 */
export function TimeLapseBar({
  loading,
  error,
  playing,
  year,
  firstYear,
  lastYear,
  step,
  steps,
  plotted,
  total,
  onSeek,
  onTogglePlay,
  onClose,
}: {
  loading: boolean;
  error: string | null;
  playing: boolean;
  /** The year on screen, or null before the first step. */
  year: number | null;
  firstYear: number | null;
  lastYear: number | null;
  /** Index of the year on screen. -1 is before the first, an empty map. */
  step: number;
  /** How many years the data covers. */
  steps: number;
  plotted: number;
  total: number;
  onSeek: (step: number) => void;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const ready = !loading && !error && steps > 0;
  const last = Math.max(0, steps - 1);
  /* Across the years, not across the wells: the handle sits where the date is,
     and most wells arrive in the last quarter of the span. */
  const progress = steps === 0 ? 0 : ((step + 1) / steps) * 100;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-30 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-mv-line bg-white/97 px-4 py-3 shadow-mv-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!ready}
          aria-label={playing ? "Pause the replay" : "Play the replay"}
          className="grid h-[34px] w-[34px] shrink-0 cursor-pointer place-items-center rounded-full bg-mv-green-deep text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {playing ? (
            <Pause size={15} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Play size={15} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>

        {/* The year, big enough to read from across a desk — it is the axis
            the whole replay runs along. */}
        <span className="w-[62px] shrink-0 text-[19px] font-extrabold leading-none tabular-nums text-mv-ink">
          {year ?? "—"}
        </span>

        <div className="min-w-0 flex-1">
          {/* One track under one handle, the same construction the production
              chart's window uses: the filled part is drawn, and a transparent
              range input sits over it to take the drag. */}
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
            {loading ? (
              "Loading every dated well…"
            ) : error ? (
              <span className="font-semibold text-mv-plum">{error}</span>
            ) : (
              <>
                <span className="font-bold text-mv-slate">
                  {plotted.toLocaleString("en-US")}
                </span>{" "}
                of {total.toLocaleString("en-US")} wells
                {firstYear !== null && lastYear !== null && (
                  <>
                    {" · "}
                    {firstYear}–{lastYear}
                  </>
                )}
                {playing && " · plotting"}
              </>
            )}
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
