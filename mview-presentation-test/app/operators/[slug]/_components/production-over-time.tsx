"use client";

import { CalendarDays } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { cardTitleClass } from "@/app/_components/typography";
import {
  formatVolume,
  summariseSeries,
  yearRangeOptions,
  type OperatorCompareYear,
} from "@/lib/operator-detail";

/**
 * "Production over time" — reported annual volumes, with a year-range select.
 *
 * A client component because the range is interactive, but a small one: the series
 * is at most ten points, so the chart is recomputed in a `useMemo` rather than
 * measured or animated. Unlike the compare tool's chart this one has no crosshair
 * and no brush, so it needs no viewBox measurement — the axis labels are drawn
 * outside the scaled area, which is what let the fixed viewBox stay.
 *
 * Rendered only when the operator has a filed series. The route checks that; there
 * is no empty state in here.
 */

const VIEW = { width: 960, height: 300 } as const;
const INSET = { top: 16, right: 14, bottom: 30, left: 58 } as const;

export function ProductionOverTime({
  series,
}: {
  series: readonly OperatorCompareYear[];
}) {
  const options = useMemo(() => yearRangeOptions(series), [series]);
  const [fromYear, setFromYear] = useState(() => options[0]?.from ?? 0);
  const selectId = useId();

  const summary = useMemo(
    () => summariseSeries(series, fromYear),
    [series, fromYear],
  );

  const window = useMemo(
    () => series.filter((entry) => entry.year >= fromYear),
    [series, fromYear],
  );

  const geometry = useMemo(() => {
    const innerWidth = VIEW.width - INSET.left - INSET.right;
    const innerHeight = VIEW.height - INSET.top - INSET.bottom;
    const peak = window.reduce((top, entry) => Math.max(top, entry.boe), 0) || 1;
    // Round the axis up to a whole "nice" step so the top gridline is a readable
    // number rather than the exact peak.
    const magnitude = Math.pow(10, Math.floor(Math.log10(peak)));
    const max = Math.ceil(peak / magnitude) * magnitude;
    const last = window.length - 1 || 1;

    return {
      innerWidth,
      innerHeight,
      max,
      x: (index: number) => INSET.left + (innerWidth * index) / last,
      y: (value: number) =>
        INSET.top + innerHeight * (1 - value / max),
    };
  }, [window]);

  const line = window
    .map(
      (entry, index) =>
        `${index === 0 ? "M" : "L"}${geometry.x(index).toFixed(1)} ${geometry.y(entry.boe).toFixed(1)}`,
    )
    .join(" ");

  const area = `${line} L${geometry.x(window.length - 1).toFixed(1)} ${(INSET.top + geometry.innerHeight).toFixed(1)} L${geometry.x(0).toFixed(1)} ${(INSET.top + geometry.innerHeight).toFixed(1)} Z`;

  const gridlines = 4;

  return (
    <div className="rounded-2xl border border-mv-line bg-white px-[22px] py-5 shadow-mv max-[560px]:px-4">
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div>
          <h2 className={cardTitleClass}>Production over time</h2>
          <p className="mt-1 text-[13px] text-mv-muted">
            Reported annual volumes across covered counties · oil (bbl), gas
            (Mcf), BOE
          </p>
        </div>

        <label
          htmlFor={selectId}
          className="inline-flex items-center gap-2 rounded-[10px] border border-mv-line px-3 py-2"
        >
          <CalendarDays
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-mv-green-deep"
            strokeWidth={1.9}
          />
          <span className="sr-only">Year range</span>
          <select
            id={selectId}
            value={fromYear}
            onChange={(event) => setFromYear(Number(event.target.value))}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-[13px] font-semibold text-mv-ink outline-none"
          >
            {options.map((option) => (
              <option key={option.from} value={option.from}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
        {(
          [
            ["Oil", summary.oil, "bbl"],
            ["Gas", summary.gas, "Mcf"],
            ["BOE", summary.boe, "BOE"],
          ] as const
        ).map(([label, value, unit]) => (
          <div
            key={label}
            className="rounded-xl border border-mv-line bg-mv-bg px-4 py-3"
          >
            <p className="text-[12px] font-bold uppercase tracking-[.05em] text-mv-muted">
              {label}
            </p>
            <p className="mt-1 text-[22px] font-bold tracking-[-.02em] tabular-nums text-mv-ink">
              {formatVolume(value)}{" "}
              <span className="text-[12px] font-semibold text-mv-muted">
                {unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="mt-4 block h-auto w-full overflow-visible"
        role="img"
        aria-label={`Annual barrels of oil equivalent, ${summary.years[0]} to ${summary.years.at(-1)}. Peak ${formatVolume(geometry.max)} BOE.`}
      >
        <defs>
          <linearGradient id="potFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-mv-green)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--color-mv-green)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridlines + 1 }, (_, index) => {
          const value = (geometry.max / gridlines) * index;
          const y = geometry.y(value);
          return (
            <g key={index}>
              <line
                x1={INSET.left}
                x2={VIEW.width - INSET.right}
                y1={y.toFixed(1)}
                y2={y.toFixed(1)}
                stroke="var(--color-mv-line-soft)"
              />
              <text
                x={INSET.left - 9}
                y={(y + 4).toFixed(1)}
                textAnchor="end"
                fontSize="12"
                fill="var(--color-mv-axis)"
              >
                {formatVolume(value)}
              </text>
            </g>
          );
        })}

        {window.map((entry, index) => (
          <text
            key={entry.year}
            x={geometry.x(index).toFixed(1)}
            y={VIEW.height - 8}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-mv-axis)"
          >
            {entry.year}
          </text>
        ))}

        <path d={area} fill="url(#potFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-mv-green-deep)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {window.map((entry, index) => (
          <circle
            key={entry.year}
            cx={geometry.x(index).toFixed(1)}
            cy={geometry.y(entry.boe).toFixed(1)}
            r="3"
            fill="#fff"
            stroke="var(--color-mv-green-deep)"
            strokeWidth="1.8"
          />
        ))}
      </svg>

      <p className="mt-3 text-[12px] leading-[1.55] text-mv-muted">
        Oil in barrels (bbl) · Gas in thousand cubic feet (Mcf) · BOE in barrels of
        oil equivalent
        {summary.change !== null ? (
          <>
            {" · "}
            <b className="font-semibold text-mv-ink-soft">
              {summary.change >= 0 ? "+" : ""}
              {summary.change.toFixed(1)}%
            </b>{" "}
            BOE across the range
          </>
        ) : null}
      </p>
    </div>
  );
}
