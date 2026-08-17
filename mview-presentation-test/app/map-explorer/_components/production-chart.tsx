"use client";

import { useState } from "react";

import {
  PRODUCTION_END_YEAR,
  PRODUCTION_HISTORY_MONTHS,
  PRODUCTION_SERIES,
  PRODUCTION_START_YEAR,
} from "./well-insights-data";

/*
 * Crude oil and natural gas, month by month, history then forecast.
 *
 * Two scales on one plot: oil in barrels on the left, gas in mcf on the right.
 * They are different units and different magnitudes, so a shared axis would
 * flatten the smaller of them into the floor.
 *
 * The forecast is the same line, dashed, past the marker — one curve, drawn
 * two ways, rather than two series that could be read as different wells.
 */

const OIL = "#12a13f";
const GAS = "#e2231a";

/** Plot area, in the SVG's own units. */
const W = 1000;
const H = 300;

const OIL_MAX = 60_000;
const GAS_MAX = 80_000;

const RANGES = [
  { id: "1Y", years: 1 },
  { id: "2Y", years: 2 },
  { id: "All", years: PRODUCTION_END_YEAR - PRODUCTION_START_YEAR + 1 },
] as const;

export function ProductionChart() {
  const [span, setSpan] = useState<(typeof RANGES)[number]["id"]>("All");
  const [from, setFrom] = useState(PRODUCTION_START_YEAR);
  const [to, setTo] = useState(PRODUCTION_END_YEAR);

  function chooseSpan(id: (typeof RANGES)[number]["id"]) {
    const years = RANGES.find((range) => range.id === id)?.years ?? 1;
    setSpan(id);
    setFrom(PRODUCTION_START_YEAR);
    setTo(Math.min(PRODUCTION_END_YEAR, PRODUCTION_START_YEAR + years - 1));
  }

  const first = (from - PRODUCTION_START_YEAR) * 12;
  const last = (to - PRODUCTION_START_YEAR + 1) * 12 - 1;
  const points = PRODUCTION_SERIES.slice(first, last + 1);

  const x = (index: number) => (index / Math.max(1, points.length - 1)) * W;
  const y = (value: number, max: number) => H - (value / max) * H;

  /** The path over a slice, so history and forecast can be drawn apart. */
  const path = (
    take: (point: (typeof points)[number]) => number,
    max: number,
    startAt: number,
    endAt: number,
  ) =>
    points
      .slice(startAt, endAt)
      .map((point, index) => {
        const at = x(startAt + index);
        return `${index === 0 ? "M" : "L"}${at.toFixed(1)} ${y(take(point), max).toFixed(1)}`;
      })
      .join(" ");

  // Where the history ends inside the visible window.
  const split = Math.max(0, Math.min(points.length, PRODUCTION_HISTORY_MONTHS - first));
  const years = Array.from({ length: to - from + 1 }, (_, index) => from + index);

  return (
    <div className="rounded-xl border border-mv-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex-1 text-[14px] font-bold leading-none text-mv-ink">
          Crude Oil &amp; Natural Gas Production
        </h3>

        <div className="flex items-center gap-1 rounded-lg border border-mv-line p-[3px]">
          {RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              aria-pressed={span === range.id}
              onClick={() => chooseSpan(range.id)}
              className={`cursor-pointer rounded-md px-[11px] py-[4px] text-[11.5px] font-semibold ${
                span === range.id
                  ? "bg-mv-green-deep text-white"
                  : "text-mv-slate hover:text-mv-green-deep"
              }`}
            >
              {range.id}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-[11.5px] text-mv-slate">
        <Key colour={OIL}>Oil Production (BBL)</Key>
        <Key colour={GAS}>Gas Production (MCF)</Key>
      </div>

      <div className="mt-2 flex gap-2">
        <Axis label="Oil Production (BBL)" colour={OIL} max={OIL_MAX} />

        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-[230px] w-full"
            role="img"
            aria-label="Monthly oil and gas production, history and forecast"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <line
                key={step}
                x1="0"
                x2={W}
                y1={H - step * H}
                y2={H - step * H}
                stroke="#eef0f2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* The forecast marker, where reported months stop. */}
            {split > 0 && split < points.length && (
              <line
                x1={x(split)}
                x2={x(split)}
                y1="0"
                y2={H}
                stroke="#f0a500"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {[
              { take: (p: (typeof points)[number]) => p.gas, max: GAS_MAX, colour: GAS },
              { take: (p: (typeof points)[number]) => p.oil, max: OIL_MAX, colour: OIL },
            ].map(({ take, max, colour }) => (
              <g key={colour}>
                <path
                  d={path(take, max, 0, split)}
                  fill="none"
                  stroke={colour}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  // Starts one point early, so the two halves meet.
                  d={path(take, max, Math.max(0, split - 1), points.length)}
                  fill="none"
                  stroke={colour}
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>

          <div className="mt-1 flex justify-between text-[10.5px] text-mv-muted">
            {years.map((year) => (
              <span key={year}>{year}</span>
            ))}
          </div>
          <div className="mt-[2px] text-center text-[11px] font-semibold text-mv-slate">
            Year
          </div>
        </div>

        <Axis label="Gas Production (MCF)" colour={GAS} max={GAS_MAX} right />
      </div>

      {/* The window, as two ends rather than one span. */}
      <div className="mt-3 border-t border-mv-line pt-3">
        <div className="flex items-center gap-3">
          <span className="w-[34px] shrink-0 text-[11px] font-semibold text-mv-slate">
            {from}
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              type="range"
              min={PRODUCTION_START_YEAR}
              max={PRODUCTION_END_YEAR}
              value={from}
              aria-label="First year"
              onChange={(event) => {
                const next = Math.min(Number(event.target.value), to);
                setFrom(next);
                setSpan("All");
              }}
              className="mv-range h-[6px] w-full cursor-pointer appearance-none rounded-full bg-mv-line"
            />
            <input
              type="range"
              min={PRODUCTION_START_YEAR}
              max={PRODUCTION_END_YEAR}
              value={to}
              aria-label="Last year"
              onChange={(event) => {
                const next = Math.max(Number(event.target.value), from);
                setTo(next);
                setSpan("All");
              }}
              className="mv-range h-[6px] w-full cursor-pointer appearance-none rounded-full bg-mv-line"
            />
          </div>

          <span className="w-[34px] shrink-0 text-right text-[11px] font-semibold text-mv-slate">
            {to}
          </span>
        </div>

        <div className="mt-2 text-center text-[11px] text-mv-muted">
          Drag either end to adjust the chart timeline ({PRODUCTION_START_YEAR} –{" "}
          {PRODUCTION_END_YEAR})
        </div>
      </div>
    </div>
  );
}

/** One side's scale, written bottom-up so it reads with the plot. */
function Axis({
  label,
  colour,
  max,
  right,
}: {
  label: string;
  colour: string;
  max: number;
  right?: boolean;
}) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => Math.round(max * step));

  return (
    <div className="flex shrink-0 items-stretch gap-1">
      {right && <Ticks ticks={ticks} colour={colour} align="left" />}
      <span
        className="grid place-items-center text-[9.5px] font-semibold"
        style={{ color: colour, writingMode: "vertical-rl", rotate: "180deg" }}
      >
        {label}
      </span>
      {!right && <Ticks ticks={ticks} colour={colour} align="right" />}
    </div>
  );
}

function Ticks({
  ticks,
  colour,
  align,
}: {
  ticks: number[];
  colour: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex h-[230px] w-[30px] flex-col-reverse justify-between py-[1px] text-[9.5px] ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{ color: colour }}
    >
      {ticks.map((tick) => (
        <span key={tick}>{tick === 0 ? "0" : `${Math.round(tick / 1000)}K`}</span>
      ))}
    </div>
  );
}

function Key({ colour, children }: { colour: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-[3px] w-5 rounded-full"
        style={{ background: colour }}
      />
      {children}
    </span>
  );
}
