"use client";

import { useState } from "react";

/**
 * The Texas choropleth's interactive shell.
 *
 * WHY THE PATHS ARE NOT IN HERE. All 254 county outlines are 64 KB of geometry, and
 * they are identical for every operator. The server component renders them into the
 * HTML — already carrying each county's oil AND gas shade as CSS custom properties —
 * and passes the finished `<svg>` in as `children`. So the geometry gzips inside the
 * document and never enters a client bundle; this file ships only the toggle and the
 * tooltip.
 *
 * That is also why switching metric costs nothing: it flips one class on the
 * wrapper, and CSS repaints the fills from the other custom property. No React
 * re-render, no 254-element reconcile.
 *
 * The tooltip reads `data-county` / `data-oil` / `data-gas` off the hovered path, so
 * it needs no copy of the data either.
 */

export type MapMetric = "oil" | "gas";

export function FootprintMap({
  /** The server-rendered `<svg>`, paths and all. */
  children,
  /** Caption tail, e.g. "79 producing counties · MView records". */
  caption,
  /** False when this operator has no per-county rows — the toggle is pointless. */
  hasData,
}: {
  children: React.ReactNode;
  caption: string;
  hasData: boolean;
}) {
  const [metric, setMetric] = useState<MapMetric>("oil");
  const [hover, setHover] = useState<{
    county: string;
    oil: string;
    gas: string;
    x: number;
    y: number;
  } | null>(null);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const path = (event.target as Element).closest("path[data-county]");
    if (!path) {
      setHover(null);
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    setHover({
      county: path.getAttribute("data-county") ?? "",
      oil: path.getAttribute("data-oil") ?? "0",
      gas: path.getAttribute("data-gas") ?? "0",
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mv-line-soft px-[18px] py-[14px]">
        <p className="text-[13px] text-mv-muted">
          <b className="font-semibold text-mv-ink">Texas footprint map</b>{" "}
          {caption}
        </p>

        {hasData ? (
          <div
            role="group"
            aria-label="Shade the map by"
            className="inline-flex overflow-hidden rounded-[9px] border border-mv-line"
          >
            {(["oil", "gas"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={metric === option}
                onClick={() => setMetric(option)}
                className={`cursor-pointer border-0 px-[13px] py-[6px] text-[12.5px] font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep ${
                  metric === option
                    ? "bg-mv-tint text-mv-green-deep"
                    : "bg-white text-mv-muted hover:text-mv-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* `metric-gas` is what the server-rendered CSS keys the second fill off. */}
      <div
        className={`relative px-3 pb-3 pt-2 ${metric === "gas" ? "metric-gas" : ""}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        {children}

        {hover ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[150px] rounded-[10px] bg-mv-tooltip px-3 py-2 text-[12px] text-white shadow-mv"
            style={{
              left: hover.x,
              top: hover.y,
              transform: "translate(12px, -50%)",
            }}
          >
            <div className="mb-1 text-[12.5px] font-extrabold">
              {hover.county}
            </div>
            <div className="flex justify-between gap-4 text-mv-on-deep-muted">
              <span>Oil</span>
              <b className="font-bold tabular-nums text-white">{hover.oil}</b>
            </div>
            <div className="flex justify-between gap-4 text-mv-on-deep-muted">
              <span>Gas</span>
              <b className="font-bold tabular-nums text-white">{hover.gas}</b>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
