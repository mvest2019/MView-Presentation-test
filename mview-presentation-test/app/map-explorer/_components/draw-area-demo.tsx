"use client";

import { Download, SquareDashed, X } from "lucide-react";
import { useEffect, useState } from "react";

/*
 * "Draw an area", shown once in a window of its own before you use it.
 *
 * The sample used to play on the live map, and that was the problem: the
 * demonstration and the thing being demonstrated were the same surface, so the
 * dashed box and its count landed on top of the reader's own view and had to be
 * dismissed before anything could be drawn. Here it happens in a window, and
 * closing the window hands the real map over armed and empty.
 *
 * The little map is not a second Esri view — one is expensive, and a demo does
 * not need a basemap. It is the wells the map has actually loaded, plotted into
 * a box, so the dots are this reader's own field rather than a stock picture.
 * The count that lands at the end is the number of those dots inside the box,
 * counted, not written.
 */

/** The mini-map's own coordinate space. */
const BOX = { width: 520, height: 300 };

/** Where the sample box is drawn, as a share of the mini-map. */
const AREA = { left: 0.17, top: 0.16, right: 0.72, bottom: 0.74 };

/*
 * How long the box takes to draw itself out, and in how many steps.
 *
 * About two and a half seconds. The gesture is the whole point of the window,
 * and at a third of that it was over before the eye had found the box — a
 * demonstration nobody can follow teaches nothing.
 */
const FRAMES = 46;
const FRAME_MS = 55;

/** A beat on the finished box before the count appears. */
const SETTLE_MS = 260;

export type DemoWell = { lon: number; lat: number };

export function DrawAreaDemo({
  wells,
  onClose,
}: {
  /** Whatever the map has loaded — plotted as the field to draw over. */
  wells: DemoWell[];
  /** Closing hands the tool to the real map. */
  onClose: () => void;
}) {
  /** 0 → nothing drawn, 1 → the box is complete. */
  const [through, setThrough] = useState(0);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      setThrough(Math.min(1, frame / FRAMES));
      if (frame >= FRAMES) clearInterval(timer);
    }, FRAME_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (through < 1) return;
    const timer = setTimeout(() => setCounted(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [through]);

  /* Esc closes it, as it does every other tool. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dots = plot(wells);

  /* Eased, so it slows as it lands rather than stopping dead. */
  const eased = 1 - (1 - through) ** 3;
  const box = {
    x: AREA.left * BOX.width,
    y: AREA.top * BOX.height,
    width: (AREA.right - AREA.left) * BOX.width * eased,
    height: (AREA.bottom - AREA.top) * BOX.height * eased,
  };

  const inside = dots.filter(
    (dot) =>
      dot.x >= box.x &&
      dot.x <= box.x + box.width &&
      dot.y >= box.y &&
      dot.y <= box.y + box.height,
  ).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How Draw an area works"
      className="absolute inset-0 z-40 grid place-items-center bg-[#0d0e17]/45 px-4"
    >
      <div className="w-[min(560px,100%)] overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv-lg">
        {/* ---------------- what this is ---------------- */}
        <div className="flex items-start gap-3 border-b border-mv-line px-[18px] py-[14px]">
          <span
            aria-hidden="true"
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
          >
            <SquareDashed size={16} strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[14.5px] font-bold leading-tight text-mv-ink">
              Draw an area
              <span className="ml-[8px] inline-block rounded bg-mv-mint px-[6px] py-[3px] align-[2px] text-[9px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
                Sample
              </span>
            </h2>
            <p className="mt-[4px] text-[11.5px] leading-snug text-mv-muted">
              Watch it once here, then do it on the map yourself.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* ---------------- the little map ---------------- */}
        <div className="px-[18px] pt-[14px]">
          <div className="relative overflow-hidden rounded-xl border border-mv-line bg-[#f7f7ee]">
            <svg
              viewBox={`0 0 ${BOX.width} ${BOX.height}`}
              className="block h-auto w-full"
              role="img"
              aria-label={`${inside} wells inside the drawn area`}
            >
              {/* Section lines, for something under the dots. */}
              <g stroke="#e6e4d2" strokeWidth="1">
                {[0.25, 0.5, 0.75].map((at) => (
                  <line
                    key={`v${at}`}
                    x1={at * BOX.width}
                    y1="0"
                    x2={at * BOX.width}
                    y2={BOX.height}
                  />
                ))}
                {[0.33, 0.66].map((at) => (
                  <line
                    key={`h${at}`}
                    x1="0"
                    y1={at * BOX.height}
                    x2={BOX.width}
                    y2={at * BOX.height}
                  />
                ))}
              </g>

              {/* The wells the map has loaded. */}
              {dots.map((dot, index) => (
                <circle
                  key={index}
                  cx={dot.x}
                  cy={dot.y}
                  r="3"
                  fill="#12a13f"
                  opacity="0.9"
                />
              ))}

              {/* The box, drawing itself out from its top-left corner — the
                  same dashed blue the real tool uses. */}
              {through > 0 && (
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  fill="#2563eb"
                  fillOpacity="0.08"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                />
              )}
            </svg>

            {/* The count, once the box has landed — the card the real tool
                shows, in miniature. */}
            {counted && (
              <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-[10px] rounded-xl border border-mv-line bg-white px-[13px] py-[9px] shadow-mv">
                <span className="text-[19px] font-bold leading-none tabular-nums text-mv-ink">
                  {inside.toLocaleString("en-US")}
                </span>
                <span className="text-[11px] leading-tight text-mv-muted">
                  wells in
                  <br />
                  this area
                </span>
                <span className="ml-1 flex items-center gap-[5px] rounded-lg bg-mv-green-deep px-[9px] py-[6px] text-[10.5px] font-semibold text-white">
                  <Download size={11} aria-hidden="true" />
                  Export CSV
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- what to do next ---------------- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-[18px] py-[14px]">
          <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-mv-slate">
            Press and drag a box across the map — or click two opposite corners.
            Every well inside it is counted, and the CSV is those wells.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg bg-mv-green-deep px-[15px] py-[9px] text-[12.5px] font-semibold text-white hover:brightness-105"
          >
            Let me try
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The loaded wells, fitted into the mini-map.
 *
 * Scaled to their own bounding box rather than the map's extent, so a field
 * off in one corner of the view still fills the picture. Latitude is flipped,
 * north being up.
 *
 * Where the map has no wells loaded — zoomed out over the bubbles — there is
 * nothing to plot, so a scattered field stands in. It is a drawing of a field
 * either way; the point of the picture is the gesture, not the geography.
 */
function plot(wells: DemoWell[]): { x: number; y: number }[] {
  const inset = 14;
  const width = BOX.width - inset * 2;
  const height = BOX.height - inset * 2;

  if (wells.length < 12) {
    /* A fixed pseudo-random field: same every time, so the demo does not
       flicker between openings, and no `Math.random` in a render. */
    return Array.from({ length: 150 }, (_, index) => {
      const x = (Math.sin(index * 12.9898) + 1) / 2;
      const y = (Math.sin(index * 78.233) + 1) / 2;
      return { x: inset + x * width, y: inset + y * height };
    });
  }

  const lons = wells.map((well) => well.lon);
  const lats = wells.map((well) => well.lat);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  const spanLon = east - west || 1;
  const spanLat = north - south || 1;

  return wells.slice(0, 600).map((well) => ({
    x: inset + ((well.lon - west) / spanLon) * width,
    y: inset + ((north - well.lat) / spanLat) * height,
  }));
}
