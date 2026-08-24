"use client";

import { useMemo, useRef } from "react";

/**
 * The chart's zoom control — a drag range under the x-axis.
 *
 * WHY A BRUSH AND NOT JUST THE WHEEL. Scroll-to-zoom is invisible: nothing on screen
 * says the chart can zoom, it fights the page scroll on a trackpad, and it does not
 * exist at all on touch. A brush states the range it has selected, shows the years
 * being left out, and works the same under a mouse, a finger and the arrow keys. The
 * wheel still works — this replaces the *reliance* on it, not the gesture.
 *
 * THE OVERVIEW IS THE POINT. The strip draws the whole series in miniature behind the
 * selection, so the years outside the zoom stay visible and the user can see where the
 * production actually is before dragging to it. A plain empty track would make the
 * control a slider rather than a brush.
 *
 * ONE POINTER HANDLER, NOT THREE. All movement is handled on the track with pointer
 * capture, and which of the three gestures is underway is decided from where the press
 * landed — near the left edge, near the right edge, or inside. Handles as their own
 * draggable elements would each need their own capture and their own clamping; they are
 * `pointer-events-none` here and exist for focus and the keyboard. A press outside the
 * selection re-centres it there, so the control is also a jump target.
 *
 * INDICES, NOT PIXELS, ARE THE STATE. The parent owns `{start, end}` over the data
 * array; this converts to and from fractions only to paint and to read the pointer. The
 * full range is expressed as `null` so "not zoomed" is one value rather than a pair
 * that has to be compared against the length.
 */

/** Never narrower than this, matching the wheel's floor — below it there is no line. */
const MIN_SPAN = 3;
/** How close to an edge a press has to be to grab that handle, in pixels. */
const GRAB_PX = 16;

type Mode = "start" | "end" | "body";

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

