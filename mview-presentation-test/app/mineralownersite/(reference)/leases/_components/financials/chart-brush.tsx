"use client";

import { useRef, useState } from "react";

/**
 * THE OVERVIEW STRIP UNDER THE CHART — the whole record at a glance, with the
 * visible window marked on it and draggable at either end.
 *
 * ── WHY A CHART THIS LONG NEEDS ONE ──
 *
 * The record is 261 months. Drawn in full, the four years anybody actually
 * cares about are two centimetres wide; drawn at four years, there is no way to
 * tell whether what is on screen is the whole story. The strip answers the
 * second question permanently — the flat decade on the left IS the record
 * before nine of the ten leases existed — while the window stays readable.
 *
 * ── THE HANDLES ARE HTML OVER THE SVG, NOT SHAPES INSIDE IT ──
 *
 * The strip stretches to the card's width with `preserveAspectRatio="none"`,
 * which is right for an area fill and wrong for anything meant to keep a shape:
 * the same `<rect>` that is a 10px handle at 1000px wide is a 3.6px sliver on a
 * 360px phone, and its rounded corners stretch with it. So the sparkline is SVG
 * and the two handles are real elements positioned over it, at a fixed pixel
 * size whatever the strip's width.
 *
 * Which also makes them real `<button>`s rather than `<g role="slider">`s.
 *
 * ── THE WINDOW IS TINTED, NOT THE REST DIMMED ──
 *
 * The two ends outside the window used to be covered with a wash. That reads as
 * "this part is unavailable", which is the opposite of true — the point of the
 * strip is that the rest of the record is RIGHT THERE and one drag away. Now
 * the sparkline is drawn once, plain, over a mint band marking the window.
 *
 * ── THE TRACK IS INSET BY HALF A HANDLE, LIKE EVERY RANGE SLIDER ──
 *
 * With the handle centred exactly on its month, the first and last month put
 * half the handle outside the strip — at "All" both ends were sliced down the
 * middle by the rounded corner. So the travel runs from half a handle in to
 * half a handle short of the end (`HANDLE_W / 2` either side, the `calc()`
 * below), and `indexAtClientX` inverts that same mapping so a drag still lands
 * on the month under the pointer.
 *
 * ── POINTER EVENTS, WITH CAPTURE ──
 *
 * `setPointerCapture` on the handle means the drag continues when the pointer
 * leaves the strip, which is what happens every time somebody drags quickly.
 * Without it the handle sticks wherever the pointer crossed the edge. Capture
 * also routes `pointermove` to the handle itself, so no listener has to be
 * attached to the window and removed again.
 *
 * ── AND KEYBOARD, BECAUSE A DRAG HANDLE IS NOT AN INTERACTION ──
 *
 * Each handle is in the tab order with arrow keys bound (Shift for a year at a
 * time), and announces as a slider with its month as the value. A brush that
 * can only be dragged puts the chart's whole range out of reach of anybody not
 * using a mouse — the range presets beside it are a shortcut, not a substitute.
 */

/*
 * HEIGHT 32, AND THE VIEWBOX MATCHES THE RENDERED BOX. The strip is an overview
 * — the shape of 261 months, not a chart to read values off — so it only needs
 * enough room for the handles to be grabbable. Keeping this equal to the
 * container's height means the y maths is in real pixels rather than in a
 * coordinate space that happens to be stretched vertically too.
 */
const STRIP = { width: 1000, height: 32 } as const;

/** The handle's drawn width in CSS pixels — the inset the track travels in. */
const HANDLE_W = 12;

/** Never let the window close to nothing — a two-month chart says nothing. */
const MIN_MONTHS = 6;

export function ChartBrush({
  values,
  from,
  to,
  onChange,
  labelFor,
}: {
  /** The full series, all 261 months of it. */
  values: number[];
  from: number;
  to: number;
  onChange: (next: { from: number; to: number }) => void;
  /** Turns an index into "Jul 2024", for the handles' announced values. */
  labelFor: (index: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"from" | "to" | null>(null);

  const last = values.length - 1;
  const peak = Math.max(...values, 1);
  const x = (index: number) => (index / last) * STRIP.width;
  const y = (value: number) => STRIP.height - (value / peak) * (STRIP.height - 4);

  /* An open path — the series and nothing else. It was a closed area filled
     mint, which drew the whole record as one solid pale shape and left the
     window tint with nothing to sit against; the line is what shows the shape
     of the record, and the tint is what shows which part of it is on screen. */
  const line = values
    .map(
      (value, index) =>
        `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`,
    )
    .join("");

  /** Where an index sits along the inset track — see the note above. */
  const offset = (index: number) =>
    `calc(${index / last} * (100% - ${HANDLE_W}px) + ${HANDLE_W / 2}px)`;

  function indexAtClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    const travel = (rect?.width ?? 0) - HANDLE_W;
    if (!rect || travel <= 0) return 0;
    const ratio = (clientX - rect.left - HANDLE_W / 2) / travel;
    return Math.max(0, Math.min(last, Math.round(ratio * last)));
  }

  function move(edge: "from" | "to", index: number): void {
    if (edge === "from") onChange({ from: Math.min(index, to - MIN_MONTHS), to });
    else onChange({ from, to: Math.max(index, from + MIN_MONTHS) });
  }

  return (
    <div
      ref={trackRef}
      className="relative h-8 w-full touch-none overflow-hidden rounded-[10px] border border-mv-line bg-mv-card"
    >
      {/* The window itself, pinned to the two handle centres so the tint and
          the handles can never disagree about where the window starts. It is
          BEHIND the sparkline: painted over it, a flat mint band would hide the
          four years the reader is actually looking at. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 border-x border-mv-green/30 bg-mv-mint"
        style={{ left: offset(from), right: `calc(100% - ${offset(to)})` }}
      />

      <svg
        viewBox={`0 0 ${STRIP.width} ${STRIP.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {/* `non-scaling-stroke` because the strip is stretched to the card's
            width: without it the 1px line is drawn in the stretched x-scale and
            thins or thickens with the viewport. */}
        <path
          d={line}
          vectorEffect="non-scaling-stroke"
          strokeWidth={1}
          className="fill-none stroke-mv-green"
        />
      </svg>

      {(["from", "to"] as const).map((edge) => {
        const index = edge === "from" ? from : to;
        return (
          <button
            key={edge}
            type="button"
            role="slider"
            aria-label={edge === "from" ? "Window start" : "Window end"}
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={index}
            aria-valuetext={labelFor(index)}
            style={{ left: offset(index), width: HANDLE_W }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(edge);
            }}
            onPointerMove={(event) => {
              if (dragging !== edge) return;
              move(edge, indexAtClientX(event.clientX));
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              setDragging(null);
            }}
            onKeyDown={(event) => {
              const step =
                event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
              if (!step) return;
              event.preventDefault();
              move(edge, index + (event.shiftKey ? step * 12 : step));
            }}
            className="absolute top-1/2 h-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-[1.5px] border-mv-green-deep bg-mv-card p-0 shadow-[0_1px_3px_rgba(15,23,42,.14)] transition-colors hover:bg-mv-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
          />
        );
      })}
    </div>
  );
}
