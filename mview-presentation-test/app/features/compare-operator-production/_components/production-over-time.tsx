"use client";

import { BarChart3, LineChart } from "lucide-react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";

import { cardTitleClass } from "@/app/_components/typography";
import {
  axisLabel,
  formatMillions,
  metricNoun,
  sparklinePoints,
  type CompareMetric,
} from "@/lib/operator-compare";
import type { ProductionChartSeries } from "@/lib/operator-production-shape";

/**
 * One series' values for the selected metric.
 *
 * Replaces `seriesFor(operator, metric)` from the fixture module: the three arrays
 * arrive on the series itself now, so this is an index rather than a lookup.
 */
function valuesFor(
  series: ProductionChartSeries,
  metric: CompareMetric,
): number[] {
  return series[metric];
}

/**
 * "Production over time" — the design's `.cp-card` chart panel, and the only part
 * of this page with real interaction: a metric switch, a chart/table switch, a
 * hover crosshair, and a two-handle year brush.
 *
 * It owns all four of those states because nothing outside the card reads them.
 * The operator selection comes in as a prop; everything else stays here, so
 * scrubbing the brush re-renders one card rather than the page.
 *
 * WHY HAND-ROLLED SVG. A charting library is 40–120 KB gzipped for one line
 * chart, and it would land in the critical path of a page whose whole point is a
 * >90 mobile score. The prototype already specifies the geometry — axis inset,
 * smoothing, the area under the leading operator — so there is nothing to design,
 * only to render. React renders the elements directly; nothing here writes
 * `innerHTML`.
 *
 * WHY THE VIEWBOX IS MEASURED. The prototype uses a fixed 1040×400 viewBox, which
 * a phone scales down by 3×, taking its 12px axis labels to 4px. Sizing the
 * viewBox to the measured box instead keeps SVG units equal to CSS pixels, so a
 * label written at 12 renders at 12 on every screen. The wrapper's height is set
 * in CSS, not from JS, so the box is already its final size on the first paint
 * and measuring costs no layout shift.
 */

/** Plot insets. The left gutter holds the axis labels and the rotated title. */
const INSET = { top: 30, bottom: 42 } as const;

/** Below this the end pills are dropped and the gutters shrink. */
const NARROW = 560;

/** A narrow screen cannot spare 58px for the gutter. */
function leftInset(width: number): number {
  return width < NARROW ? 46 : 58;
}

/**
 * The right gutter, which exists to hold the end-of-line value pills.
 *
 * 18px when there are none to hold. Reserving the space unconditionally would waste a
 * tenth of the plot on a phone, where the pills are not drawn.
 */
function rightInset(width: number): number {
  return width < NARROW ? 18 : 78;
}

/** Height of an end pill, and the least vertical gap between two of them. */
const PILL = { width: 64, height: 22, gap: 24 } as const;

/**
 * Where each series' end-of-line pill sits.
 *
 * PUSHED APART WHEN THEY COLLIDE. Two operators finishing on similar volumes would
 * otherwise stack their pills on top of each other and neither would be readable. The
 * list is walked in y order and each pill nudged down to clear the one above, then the
 * whole run is shifted back up if it has run past the bottom of the plot — so the
 * labels stay inside the chart and in the same order as the lines they belong to.
 *
 * At most four of these exist, so the cost is not worth a smarter algorithm.
 */
