"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { type MapProductionPoint } from "@/lib/map-api";

/*
 * Crude oil and natural gas, month by month, history then forecast.
 *
 * The series is the well's own: `/wells/{api}/production` returns every month
 * on file followed by the forecast months, oldest first. Nothing here is
 * generated — the axes, the year labels and the slider bounds are all read off
 * the points that arrived.
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `"2011-04"` → `"Apr 2011"`. */
function monthName(month: string): string {
  const [year, index] = month.split("-");
  return `${MONTHS[Number(index) - 1] ?? index} ${year}`;
}

/*
 * This month, as the series spells months.
 *
 * `useSyncExternalStore` rather than state set from an effect: the clock is a
 * browser fact, and the server has no business guessing it. The server
 * snapshot is null, so the first paint has no marker and the client draws it
 * on hydration — a string snapshot is stable by value, so nothing re-renders
 * in a loop.
 */
const subscribeToNothing = () => () => {};

function useCurrentMonth(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    },
    () => null,
  );
}

/** Keeps a month inside the series, whatever a box was typed with. */
function clamp(month: string, first: string, last: string): string {
  if (first && month < first) return first;
  if (last && month > last) return last;
  return month;
}

/** `"2011-04"` → `2011`. */
function yearOf(month: string): number {
  return Number(month.slice(0, 4));
}

/**
 * A round number above the peak, so the axis reads in whole steps.
 *
 * The ticks are quarters of this, and `1,247` on an axis is noise — the point
 * of the axis is the shape of the curve against something even.
 */
