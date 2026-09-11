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
 * Each handle is a real `<button>` in the tab order with arrow keys bound, and
 * announces as a slider with its month as the value. A brush that can only be
 * dragged puts the chart's whole range out of reach of anybody not using a
 * mouse — the range presets beside it are a shortcut, not a substitute.
 */

const STRIP = { width: 1000, height: 56 } as const;

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
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<"from" | "to" | null>(null);

  const last = values.length - 1;
  const peak = Math.max(...values, 1);
  const x = (index: number) => (index / last) * STRIP.width;
  const y = (value: number) => STRIP.height - (value / peak) * (STRIP.height - 6);

  /* One closed path: the series across the top, then back along the floor. */
  const area = `M0 ${STRIP.height}${values
    .map((value, index) => `L${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
    .join("")}L${STRIP.width} ${STRIP.height}Z`;

  function indexAtClientX(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(last, Math.round(ratio * last)));
  }

  function move(edge: "from" | "to", index: number): void {
    if (edge === "from") onChange({ from: Math.min(index, to - MIN_MONTHS), to });
    else onChange({ from, to: Math.max(index, from + MIN_MONTHS) });
  }

  function nudge(edge: "from" | "to", step: number): void {
    move(edge, (edge === "from" ? from : to) + step);
  }

  function handleProps(edge: "from" | "to") {
    const index = edge === "from" ? from : to;
    return {
      onPointerDown: (event: React.PointerEvent<SVGGElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(edge);
      },
      onPointerMove: (event: React.PointerEvent<SVGGElement>) => {
        if (dragging !== edge) return;
        move(edge, indexAtClientX(event.clientX));
      },
      onPointerUp: (event: React.PointerEvent<SVGGElement>) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(null);
      },
      onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
        const step =
          event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        nudge(edge, event.shiftKey ? step * 12 : step);
      },
      tabIndex: 0,
      role: "slider" as const,
      "aria-label": edge === "from" ? "Window start" : "Window end",
      "aria-valuemin": 0,
      "aria-valuemax": last,
      "aria-valuenow": index,
      "aria-valuetext": labelFor(index),
    };
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${STRIP.width} ${STRIP.height}`}
      preserveAspectRatio="none"
      className="h-14 w-full touch-none rounded-[10px] border border-mv-line bg-mv-card"
    >
      <path d={area} className="fill-mv-mint" />

      {/* The two ends that are NOT being shown, dimmed rather than cropped —
          a reader can see there is more record on either side. */}
      <rect x={0} y={0} width={x(from)} height={STRIP.height} className="fill-mv-bg/80" />
      <rect
        x={x(to)}
        y={0}
        width={STRIP.width - x(to)}
        height={STRIP.height}
        className="fill-mv-bg/80"
      />

      {(["from", "to"] as const).map((edge) => {
        const index = edge === "from" ? from : to;
        return (
          <g
            key={edge}
            {...handleProps(edge)}
            className="cursor-ew-resize focus-visible:outline-2 focus-visible:outline-mv-green-deep"
          >
            {/* A wide invisible target over a narrow visible handle: the drawn
                handle is 10 units across, which is under four pixels once the
                strip is scaled down on a phone. */}
            <rect
              x={x(index) - 16}
              y={0}
              width={32}
              height={STRIP.height}
              className="fill-transparent"
            />
            <rect
              x={x(index) - 5}
              y={6}
              width={10}
              height={STRIP.height - 12}
              rx={3}
              className="fill-mv-card stroke-mv-line-strong"
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}