export function YearBrush({
  years,
  values,
  zoom,
  onChange,
}: {
  /** Every year in the series, in order. */
  years: readonly number[];
  /** One magnitude per year, for the miniature overview. */
  values: readonly number[];
  /** The selected index window, or null for the full range. */
  zoom: { start: number; end: number } | null;
  onChange: (next: { start: number; end: number } | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: Mode;
    grab: number;
    start: number;
    end: number;
  } | null>(null);

  const count = years.length;
  const start = zoom?.start ?? 0;
  const end = zoom?.end ?? count - 1;
  const zoomed = zoom !== null;

  /** Index → percentage across the track. */
  const pct = (index: number) => (count <= 1 ? 0 : (index / (count - 1)) * 100);

  /** The overview path, normalised to its own peak. */
  const overview = useMemo(() => {
    if (values.length === 0) return "";
    const peak = Math.max(...values) || 1;
    const step = values.length > 1 ? 100 / (values.length - 1) : 0;
    const line = values
      .map(
        (value, i) =>
          `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)} ${(24 - (value / peak) * 22).toFixed(2)}`,
      )
      .join(" ");
    return `${line} L100 24 L0 24 Z`;
  }, [values]);

  /** Report a window, collapsing the full range to null. */
  const report = (from: number, to: number) =>
    onChange(from === 0 && to === count - 1 ? null : { start: from, end: to });

  const indexAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const fraction = (clientX - rect.left) / rect.width;
    return clamp(Math.round(fraction * (count - 1)), 0, count - 1);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (count < MIN_SPAN + 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    const at = indexAt(event.clientX);
    const offset = event.clientX - rect.left;
    const startPx = (rect.width * pct(start)) / 100;
    const endPx = (rect.width * pct(end)) / 100;
    const toStart = Math.abs(offset - startPx);
    const toEnd = Math.abs(offset - endPx);

    let mode: Mode = "body";
    if (toStart <= GRAB_PX && toStart <= toEnd) mode = "start";
    else if (toEnd <= GRAB_PX) mode = "end";

    event.currentTarget.setPointerCapture(event.pointerId);

    if (mode === "body" && (at < start || at > end)) {
      // Pressing outside the selection jumps it here, keeping its width.
      const span = end - start + 1;
      const from = clamp(at - Math.floor(span / 2), 0, count - span);
      drag.current = { mode, grab: at, start: from, end: from + span - 1 };
      report(from, from + span - 1);
      return;
    }

    drag.current = { mode, grab: at, start, end };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held) return;
    const at = indexAt(event.clientX);

    if (held.mode === "start") {
      report(clamp(at, 0, held.end - MIN_SPAN + 1), held.end);
      return;
    }
    if (held.mode === "end") {
      report(held.start, clamp(at, held.start + MIN_SPAN - 1, count - 1));
      return;
    }

    const span = held.end - held.start + 1;
    if (span >= count) return;
    const from = clamp(held.start + (at - held.grab), 0, count - span);
    report(from, from + span - 1);
  };

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  };

  /** Arrow keys nudge an edge; Home and End take it to the series bound. */
  const onHandleKeyDown =
    (edge: "start" | "end") => (event: React.KeyboardEvent) => {
      const step =
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;

      if (step !== 0) {
        event.preventDefault();
        if (edge === "start")
          report(clamp(start + step, 0, end - MIN_SPAN + 1), end);
        else report(start, clamp(end + step, start + MIN_SPAN - 1, count - 1));
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        if (edge === "start") {
          report(event.key === "Home" ? 0 : end - MIN_SPAN + 1, end);
        } else {
          report(start, event.key === "End" ? count - 1 : start + MIN_SPAN - 1);
        }
      }
    };

  if (count < MIN_SPAN + 1) return null;

  const handleClass =
    "pointer-events-none absolute top-1/2 h-[26px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-white bg-mv-green-deep shadow-mv";

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between gap-3 pb-[5px]">
        <p className="text-[12px] text-mv-muted">
          Drag the handles to zoom · drag inside to pan
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={!zoomed}
          className="cursor-pointer rounded-[8px] border border-mv-line bg-white px-[10px] py-[3px] text-[12px] font-semibold text-mv-slate transition-colors hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep disabled:cursor-default disabled:border-mv-line-soft disabled:text-mv-placeholder disabled:hover:bg-white"
        >
          {zoomed ? `${years[start]}–${years[end]} · Reset` : "All years"}
        </button>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onDoubleClick={() => onChange(null)}
        className="relative h-[34px] cursor-ew-resize touch-none select-none overflow-hidden rounded-[9px] border border-mv-line bg-mv-bg"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <path d={overview} fill="var(--color-mv-line-strong)" opacity=".55" />
        </svg>

        {/* the selected window, drawn over the overview */}
        <div
          className="absolute inset-y-0 border-x-2 border-mv-green-deep bg-mv-green/25"
          style={{
            left: `${pct(start)}%`,
            width: `${Math.max(pct(end) - pct(start), 0.6)}%`,
          }}
        />

        <span className={handleClass} style={{ left: `${pct(start)}%` }} />
        <span className={handleClass} style={{ left: `${pct(end)}%` }} />

        {/* focusable, keyboard-operable stand-ins for the two handles */}
        <button
          type="button"
          role="slider"
          aria-label="First year shown"
          aria-valuemin={years[0]}
          aria-valuemax={years[end]}
          aria-valuenow={years[start]}
          aria-valuetext={`${years[start]}`}
          onKeyDown={onHandleKeyDown("start")}
          className="absolute top-0 h-full w-[18px] -translate-x-1/2 cursor-ew-resize bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep"
          style={{ left: `${pct(start)}%` }}
        />
        <button
          type="button"
          role="slider"
          aria-label="Last year shown"
          aria-valuemin={years[start]}
          aria-valuemax={years[count - 1]}
          aria-valuenow={years[end]}
          aria-valuetext={`${years[end]}`}
          onKeyDown={onHandleKeyDown("end")}
          className="absolute top-0 h-full w-[18px] -translate-x-1/2 cursor-ew-resize bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep"
          style={{ left: `${pct(end)}%` }}
        />
      </div>

      <div className="flex justify-between pt-[3px] text-[11.5px] tabular-nums text-mv-placeholder">
        <span>{years[0]}</span>
        <span>{years[count - 1]}</span>
      </div>
    </div>
  );
}