function ceilingFor(peak: number): number {
  if (peak <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  return Math.ceil(peak / magnitude) * magnitude;
}

export function ProductionChart({
  points,
  historyThrough,
  loading = false,
  error = null,
}: {
  points: MapProductionPoint[];
  /** The last reported month; everything after it is forecast. */
  historyThrough?: string | null;
  loading?: boolean;
  error?: string | null;
}) {
  const now = useCurrentMonth();
  /** Whether the two month boxes are on show. */
  const [customOpen, setCustomOpen] = useState(false);
  /** Which month the pointer is over, as an index into the visible series. */
  const [hovered, setHovered] = useState<number | null>(null);
  /*
   * The chosen window, or null for the whole series.
   *
   * One control sets this: the two month boxes behind "Custom range". The
   * 1Y/2Y/5Y presets that used to sit here were a second way of saying the
   * same thing, and a row of five buttons for one choice was more to read than
   * it was worth.
   */
  const [window, setWindow] = useState<{ from: string; to: string } | null>(
    null,
  );

  const series = useMemo(
    () =>
      points.map((point) => ({
        month: point.month,
        year: yearOf(point.month),
        oil: point.oil ?? 0,
        gas: point.gas ?? 0,
      })),
    [points],
  );

  const firstMonth = series.length > 0 ? series[0].month : "";
  const lastMonth = series.length > 0 ? series[series.length - 1].month : "";
  const from = window ? clamp(window.from, firstMonth, lastMonth) : firstMonth;
  const to = window ? clamp(window.to, firstMonth, lastMonth) : lastMonth;

  const shown = series.filter(
    (point) => point.month >= from && point.month <= to,
  );

  /* The two ends as positions in the series, for the handles below. */
  const fromAt = Math.max(
    0,
    series.findIndex((point) => point.month >= from),
  );
  const toAt = Math.max(
    0,
    series.findLastIndex((point) => point.month <= to),
  );
  const lastAt = Math.max(0, series.length - 1);

  const oilMax = ceilingFor(Math.max(...shown.map((p) => p.oil), 0));
  const gasMax = ceilingFor(Math.max(...shown.map((p) => p.gas), 0));

  const x = (index: number) => (index / Math.max(1, shown.length - 1)) * W;
  const y = (value: number, max: number) => H - (value / max) * H;

  /** The path over a slice, so history and forecast can be drawn apart. */
  const path = (
    take: (point: (typeof shown)[number]) => number,
    max: number,
    startAt: number,
    endAt: number,
  ) =>
    shown
      .slice(startAt, endAt)
      .map((point, index) => {
        const at = x(startAt + index);
        return `${index === 0 ? "M" : "L"}${at.toFixed(1)} ${y(take(point), max).toFixed(1)}`;
      })
      .join(" ");

  /*
   * Where the past ends inside the visible window — this month.
   *
   * The endpoint sends reported and projected months in one list without
   * marking the join, and the marker belongs at today: everything up to this
   * month has happened, everything after it has not. The record's last
   * reported month stands in until the clock is available on the client, and
   * with neither the whole series is drawn solid.
   */
  const boundary = now ?? historyThrough;
  const split = boundary
    ? shown.filter((point) => point.month <= boundary).length
    : shown.length;

  /* One label per year present in the window, not per year in the range. */
  const years = [...new Set(shown.map((point) => point.year))];

  return (
    <div className="rounded-xl border border-mv-line bg-white p-4">
      {/* The title, and every control for this chart on the line with it:
          one place to look, at the top of the card where a reader arrives
          rather than at the bottom where they leave. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-[14px] font-bold leading-none text-mv-ink">
          Crude Oil &amp; Natural Gas Production
        </h3>

        {series.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[12px] font-semibold text-mv-ink">
              {monthName(from)} – {monthName(to)}
            </span>
            <button
              type="button"
              aria-expanded={customOpen}
              onClick={() => setCustomOpen((open) => !open)}
              className={`cursor-pointer rounded-lg border px-[11px] py-[6px] text-[11.5px] font-semibold ${
                customOpen || window !== null
                  ? "border-mv-green-deep text-mv-green-deep"
                  : "border-mv-line text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
              }`}
            >
              Custom range
            </button>

            {window && (
              <button
                type="button"
                onClick={() => {
                  setWindow(null);
                  setCustomOpen(false);
                }}
                className="cursor-pointer text-[11.5px] font-semibold text-mv-green-deep hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {customOpen && series.length > 0 && (
        /*
          Two lists of months, not two date pickers.

          `<input type="month">` opens the browser's own calendar — a grid of
          twelve abbreviations with most of them greyed out, a year stepper and
          two buttons that mean nothing here ("This month" on a well that
          stopped producing in 2023). A plain list of the months this well
          actually has is shorter to read and cannot offer a month that does
          not exist: the To list starts at From, and the From list ends at To.
        */
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-mv-line bg-[#fafbfa] px-3 py-[10px]">
          <label className="flex items-center gap-2 text-[11px] text-mv-muted">
            From
            <select
              value={from}
              onChange={(event) => setWindow({ from: event.target.value, to })}
              className="cursor-pointer rounded-lg border border-mv-line bg-white px-[8px] py-[5px] text-[11.5px] font-semibold text-mv-ink outline-none focus:border-mv-green-deep"
            >
              {series
                .filter((point) => point.month <= to)
                .map((point) => (
                  <option key={point.month} value={point.month}>
                    {monthName(point.month)}
                  </option>
                ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-[11px] text-mv-muted">
            To
            <select
              value={to}
              onChange={(event) => setWindow({ from, to: event.target.value })}
              className="cursor-pointer rounded-lg border border-mv-line bg-white px-[8px] py-[5px] text-[11.5px] font-semibold text-mv-ink outline-none focus:border-mv-green-deep"
            >
              {series
                .filter((point) => point.month >= from)
                .map((point) => (
                  <option key={point.month} value={point.month}>
                    {monthName(point.month)}
                  </option>
                ))}
            </select>
          </label>

          <span className="ml-auto text-[11px] text-mv-muted">
            {monthName(firstMonth)} – {monthName(lastMonth)} on file
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-[11.5px] text-mv-slate">
        <Key colour={OIL}>Oil Production (BBL)</Key>
        <Key colour={GAS}>Gas Production (MCF)</Key>
      </div>

      {/* The three states this can be in, each in the plot's own space so the
          card keeps its height. */}
      {loading || error || shown.length === 0 ? (
        <div className="mt-2 grid h-[230px] place-items-center">
          {loading ? (
            <span className="flex items-center gap-[10px] text-[13px] text-mv-slate">
              <span
                aria-hidden="true"
                className="h-[16px] w-[16px] animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
              />
              Loading production…
            </span>
          ) : (
            <span
              className={`text-[13px] ${error ? "text-mv-red" : "text-mv-muted"}`}
            >
              {error ?? "No production reported for this well."}
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="mt-2 flex gap-2">
            <Axis label="Oil Production (BBL)" colour={OIL} max={oilMax} />

            <div className="min-w-0 flex-1">
              {/*
                The pointer is read off the container rather than the SVG's own
                coordinates: `preserveAspectRatio="none"` stretches the viewBox
                to the card's width, so a screen x maps to a month by share of
                the width and nothing else.
              */}
              <div
                className="relative"
                onMouseMove={(event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  if (box.width === 0) return;
                  const share = (event.clientX - box.left) / box.width;
                  const index = Math.round(share * (shown.length - 1));
                  setHovered(Math.min(Math.max(index, 0), shown.length - 1));
                }}
                onMouseLeave={() => setHovered(null)}
              >
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

                  {/*
                    The marker stands on the current month, not on the first
                    month after it.

                    `split` counts the months that have happened, so `x(split)`
                    is the month *after* the last of them: the line landed on
                    the first forecast month, and hovering it read "Sep" where
                    the marker was meant to say "Aug". `split - 1` is the
                    current month, which is also where the dashed half starts,
                    so the two meet on the same pixel.
                  */}
                  {split > 0 && split < shown.length && (
                    <line
                      x1={x(split - 1)}
                      x2={x(split - 1)}
                      y1="0"
                      y2={H}
                      stroke="#f0a500"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}

                  {[
                    {
                      take: (p: (typeof shown)[number]) => p.gas,
                      max: gasMax,
                      colour: GAS,
                    },
                    {
                      take: (p: (typeof shown)[number]) => p.oil,
                      max: oilMax,
                      colour: OIL,
                    },
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
                        d={path(
                          take,
                          max,
                          Math.max(0, split - 1),
                          shown.length,
                        )}
                        fill="none"
                        stroke={colour}
                        strokeWidth="2"
                        strokeDasharray="6 5"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  ))}

                  {/* The guide under the pointer. Drawn after the curves so it
                    sits over them, and the dots after it. */}
                  {hovered !== null && shown[hovered] && (
                    <g>
                      <line
                        x1={x(hovered)}
                        x2={x(hovered)}
                        y1="0"
                        y2={H}
                        stroke="#9aa3ab"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Circles carry `vectorEffect` too, or the stretch of the
                        viewBox turns them into ellipses. */}
                      <circle
                        cx={x(hovered)}
                        cy={y(shown[hovered].oil, oilMax)}
                        r="3"
                        fill="#fff"
                        stroke={OIL}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={x(hovered)}
                        cy={y(shown[hovered].gas, gasMax)}
                        r="3"
                        fill="#fff"
                        stroke={GAS}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )}
                </svg>

                {hovered !== null && shown[hovered] && (
                  <ReadingCard
                    point={shown[hovered]}
                    share={hovered / Math.max(1, shown.length - 1)}
                    forecast={hovered >= split}
                  />
                )}
              </div>

              <div className="mt-1 flex justify-between text-[10.5px] text-mv-muted">
                {years.map((year) => (
                  <span key={year}>{year}</span>
                ))}
              </div>
              <div className="mt-[2px] text-center text-[11px] font-semibold text-mv-slate">
                Year
              </div>
            </div>

            <Axis
              label="Gas Production (MCF)"
              colour={GAS}
              max={gasMax}
              right
            />
          </div>

          {/* ---------------- the window, as a track ----------------
              The dragging half of the same choice the boxes make: a month is
              easier to find by sliding to it than by naming it, and easier to
              name than to slide to when it is one of two hundred. Both write
              the same window. One track under two handles — see
              `.mv-range-overlay`. */}
          <div className="mt-3 flex items-center gap-3 border-t border-mv-line pt-3">
            <span className="w-[58px] shrink-0 text-[11px] font-semibold text-mv-slate">
              {monthName(from)}
            </span>

            <div className="relative h-[6px] min-w-0 flex-1">
              <div className="absolute inset-0 rounded-full bg-mv-line" />
              <div
                className="absolute inset-y-0 rounded-full bg-mv-green-deep"
                style={{
                  left: `${(fromAt / Math.max(1, lastAt)) * 100}%`,
                  right: `${100 - (toAt / Math.max(1, lastAt)) * 100}%`,
                }}
              />

              <input
                type="range"
                min={0}
                max={lastAt}
                value={fromAt}
                aria-label="First month"
                onChange={(event) => {
                  const next = Math.min(Number(event.target.value), toAt);
                  setWindow({ from: series[next].month, to });
                }}
                className="mv-range mv-range-overlay cursor-pointer appearance-none"
              />
              <input
                type="range"
                min={0}
                max={lastAt}
                value={toAt}
                aria-label="Last month"
                onChange={(event) => {
                  const next = Math.max(Number(event.target.value), fromAt);
                  setWindow({ from, to: series[next].month });
                }}
                className="mv-range mv-range-overlay cursor-pointer appearance-none"
              />
            </div>

            <span className="w-[58px] shrink-0 text-right text-[11px] font-semibold text-mv-slate">
              {monthName(to)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * What the pointer is over: the month, and both figures.
 *
 * Placed by share of the width, and flipped to the other side of the guide
 * past two thirds across so it never hangs off the card. `pointer-events-none`
 * because it sits over the very area being tracked.
 */
function ReadingCard({
  point,
  share,
  forecast,
}: {
  point: { month: string; oil: number; gas: number };
  share: number;
  forecast: boolean;
}) {
  const flip = share > 0.66;

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 w-max"
      style={{
        left: `${share * 100}%`,
        transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
      }}
    >
      <div className="rounded-lg border border-mv-line bg-white px-[11px] py-[8px] shadow-mv-lg">
        <div className="flex items-center gap-2 text-[11px] font-bold leading-none text-mv-ink">
          {monthName(point.month)}
          {forecast && (
            <span className="rounded bg-mv-amber-bg px-[5px] py-[2px] text-[8.5px] font-extrabold uppercase leading-none tracking-[.07em] text-mv-amber">
              Forecast
            </span>
          )}
        </div>

        <dl className="mt-[7px] space-y-[4px] text-[11px] leading-none">
          <Reading colour={OIL} label="Oil" value={point.oil} unit="BBL" />
          <Reading colour={GAS} label="Gas" value={point.gas} unit="MCF" />
        </dl>
      </div>
    </div>
  );
}

function Reading({
  colour,
  label,
  value,
  unit,
}: {
  colour: string;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: colour }}
      />
      <dt className="text-mv-muted">{label}</dt>
      <dd className="ml-auto flex items-baseline gap-[4px] pl-3">
        <span className="font-bold tabular-nums text-mv-ink">
          {Math.round(value).toLocaleString("en-US")}
        </span>
        <span className="text-[9.5px] text-mv-muted">{unit}</span>
      </dd>
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
      className={`flex h-[230px] w-[34px] flex-col-reverse justify-between py-[1px] text-[9.5px] ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{ color: colour }}
    >
      {ticks.map((tick) => (
        <span key={tick}>
          {tick === 0
            ? "0"
            : tick >= 1000
              ? `${Math.round(tick / 1000)}K`
              : tick.toLocaleString("en-US")}
        </span>
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