function layoutPills(
  series: readonly ProductionChartSeries[],
  windows: readonly number[][],
  geometry: Geometry,
): { series: ProductionChartSeries; value: number; y: number }[] {
  const placed = series
    .map((entry, index) => {
      const values = windows[index] ?? [];
      const value = values[values.length - 1];
      return value === undefined
        ? null
        : { series: entry, value, y: geometry.y(value) };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.y - b.y);

  const top = INSET.top + PILL.height / 2;
  const bottom = INSET.top + geometry.innerHeight - PILL.height / 2;

  let previous = -Infinity;
  for (const entry of placed) {
    entry.y = Math.max(entry.y, previous + PILL.gap, top);
    previous = entry.y;
  }

  // If pushing down ran the last one off the plot, slide the whole run back up by
  // the overflow rather than clamping only the offender, which would re-collide.
  const last = placed[placed.length - 1];
  if (last && last.y > bottom) {
    const overflow = last.y - bottom;
    for (const entry of placed) entry.y -= overflow;
  }

  return placed;
}

/** The design's y-axis: about five gridlines, on a 1/2/2.5/5/10 step. */
function niceStep(max: number): number {
  const raw = max / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / magnitude;
  const step =
    fraction <= 1
      ? 1
      : fraction <= 2
        ? 2
        : fraction <= 2.5
          ? 2.5
          : fraction <= 5
            ? 5
            : 10;
  return step * magnitude;
}

/**
 * A cubic path through every point, with control points from each neighbour pair
 * — the design's easing. Not a spline that overshoots: control points are a sixth
 * of the span, so the curve stays inside the data.
 */
function smoothPath(points: readonly [number, number][]): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (!first) return "";
  if (points.length < 3) {
    return `M${points.map(([x, y]) => `${x},${y}`).join("L")}`;
  }

  let path = `M${first[0]},${first[1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return path;
}

/**
 * The rendered box, in CSS pixels. Null until the first measurement, which is
 * when the SVG starts drawing — one frame of reserved empty space is preferable
 * to a frame of illegible 4px labels.
 *
 * The first read is a synchronous `getBoundingClientRect` in the effect, NOT the
 * `ResizeObserver`'s initial callback. An observer only delivers during the
 * rendering step of the event loop, so a document that is not painting frames —
 * a background tab, a throttled webview, an offscreen render — would leave the
 * chart permanently blank waiting for a callback that never arrives. The observer
 * is kept for subsequent resizes, where it is the right tool.
 *
 * The updater compares before committing, so the observer's own initial callback
 * and every sub-pixel resize are no-ops rather than renders.
 */
function useMeasuredBox() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const { width, height } = element.getBoundingClientRect();

      // A zero box is not a measurement. It happens whenever the card is laid out
      // later than this runs — inside a collapsed ancestor, a hidden tab panel, or
      // a document that has not reached layout yet. Committing it would freeze the
      // chart at a degenerate geometry; leaving `box` null keeps the reserved space
      // empty until a real size arrives from the observer.
      if (width < 1 || height < 1) return;

      setBox((current) =>
        current &&
        Math.abs(current.width - width) < 1 &&
        Math.abs(current.height - height) < 1
          ? current
          : { width, height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, box };
}

interface Geometry {
  width: number;
  height: number;
  left: number;
  innerWidth: number;
  innerHeight: number;
  yMax: number;
  step: number;
  /** Pixel x of the point at visible index `i`. */
  x: (index: number) => number;
  /** Pixel y of a value. */
  y: (value: number) => number;
}

function buildGeometry(
  width: number,
  height: number,
  values: number[],
  count: number,
): Geometry {
  const left = leftInset(width);
  const right = rightInset(width);
  const innerWidth = Math.max(1, width - left - right);
  const innerHeight = Math.max(1, height - INSET.top - INSET.bottom);
  const peak = values.length > 0 ? Math.max(...values) : 0;
  const max = peak > 0 ? peak : 1;
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;

  return {
    width,
    height,
    left,
    innerWidth,
    innerHeight,
    yMax,
    step,
    x: (index) =>
      count === 1
        ? left + innerWidth / 2
        : left + (innerWidth * index) / (count - 1),
    y: (value) => INSET.top + innerHeight * (1 - value / yMax),
  };
}

export function ProductionOverTime({
  operators,
  years,
  scopeLabel = "All counties",
}: {
  operators: ProductionChartSeries[];
  /**
   * The chart's year axis, from the API rather than a constant.
   *
   * It used to be `COMPARE_YEARS`, a fixed ten-year array in the fixture module. The
   * series endpoint returns whichever years the selected operators actually reported
   * in, so the axis is data now and has to be threaded to everything that labels a
   * year. Every index below — the brush handles, the visible window, the table rows —
   * indexes THIS array.
   */
  years: readonly number[];
  /**
   * The acreage the figures were filtered to, for the strip above the plot.
   *
   * Defaults to "All counties" because that is what an unfiltered comparison is, and
   * because the caller holding the filters is the one place able to word it.
   */
  scopeLabel?: string;
}) {
  const [metric, setMetric] = useState<CompareMetric>("boe");
  const [view, setView] = useState<"chart" | "table">("chart");
  const radioName = useId();

  const lastYearIndex = Math.max(0, years.length - 1);

  /**
   * The brush window, held as indexes into `years`.
   *
   * RESET WHEN THE AXIS CHANGES. Applying a different year range returns a different
   * number of years, and an index into the old axis points somewhere else — or past
   * the end — in the new one. Keying the window to the axis length rather than
   * carrying it across is what stops a re-applied filter showing a window nobody
   * asked for.
   */
  const [range, setRange] = useState({ start: 0, end: lastYearIndex });
  const axisKey = years.length;
  const [knownAxis, setKnownAxis] = useState(axisKey);
  if (knownAxis !== axisKey) {
    setKnownAxis(axisKey);
    setRange({ start: 0, end: lastYearIndex });
  }

  const visibleYears = years.slice(range.start, range.end + 1);

  /** Move a handle, keeping at least two years in view and start before end. */
  function moveHandle(handle: "start" | "end", value: number) {
    setRange((current) => {
      let { start, end } = current;
      if (handle === "start") {
        start = value;
        if (start > end - 1) end = Math.min(lastYearIndex, start + 1);
      } else {
        end = value;
        if (end < start + 1) start = Math.max(0, end - 1);
      }
      return { start, end };
    });
  }

  return (
    <div className="rounded-2xl border border-mv-line bg-white px-[22px] py-5 shadow-mv max-[560px]:px-4">
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div>
          <h3 className={cardTitleClass}>Production over time</h3>
          <p className="mt-1 text-[13px] text-mv-muted">
            Reported annual volumes · historical record only, no projections.
          </p>
        </div>

        {/* Two states of one control, so `aria-pressed` says which is on rather
            than making a screen reader infer it from a colour. */}
        <div
          role="group"
          aria-label="Chart or table view"
          className="inline-flex overflow-hidden rounded-[10px] border border-mv-line bg-white"
        >
          {(
            [
              { id: "chart", label: "Chart", Icon: LineChart },
              { id: "table", label: "Table", Icon: BarChart3 },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`flex cursor-pointer items-center gap-[6px] border-0 px-[14px] py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep ${
                view === id
                  ? "bg-mv-tint text-mv-green-deep"
                  : "bg-white text-mv-muted hover:text-mv-ink"
              }`}
            >
              <Icon
                aria-hidden="true"
                className="h-[15px] w-[15px]"
                strokeWidth={1.9}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="mb-[6px] mt-4 flex flex-wrap gap-4 border-0 p-0">
        <legend className="sr-only">Which volume to chart</legend>
        {(
          [
            { value: "boe", label: "BOE" },
            { value: "oil", label: "Oil (bbl)" },
            { value: "gas", label: "Gas (Mcf)" },
          ] as const
        ).map((option) => (
          <label
            key={option.value}
            className="inline-flex cursor-pointer items-center gap-[7px] text-[13.5px] font-semibold text-mv-ink-soft"
          >
            <input
              type="radio"
              name={radioName}
              value={option.value}
              checked={metric === option.value}
              onChange={() => setMetric(option.value)}
              className="h-[15px] w-[15px] cursor-pointer accent-mv-green-deep"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {view === "chart" ? (
        <ChartView
          operators={operators}
          years={years}
          scopeLabel={scopeLabel}
          metric={metric}
          range={range}
          visibleYears={visibleYears}
          lastYearIndex={lastYearIndex}
          onMoveHandle={moveHandle}
        />
      ) : (
        <YearTable
          operators={operators}
          years={years}
          metric={metric}
          range={range}
        />
      )}

      <p className="mt-[14px] text-[12px] leading-[1.55] text-mv-muted">
        All lines are{" "}
        <b className="font-semibold text-mv-ink-soft">
          reported historical production
        </b>{" "}
        through {years.at(-1)} — no projections. Oil and gas are the
        operator&apos;s{" "}
        <b className="font-semibold text-mv-ink-soft">real filed volumes</b>,
        kept separate.
      </p>
    </div>
  );
}

/* ==========================================================================
   Chart, crosshair and brush
   ========================================================================== */

function ChartView({
  operators,
  years,
  scopeLabel,
  metric,
  range,
  visibleYears,
  lastYearIndex,
  onMoveHandle,
}: {
  operators: ProductionChartSeries[];
  /** The full axis. `visibleYears` is the brushed slice of it. */
  years: readonly number[];
  /** The acreage these figures were filtered to — "All counties", "Midland". */
  scopeLabel: string;
  metric: CompareMetric;
  range: { start: number; end: number };
  visibleYears: readonly number[];
  lastYearIndex: number;
  onMoveHandle: (handle: "start" | "end", value: number) => void;
}) {
  const { ref, box } = useMeasuredBox();
  const [hover, setHover] = useState<{ index: number; y: number } | null>(null);
  const gradientId = useId();

  const count = visibleYears.length;

  // Memoised because `ChartBody` is memoised: a fresh `windows` array on every
  // pointer move would defeat it and re-render four smoothed paths per frame.
  const windows = useMemo(
    () =>
      operators.map((operator) =>
        valuesFor(operator, metric).slice(range.start, range.end + 1),
      ),
    [operators, metric, range.start, range.end],
  );

  const geometry = useMemo(
    () =>
      box ? buildGeometry(box.width, box.height, windows.flat(), count) : null,
    [box, windows, count],
  );

  /**
   * Pointer, not mouse: the same handler then covers touch drags and pens, so a
   * phone gets the crosshair too. The index is snapped to the nearest year and
   * the state only changes when that index changes, so a slow drag across one
   * year costs no renders.
   */
  function trackPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!geometry || count === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const scale = geometry.width / rect.width;
    const xInView = (event.clientX - rect.left) * scale;
    const spacing = count > 1 ? geometry.innerWidth / (count - 1) : 1;
    const index = Math.max(
      0,
      Math.min(count - 1, Math.round((xInView - geometry.left) / spacing)),
    );
    const y = (event.clientY - rect.top) * scale;
    setHover((current) =>
      current && current.index === index && Math.abs(current.y - y) < 6
        ? current
        : { index, y },
    );
  }

  const hoverRows =
    hover && geometry
      ? operators
          .map((operator, index) => ({
            operator,
            value: windows[index]?.[hover.index] ?? 0,
          }))
          .sort((a, b) => b.value - a.value)
      : [];

  return (
    <>
      <div className="my-2 flex flex-wrap gap-4 text-[12.5px] font-semibold">
        {operators.map((operator) => (
          <span
            key={operator.key}
            className="flex items-center gap-2 text-mv-ink-soft"
          >
            <span
              aria-hidden="true"
              className="h-[3px] w-[14px] rounded-sm"
              style={{ background: operator.color }}
            />
            {operator.label}
          </span>
        ))}
      </div>

      {/* WHAT THIS PLOT COVERS, above it. The axis shows years and the legend shows
          operators, but neither says which acreage the figures were filtered to — so a
          chart read on its own, or screenshotted out of the page, lost that. The scope
          comes from the applied filters; the range from the brush. */}
      <p className="mb-[6px] flex flex-wrap items-baseline gap-x-2 text-[13px]">
        <span className="font-bold text-mv-ink">{scopeLabel}</span>
        <span className="tabular-nums text-mv-muted">
          {visibleYears[0]}–{visibleYears.at(-1)}
        </span>
      </p>

      <div
        // The height is CSS, not JS: the box is its final size before the chart
        // has measured anything, so nothing shifts when the SVG appears.
        ref={ref}
        onPointerMove={trackPointer}
        onPointerLeave={() => setHover(null)}
        className="relative h-[400px] touch-pan-y max-[900px]:h-[350px] max-[560px]:h-[300px]"
      >
        {geometry ? (
          <svg
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            width="100%"
            height="100%"
            role="img"
            aria-label={`${axisLabel(metric)} for ${operators.map((operator) => operator.name).join(", ")}, ${visibleYears[0]} to ${visibleYears.at(-1)}. The table view lists the same figures.`}
            className="block overflow-visible"
          >
            <defs>
              {/* One per series, in that series' own colour. `currentColor` would be
                  simpler but a gradient cannot inherit from the element that uses
                  it, so the colour is written into each stop. */}
              {operators.map((operator, index) => (
                <linearGradient
                  key={operator.key}
                  id={`${gradientId}-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0"
                    stopColor={operator.color}
                    stopOpacity=".18"
                  />
                  <stop offset="1" stopColor={operator.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            <ChartBody
              geometry={geometry}
              operators={operators}
              windows={windows}
              visibleYears={visibleYears}
              gradientId={gradientId}
            />

            {hover ? (
              <>
                <line
                  x1={geometry.x(hover.index)}
                  x2={geometry.x(hover.index)}
                  y1={INSET.top}
                  y2={INSET.top + geometry.innerHeight}
                  stroke="var(--color-mv-axis)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                {/* The hovered point on each line, ringed. The crosshair says which
                    year; these say which points on it the tooltip is reading. */}
                {hoverRows.map(({ operator, value }) => (
                  <circle
                    key={`ring-${operator.key}`}
                    cx={geometry.x(hover.index).toFixed(1)}
                    cy={geometry.y(value).toFixed(1)}
                    r="5"
                    fill="#fff"
                    stroke={operator.color}
                    strokeWidth="2.4"
                  />
                ))}
              </>
            ) : null}
          </svg>
        ) : null}

        {hover && geometry ? (
          <div
            // Flipped by transform rather than by measuring the tooltip: past the
            // midpoint it hangs off the left of the crosshair instead of the right.
            className="pointer-events-none absolute z-10 min-w-[150px] rounded-[10px] bg-mv-tooltip px-3 py-[10px] text-[12px] text-white shadow-mv"
            style={{
              left: geometry.x(hover.index),
              top: Math.min(
                Math.max(hover.y, INSET.top),
                INSET.top + geometry.innerHeight,
              ),
              transform:
                geometry.x(hover.index) > geometry.width / 2
                  ? "translate(calc(-100% - 14px), -50%)"
                  : "translate(14px, -50%)",
            }}
          >
            <div className="mb-[6px] text-[12.5px] font-extrabold">
              {visibleYears[hover.index]}
            </div>
            {hoverRows.map(({ operator, value }) => (
              <div
                key={operator.key}
                className="my-[3px] flex items-center justify-between gap-[7px]"
              >
                <span className="flex items-center gap-[6px] text-mv-on-deep-muted">
                  <span
                    aria-hidden="true"
                    className="h-[9px] w-[9px] rounded-full"
                    style={{ background: operator.color }}
                  />
                  {operator.label}
                </span>
                <b className="font-bold tabular-nums">{value.toFixed(2)}MM</b>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ---- year brush ---- */}
      <div className="mt-[18px] border-t border-mv-line-soft pt-[14px]">
        {/* The preset buttons are gone (requested). The readout stays: it is the
            only thing that says which window the plot is showing, and the brush
            below is now the sole way to change it. Double-clicking the strip still
            restores the full range. */}
        <p
          aria-live="polite"
          className="mb-[11px] text-[12.5px] font-bold text-mv-muted"
        >
          {visibleYears[0]} → {visibleYears.at(-1)} · {count} yrs
        </p>

        {/* The handles are draggable and the middle is pannable, neither of which a
            static strip advertises on its own. */}
        <p className="mb-[7px] text-[12px] text-mv-muted">
          Drag the handles to zoom · drag inside to pan
        </p>

        <div className="relative h-[46px] overflow-hidden rounded-[10px] border border-mv-line bg-mv-bg">
          <BrushSpark operators={operators} metric={metric} />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 border-x-[1.5px] border-[rgba(47,138,102,.55)] bg-[rgba(47,138,102,.10)]"
            style={{
              left: `${(range.start / lastYearIndex) * 100}%`,
              width: `${((range.end - range.start) / lastYearIndex) * 100}%`,
            }}
          />
          {/* Two overlaid sliders. The track ignores pointer events so a click
              lands on whichever thumb is nearest, as a native range would. */}
          {(
            [
              {
                handle: "start",
                value: range.start,
                label: "First year shown",
              },
              { handle: "end", value: range.end, label: "Last year shown" },
            ] as const
          ).map((slider) => (
            <input
              key={slider.handle}
              type="range"
              min={0}
              max={lastYearIndex}
              step={1}
              value={slider.value}
              onChange={(event) =>
                onMoveHandle(slider.handle, Number(event.target.value))
              }
              aria-label={slider.label}
              aria-valuetext={String(years[slider.value])}
              className="pointer-events-none absolute left-0 top-0 m-0 h-[46px] w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-[38px] [&::-moz-range-thumb]:w-[13px] [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-md [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-mv-green-deep [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-[3px] [&::-webkit-slider-thumb]:h-[38px] [&::-webkit-slider-thumb]:w-[13px] [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-mv-green-deep [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(13,14,23,.2)]"
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="mt-[7px] flex justify-between text-[12px] font-semibold text-mv-muted"
        >
          {years.map((year) => (
            <span key={year}>&apos;{String(year).slice(2)}</span>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Everything in the plot that the crosshair does not move. Memoised so hovering
 * diffs one `<line>` and the tooltip, not four smoothed paths and forty markers.
 */
const ChartBody = memo(function ChartBody({
  geometry,
  operators,
  windows,
  visibleYears,
  gradientId,
}: {
  geometry: Geometry;
  operators: ProductionChartSeries[];
  windows: number[][];
  visibleYears: readonly number[];
  gradientId: string;
}) {
  const count = visibleYears.length;
  const baseline = INSET.top + geometry.innerHeight;
  const gridlines = Math.round(geometry.yMax / geometry.step);

  // Ten "2016"s do not fit across a phone. Every other label is dropped there,
  // the last one always kept, so the axis still ends on the latest year.
  const labelStride = geometry.innerWidth / Math.max(1, count) < 34 ? 2 : 1;

  return (
    <g>
      {Array.from({ length: gridlines + 1 }, (_, index) => {
        const value = index * geometry.step;
        const y = geometry.y(value);
        return (
          <g key={value}>
            <line
              x1={geometry.left}
              x2={geometry.left + geometry.innerWidth}
              y1={y.toFixed(1)}
              y2={y.toFixed(1)}
              stroke="var(--color-mv-line-soft)"
              strokeDasharray="4 4"
            />
            <text
              x={geometry.left - 9}
              y={(y + 4).toFixed(1)}
              textAnchor="end"
              fontSize="12"
              fill="var(--color-mv-axis)"
            >
              {/* The unit rides on the label, which is why there is no rotated
                  caption beside the axis any more. Values are already in millions,
                  so `MM` is the suffix and zero stays bare. */}
              {value === 0 ? "0" : `${value.toFixed(2)}MM`}
            </text>
          </g>
        );
      })}

      {visibleYears.map((year, index) =>
        index % labelStride === 0 || index === count - 1 ? (
          <text
            key={year}
            x={geometry.x(index).toFixed(1)}
            y={baseline + 25}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-mv-axis)"
          >
            {year}
          </text>
        ) : null,
      )}

      {/* AN AREA UNDER EVERY SERIES, each in its own colour. It used to fill under
          slot one alone, which marked the anchor operator but left the other three
          reading as thinner lines rather than as comparable volumes. The fills are
          drawn in one pass before any stroke, so a later series' translucent fill
          cannot wash over an earlier series' line. */}
      {operators.map((operator, index) => {
        const values = windows[index] ?? [];
        if (values.length < 2) return null;
        return (
          <path
            key={`area-${operator.key}`}
            d={`${smoothPath(values.map((value, at) => [geometry.x(at), geometry.y(value)]))} L${geometry.x(values.length - 1).toFixed(1)},${baseline} L${geometry.x(0).toFixed(1)},${baseline} Z`}
            fill={`url(#${gradientId}-${index})`}
          />
        );
      })}

      {operators.map((operator, index) => {
        const points = (windows[index] ?? []).map(
          (value, index) =>
            [geometry.x(index), geometry.y(value)] as [number, number],
        );
        return (
          <g key={operator.key}>
            <path
              d={smoothPath(points)}
              fill="none"
              stroke={operator.color}
              // The leading series is drawn heavier. Taken from the render index
              // rather than a `slot` field, because the series arrive already in the
              // order they are meant to stack.
              strokeWidth={index === 0 ? 2.8 : 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map(([x, y], index) => (
              <circle
                key={visibleYears[index]}
                cx={x.toFixed(1)}
                cy={y.toFixed(1)}
                r="2.6"
                fill="#fff"
                stroke={operator.color}
                strokeWidth="1.6"
              />
            ))}
          </g>
        );
      })}

      {/* THE LAST VALUE, LABELLED WHERE THE LINE ENDS. Reading a final figure off a
          gridline is guesswork, and it is the number most often wanted. Dropped
          below `NARROW`, where there is no gutter to put them in and they would
          overlap the plot. */}
      {geometry.width >= NARROW
        ? layoutPills(operators, windows, geometry).map((pill) => (
            <g
              key={`pill-${pill.series.key}`}
              transform={`translate(${(geometry.left + geometry.innerWidth + 9).toFixed(1)},${pill.y.toFixed(1)})`}
            >
              <rect
                x="0"
                y={-PILL.height / 2}
                width={PILL.width}
                height={PILL.height}
                rx={PILL.height / 2}
                fill={pill.series.color}
              />
              <text
                x={PILL.width / 2}
                y="4"
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="700"
                fill="#fff"
              >
                {`${pill.value.toFixed(2)}M`}
              </text>
            </g>
          ))
        : null}
    </g>
  );
});

/** The full-record silhouette behind the brush, from the leading operator. */
function BrushSpark({
  operators,
  metric,
}: {
  operators: ProductionChartSeries[];
  metric: CompareMetric;
}) {
  const leader = operators[0];
  if (!leader) return null;

  const points = sparklinePoints(valuesFor(leader, metric), 100, 40);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="absolute inset-0 block h-full w-full"
    >
      <polygon points={`0,40 ${points} 100,40`} fill="rgba(47,138,102,.12)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-mv-spark)"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ==========================================================================
   Table view — the same figures as text
   ========================================================================== */

function YearTable({
  operators,
  years,
  metric,
  range,
}: {
  operators: ProductionChartSeries[];
  years: readonly number[];
  metric: CompareMetric;
  range: { start: number; end: number };
}) {
  const rows = [];
  for (let index = range.end; index >= range.start; index -= 1)
    rows.push(index);

  const totals = operators.map((operator) =>
    valuesFor(operator, metric)
      .slice(range.start, range.end + 1)
      .reduce((sum, value) => sum + value, 0),
  );

  return (
    <div className="relative mt-4 overflow-x-auto rounded-xl">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Annual {metricNoun(metric)} in millions, {years[range.start]} to{" "}
          {years[range.end]}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky top-0 z-[4] whitespace-nowrap bg-mv-table-head px-[15px] py-[13px] text-left text-[12px] font-semibold uppercase tracking-[.04em] text-white"
            >
              Year
            </th>
            {operators.map((operator) => (
              <th
                key={operator.key}
                scope="col"
                className="sticky top-0 z-[4] whitespace-nowrap bg-mv-table-head px-[15px] py-[13px] text-right text-[12px] font-semibold uppercase tracking-[.04em] text-white"
              >
                <span
                  aria-hidden="true"
                  className="mr-[6px] inline-block h-[11px] w-[11px] rounded-sm align-[-1px]"
                  style={{ background: operator.color }}
                />
                {operator.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((yearIndex) => (
            <tr key={yearIndex} className="[&:hover>*]:bg-mv-row-hover">
              <th
                scope="row"
                className="whitespace-nowrap border-b border-mv-line-soft bg-white px-[15px] py-[13px] text-left font-bold text-mv-ink"
              >
                {years[yearIndex]}
              </th>
              {operators.map((operator) => (
                <td
                  key={operator.key}
                  className="whitespace-nowrap border-b border-mv-line-soft bg-white px-[15px] py-[13px] text-right tabular-nums text-mv-ink-soft"
                >
                  {(valuesFor(operator, metric)[yearIndex] ?? 0).toFixed(1)}M
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th
              scope="row"
              className="border-t-[1.5px] border-mv-line bg-mv-bg px-[15px] py-[13px] text-left font-bold text-mv-ink"
            >
              Cumulative
            </th>
            {totals.map((total, slot) => (
              <td
                key={operators[slot]?.key ?? slot}
                className="border-t-[1.5px] border-mv-line bg-mv-bg px-[15px] py-[13px] text-right font-bold tabular-nums text-mv-ink"
              >
                {formatMillions(total)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
