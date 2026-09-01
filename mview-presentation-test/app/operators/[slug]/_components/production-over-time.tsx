"use client";

/* `Info` went with the units footnote defect 139 removed — it was that line's icon
   and had no other caller. */
import { Droplet } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cardTitleClass } from "@/app/_components/typography";
import { titleCase } from "@/lib/text-case";

import { ALL_COUNTIES, CountyFilter } from "./county-filter";
import { useProductionGraph, type YearRange } from "./use-production-graph";
import { YearBrush } from "./year-brush";

/**
 * "Production over time" — reported annual volumes from
 * `POST /api/v1/operators/production-graph`, styled to the approved design.
 *
 * THE FILTER IS COUNTY AND YEARS. "All counties" omits the `county` key; picking one
 * sends that one name. The years come from the brush.
 *
 * THE OPTIONS ARE THIS OPERATOR'S COUNTIES, not every county in Texas. The dropdown
 * first listed all ~255 from the shared `/operators/counties` read, which meant 176 of
 * Pioneer's options were counties it has no wells in — every one of them charting
 * empty. The operator's own list already arrives with `/operators/details`, so this
 * needs no second read at all: fewer requests, and every option returns data.
 *
 * ALL COUNTIES IS AN OMITTED KEY, NOT A LIST OF ALL OF THEM. The endpoint treats a
 * missing `county` as every county, which it proves by returning the same 2025 oil
 * figure — 214,403,548 — that naming Pioneer's 79 counties produced. So the operator-
 * wide series is now the smaller request, not the larger one.
 *
 * THE YEAR RANGE IS THE API'S, NOT A CLIENT SLICE. Dragging the brush sends
 * `start_year`/`end_year` and plots what comes back, so the totals in the summary
 * cards are the source's own sums over the reader's range rather than something added
 * up here. The drag is debounced and the previous request aborted, so moving the handles
 * across twenty years costs one call, not twenty.
 *
 * BOE IS NOT PLOTTED, also on request, even though the response carries `BOEValues`
 * and the design shows a third series. `toProductionYears` drops it at the boundary,
 * so there are two series and two summary cards rather than three.
 *
 * FIGURES ARE THE RESPONSE'S OWN, UNCONVERTED (requested). This divided every value by
 * a million and suffixed it "MM", on the belief that the endpoint answers in barrels
 * and Mcf. It does not: it declares `oil_unit: "MBBL"` and `gas_unit: "MMCF"`, so
 * Diamondback's 2025 oil of 212,077.007 MBBL was drawn as "0.21MM" — three orders of
 * magnitude out, and labelled with a unit the response never used. Axis, cards, tooltip
 * and end pills now print the number the API sent, and the unit beside it is the one
 * the API named.
 *
 * EACH AXIS CARRIES ITS OWN UNIT, and can only do so because each series now has its
 * own axis (defect 146). While oil and gas shared one y-axis it could carry no unit
 * honestly — they arrive in DIFFERENT units — and the "MM" suffix that used to sit
 * there papered over exactly that. The caption above each axis is read from the
 * response, so it follows the endpoint when a county selection rescales it from
 * MBBL/MMCF to MMBBL/BCF (defect 147). Units also stay where they belong to a single
 * series: the summary cards, the tooltip rows and the subtitle.
 *
 * THE PLOT IS ALWAYS AN AREA. The line/area toggle is gone on request, so the fill is
 * unconditional rather than a mode nothing can switch. The subtitle and the footnote
 * carry the units, now named by the response rather than written in here.
 *
 * ZOOM IS A VISIBLE CONTROL. `YearBrush` under the x-axis owns the range: drag its
 * handles to narrow, drag inside to pan, press Reset or double-click to restore. The
 * wheel and the plot-area drag still work for anyone who reaches for them, but the
 * chart no longer depends on a gesture nothing on screen advertises and touch does not
 * have. All of them write the same `zoom` index window, so the two paths cannot
 * disagree about what is shown.
 */

const VIEW = { width: 1040, height: 400 } as const;
/* The right gutter holds two things since defect 146 gave gas its own axis: the gas
   tick labels at the far right, and the end pills inside them. `AXIS_RIGHT` is the
   slice reserved for the labels; the rest is the pills'. */
const INSET = { top: 22, right: 190, bottom: 46, left: 96 } as const;
const AXIS_RIGHT = 62;
/** Right edge the end pills may not cross, so they never reach the tick labels. */
const PILL_LIMIT = VIEW.width - AXIS_RIGHT - 8;

/**
 * How wide one character of an end pill's label is, and the padding either side.
 *
 * The labels are digits, commas and a full stop at `fontSize 14, fontWeight 700`,
 * which advance at very close to the same width — so one number covers every
 * character that can appear. See defect 150 at the pill itself for why the width has
 * to be computed rather than fixed.
 */
const PILL_CHAR = 8.4;
const PILL_PAD = 11;

/** The design's two plotted series. BOE is deliberately absent. */
const SERIES = [
  {
    key: "oil",
    label: "Oil Produced",
    colour: "var(--color-mv-chart-oil)",
  },
  {
    key: "gas",
    label: "Gas Produced",
    colour: "var(--color-mv-down)",
  },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

/**
 * The API's number, printed as sent.
 *
 * NO DIVISION AND NO ROUNDING. Snapped to thousandths only because that is the
 * precision the response actually carries — its values arrive with at most three
 * decimals — so this removes float drift from any addition without discarding data.
 */
const exact = (value: number) =>
  (Math.round(value * 1000) / 1000).toLocaleString("en-US", {
    maximumFractionDigits: 20,
  });

export function ProductionOverTime({
  operatorNumber,
  operatorCounties,
}: {
  operatorNumber: string;
  /**
   * Every county the operator reports in, from `/operators/details`. Drives both the
   * all-counties payload and the dropdown's options, so the two cannot disagree.
   */
  operatorCounties: readonly string[];
}) {
  const [county, setCounty] = useState<string>(ALL_COUNTIES);
  const [hover, setHover] = useState<number | null>(null);
  /**
   * The brush's live window, as indices into the full history. It moves on every drag
   * frame, which is why it is not what gets sent.
   */
  const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null);
  /** The settled year range that becomes the request. Null means the full history. */
  const [range, setRange] = useState<YearRange | null>(null);
  const gradientId = useId();
  const dragFrom = useRef<{ x: number; start: number; end: number } | null>(
    null,
  );

  /** What goes on the wire: one county, or the key omitted entirely. */
  const apiCounty = county === ALL_COUNTIES ? null : county;

  /** Alphabetical, so the dropdown reads in a predictable order. */
  const options = useMemo(
    () => [...operatorCounties].sort((a, b) => a.localeCompare(b)),
    [operatorCounties],
  );

  /**
   * What the chart is currently showing, in the listing's label format. Named once
   * because it is printed above the plot, spoken in the SVG's `aria-label` and used in
   * the empty state — three places that must never disagree about the filter.
   */
  const appliedCounty =
    /* DEFECT 132 — "Andrews County", "Atascosa County" … on every row of a list
       whose own label is "All counties". The name alone is the option. */
    county === ALL_COUNTIES ? "All counties" : titleCase(county);

  const graph = useProductionGraph({
    operatorNumber,
    county: apiCounty,
    range,
  });

  /**
   * What the response called this series' figures — `MBBL`, `MMCF`.
   *
   * READ FROM THE RESPONSE, NEVER ASSUMED. The two series are in different units, so
   * there is no single unit for this chart and nothing may print one. Empty until the
   * first response lands, and empty if the endpoint ever stops declaring them: an
   * unlabelled number is recoverable, a confidently wrong label is not.
   */
  const unitFor = (key: SeriesKey) =>
    key === "oil" ? (graph.range?.oilUnit ?? "") : (graph.range?.gasUnit ?? "");

  /** The full history — the brush's domain, and never narrowed by it. */
  const all = useMemo(() => graph.full?.rows ?? [], [graph.full]);
  /** The selected range — what is plotted. Straight from the API, not sliced here. */
  const data = useMemo(() => graph.range?.rows ?? [], [graph.range]);

  /*
   * The brush moves continuously; the request must not. A settled window becomes a
   * year range after a short pause, and the hook aborts anything still in flight — so
   * a drag across the whole history is one request rather than one per frame.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (zoom === null || all.length === 0) {
        setRange(null);
        return;
      }
      const start = all[zoom.start]?.year;
      const end = all[zoom.end]?.year;
      setRange(
        start === undefined || end === undefined ? null : { start, end },
      );
    }, 260);
    return () => clearTimeout(timer);
  }, [zoom, all]);

  /**
   * DEFECT 146 — ONE SCALE PER SERIES, not one for both.
   *
   * Oil and gas shared a single y-axis taken from `Math.max(oil, gas)`, and they are
   * not the same quantity in the same unit: gas arrives in MMCF and oil in MBBL, so
   * the axis was always the gas axis. Measured on the snap — with All counties
   * selected the peak was 818,878 gas against 21,573.905 oil, so oil drew at 2.6% of
   * the plot height and lay flat on the baseline for all 25 years. The chart's whole
   * job is showing how production moved, and for oil it could not be done.
   *
   * Each series now has its own peak and its own `y`, so each fills the plot and its
   * shape is readable. The five gridlines are shared — both scales put zero on the
   * baseline and their own peak at the top row — which is what keeps one set of
   * horizontal rules honest for two axes: a row means "a quarter of THIS series'
   * maximum", the same statement on both sides.
   *
   * THE TRADE, STATED: heights are no longer comparable BETWEEN the two series, only
   * within one. That is the correct trade — MBBL against MMCF was never a comparison
   * a reader could make from height anyway, it just looked like one. The axes are
   * labelled in their series' own colour and unit so which line belongs to which
   * scale is never a guess.
   */
  const geometry = useMemo(() => {
    const innerWidth = VIEW.width - INSET.left - INSET.right;
    const innerHeight = VIEW.height - INSET.top - INSET.bottom;
    const peakOf = (key: SeriesKey) =>
      data.reduce((top, p) => Math.max(top, p[key]), 0) || 1;
    const peaks: Record<SeriesKey, number> = {
      oil: peakOf("oil"),
      gas: peakOf("gas"),
    };
    const last = data.length - 1 || 1;
    return {
      innerWidth,
      innerHeight,
      peaks,
      // Four gridlines above zero, so the top label is a round-ish readable figure.
      step: (key: SeriesKey) => peaks[key] / 4,
      x: (i: number) => INSET.left + (innerWidth * i) / last,
      y: (key: SeriesKey, v: number) =>
        INSET.top + innerHeight * (1 - v / peaks[key]),
    };
  }, [data]);

  /*
   * WHICH YEARS GET A LABEL.
   *
   * The old rule kept every nth year AND forced the last one, which is how "2024" and
   * "2026" ended up printed on top of each other: the forced final label landed one
   * slot after a kept one with no room between them. Spacing has to be measured, not
   * assumed from a count.
   *
   * So labels are taken left to right only when far enough from the one before, and the
   * final year is then added unconditionally — dropping its neighbour if that is what
   * it takes to fit. The last year is the one a reader looks for, so it wins the
   * collision rather than losing it.
   */
  const yearLabels = useMemo(() => {
    const MIN_GAP = 58; // viewBox units — comfortably wider than a four-digit year
    const picked = new Set<number>();
    let lastX = Number.NEGATIVE_INFINITY;

    data.forEach((_, index) => {
      const x = geometry.x(index);
      if (x - lastX >= MIN_GAP) {
        picked.add(index);
        lastX = x;
      }
    });

    const final = data.length - 1;
    if (final >= 0 && !picked.has(final)) {
      if (geometry.x(final) - lastX < MIN_GAP) {
        // Evict the neighbour that would collide, whichever it is.
        const previous = [...picked].pop();
        if (previous !== undefined && previous !== 0) picked.delete(previous);
      }
      picked.add(final);
    }
    return picked;
  }, [data, geometry]);

  const baseline = INSET.top + geometry.innerHeight;

  const linePath = (key: SeriesKey) =>
    data
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${geometry.x(i).toFixed(1)} ${geometry.y(key, p[key]).toFixed(1)}`,
      )
      .join(" ");

  /* ---- interaction ---- */

  const pointerIndex = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || data.length === 0) return null;
    const scale = VIEW.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const spacing =
      data.length > 1 ? geometry.innerWidth / (data.length - 1) : 1;
    return Math.max(
      0,
      Math.min(data.length - 1, Math.round((x - INSET.left) / spacing)),
    );
  };

  /*
   * DEFECT 126 — THE WHEEL NO LONGER ZOOMS THIS CHART.
   *
   * `onWheel` called `preventDefault()` and rewrote the year range on every wheel
   * tick, so a reader scrolling the page with the pointer anywhere over the plot
   * did not scroll the page: they narrowed or widened the range, and every value
   * on the chart changed under them. That is exactly the report — "when scrolling
   * the page up or down, the Production Over Time chart values change
   * unexpectedly" — and it is wheel-jacking, which is a defect in its own right:
   * a page must never mutate its content because someone scrolled past it.
   *
   * Removed rather than put behind a modifier key. The chart already has a
   * deliberate zoom control directly beneath it — the year brush, with handles to
   * narrow, drag-inside to pan and a Reset — so the wheel was a second, invisible,
   * accidental way to do the same thing. Dragging to pan is untouched; that one
   * takes a held button and cannot fire by accident.
   *
   * It also removes a non-passive wheel listener from a scroll container, which
   * is its own small win for scroll performance.
   */

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!zoom) return;
    dragFrom.current = {
      x: event.clientX,
      start: zoom.start,
      end: zoom.end,
    };
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragFrom.current;
    if (drag && event.buttons === 1) {
      const rect = event.currentTarget.getBoundingClientRect();
      const spanPx = rect.width / Math.max(1, drag.end - drag.start + 1);
      const shift = Math.round((drag.x - event.clientX) / spanPx);
      if (shift !== 0) {
        const span = drag.end - drag.start + 1;
        const start = Math.max(
          0,
          Math.min(all.length - span, drag.start + shift),
        );
        setZoom({ start, end: start + span - 1 });
      }
      return;
    }
    setHover(pointerIndex(event));
  };

  const tinted = (colour: string, amount: string) =>
    `color-mix(in srgb, ${colour} ${amount}, white)`;

  return (
    <div className="rounded-2xl border border-mv-line bg-white px-[22px] py-5 shadow-mv max-[560px]:px-4">
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-[14px]">
        <div className="flex min-w-0 items-start gap-[11px]">
          <span
            aria-hidden="true"
            className="mt-[3px] shrink-0 text-mv-green-deep"
          >
            <Droplet className="h-[19px] w-[19px]" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={cardTitleClass}>Production over time</h2>
            <p className="mt-1 text-[13px] text-mv-muted">
              Reported annual volumes across covered counties
              {unitFor("oil") && unitFor("gas")
                ? ` · oil (${unitFor("oil")}), gas (${unitFor("gas")})`
                : ""}
            </p>
          </div>
        </div>

        <CountyFilter
          value={county}
          options={options}
          onChange={(next) => {
            setCounty(next);
            // A new series has its own year range, so both the window and the range
            // it produced are meaningless — clear them together, or the next request
            // asks the new county for the old county's years.
            setZoom(null);
            setRange(null);
            setHover(null);
          }}
        />
      </div>

      {/* ---- summary cards, tinted per series ---- */}
      <div className="mt-4 grid grid-cols-2 gap-[14px] max-[860px]:grid-cols-1">
        {SERIES.map((series) => {
          // The API's own total over the selected range, not a figure summed here and
          // not a single year's value.
          const value =
            series.key === "oil"
              ? (graph.range?.totalOil ?? 0)
              : (graph.range?.totalGas ?? 0);

          return (
            <div
              key={series.key}
              className="flex items-center gap-3 rounded-[14px] border px-4 py-[14px]"
              style={{
                background: tinted(series.colour, "5%"),
                borderColor: tinted(series.colour, "22%"),
              }}
            >
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{ background: tinted(series.colour, "14%") }}
              >
                <Droplet
                  className="h-[17px] w-[17px]"
                  strokeWidth={2}
                  style={{ color: series.colour, fill: series.colour }}
                />
              </span>

              {/* Label and figure share a baseline on one row. `flex-wrap` is the
                  safety valve, not the intent: it only engages if the card is squeezed
                  narrower than the two can sit in, which the grid's single column below
                  640px avoids. */}
              <p className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-[2px]">
                <span className="text-[13px] font-semibold text-mv-ink-soft">
                  {series.label}
                </span>
                <span
                  className="text-[22px] font-extrabold leading-[1.1] tracking-[-.02em] tabular-nums max-[420px]:text-[18px]"
                  style={{ color: series.colour }}
                >
                  {graph.status === "loading" && graph.range === null ? (
                    <span className="inline-block h-[22px] w-[104px] animate-pulse rounded-md bg-mv-line-soft align-middle" />
                  ) : (
                    <>
                      {exact(value)}
                      <small className="ml-[3px] text-[12.5px] font-bold">
                        {unitFor(series.key)}
                      </small>
                    </>
                  )}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {/* ---- the applied county, above the plot ----
          `aria-live` because the figures and the plot both change under a filter the
          user drove from elsewhere on the card; this line is the confirmation that the
          change landed. */}
      <p
        aria-live="polite"
        className="mt-4 truncate text-[13px] font-bold text-mv-ink"
      >
        {/*
          DEFECT 135 — the applied year range used to print here, beside the county.
          It said the same thing as three other places on the same card: the x-axis is
          labelled with those years, the brush under it shows the window it selected,
          and the brush's own chip repeats it as "1999–2025 · Reset". A fourth copy
          that cannot be acted on is noise, and it was the one the snap ringed.

          THE COUNTY STAYS, and so does `aria-live`. This line is the confirmation
          that a filter change landed — the dropdown that drives it sits at the far
          corner of the card — and the years are still spoken in the SVG's own
          `aria-label` below, so nothing is lost to a screen reader.
        */}
        {appliedCounty}
      </p>

      {/* ---- chart ---- */}
      <div
        className="relative mt-2 h-[400px] max-[767px]:h-[280px]"
        aria-busy={graph.status === "loading"}
      >
        {graph.status === "error" ? (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-mv-line bg-mv-bg px-4 text-center"
          >
            <p className="text-sm text-mv-ink-soft">
              Production data could not be loaded.
            </p>
            <button
              type="button"
              onClick={graph.retry}
              className="cursor-pointer rounded-[10px] border border-mv-line bg-white px-4 py-2 text-[13px] font-semibold text-mv-slate hover:border-mv-line-strong hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              Try again
            </button>
          </div>
        ) : graph.status === "empty" ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-mv-line bg-mv-bg px-4 text-center">
            <p className="text-sm text-mv-muted">
              No reported production for{" "}
              {county === ALL_COUNTIES ? "this operator" : appliedCounty}.
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-mv-line bg-mv-bg">
            <span className="sr-only">Loading production</span>
            <span
              aria-hidden="true"
              className="h-3 w-[220px] animate-pulse rounded-md bg-mv-line-soft"
            />
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
              className={`block h-full w-full touch-pan-y overflow-visible transition-opacity ${
                graph.status === "loading" ? "opacity-50" : "opacity-100"
              } ${zoom ? "cursor-grab" : ""}`}
              role="img"
              aria-label={`Annual oil and gas production, ${data[0]?.year} to ${data.at(-1)?.year}, for ${appliedCounty}.`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (dragFrom.current = null)}
              onPointerLeave={() => {
                dragFrom.current = null;
                setHover(null);
              }}
              onDoubleClick={() => {
                setZoom(null);
                setHover(null);
              }}
            >
              <defs>
                {SERIES.map((series) => (
                  <linearGradient
                    key={series.key}
                    id={`${gradientId}-${series.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0"
                      stopColor={series.colour}
                      stopOpacity=".22"
                    />
                    <stop
                      offset="1"
                      stopColor={series.colour}
                      stopOpacity="0"
                    />
                  </linearGradient>
                ))}
              </defs>

              {/* Dashed gridlines. THE TICK LABEL IS THE ONE FIGURE HERE THAT MAY BE
                  ROUNDED, because it is not a reported value: `step` is `peak / 4`, so
                  these are synthetic scale marks and their decimals are an artefact of
                  the division — "204,719.507" says nothing "204,720" does not. Rounded
                  only where the step is large enough for whole numbers to separate the
                  lines; a small-volume operator keeps the decimals it needs. */}
              {Array.from({ length: 5 }, (_, i) => {
                /* One row of rules, two tick labels. Both scales put zero on the
                   baseline and their own peak on the top row, so row `i` is "a
                   quarter of this series' maximum" on either side — the same
                   statement, which is what lets one set of rules serve two axes.
                   The y is taken from the oil scale purely because the two agree on
                   it by construction. */
                const y = geometry.y("oil", geometry.step("oil") * i);
                const tick = (key: SeriesKey) => {
                  const step = geometry.step(key);
                  if (i === 0) return "0";
                  const value = step * i;
                  // Rounded only where the step is large enough for whole numbers to
                  // separate the lines; a small-volume operator keeps its decimals.
                  return step >= 100
                    ? Math.round(value).toLocaleString("en-US")
                    : exact(value);
                };
                return (
                  <g key={i}>
                    <line
                      x1={INSET.left}
                      x2={VIEW.width - INSET.right}
                      y1={y.toFixed(1)}
                      y2={y.toFixed(1)}
                      stroke="var(--color-mv-line)"
                      strokeDasharray={i === 0 ? undefined : "5 5"}
                    />
                    {/* Each axis is drawn in its own series' colour. With two scales
                        on one plot, "which line does this number belong to" has to be
                        answerable without counting — colour answers it at a glance,
                        and the axis captions above name the unit outright. */}
                    <text
                      x={INSET.left - 12}
                      y={(y + 4).toFixed(1)}
                      textAnchor="end"
                      fontSize="13"
                      fill={SERIES[0].colour}
                    >
                      {tick("oil")}
                    </text>
                    <text
                      x={VIEW.width - AXIS_RIGHT + 4}
                      y={(y + 4).toFixed(1)}
                      textAnchor="start"
                      fontSize="13"
                      fill={SERIES[1].colour}
                    >
                      {tick("gas")}
                    </text>
                  </g>
                );
              })}

              {/*
                THE AXIS CAPTIONS, and defect 147's "explicit indicator" in the one
                place the page's units actually change under the reader: this chart
                answers MBBL/MMCF for All counties and MMBBL/BCF for a single county,
                so selecting a county silently rescaled both axes by a thousand. The
                unit now sits on the axis it scales and is read from the response, so
                it changes with it.
              */}
              <text
                x={INSET.left - 12}
                y={INSET.top - 8}
                textAnchor="end"
                fontSize="12"
                fontWeight="700"
                fill={SERIES[0].colour}
              >
                {unitFor("oil") ? `Oil · ${unitFor("oil")}` : "Oil"}
              </text>
              <text
                x={VIEW.width - AXIS_RIGHT + 4}
                y={INSET.top - 8}
                textAnchor="start"
                fontSize="12"
                fontWeight="700"
                fill={SERIES[1].colour}
              >
                {unitFor("gas") ? `Gas · ${unitFor("gas")}` : "Gas"}
              </text>

              {/* year labels — see `yearLabels`; the last year always shows */}
              {data.map((p, i) =>
                yearLabels.has(i) ? (
                  <text
                    key={p.year}
                    x={geometry.x(i).toFixed(1)}
                    y={VIEW.height - 14}
                    textAnchor="middle"
                    fontSize="14"
                    fill="var(--color-mv-ink-soft)"
                  >
                    {p.year}
                  </text>
                ) : null,
              )}

              {/* crosshair */}
              {hover !== null && data[hover] ? (
                <line
                  x1={geometry.x(hover)}
                  x2={geometry.x(hover)}
                  y1={INSET.top}
                  y2={baseline}
                  stroke="var(--color-mv-placeholder)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ) : null}

              {SERIES.map((series) => (
                <g key={series.key}>
                  <path
                    d={`${linePath(series.key)} L${geometry.x(data.length - 1).toFixed(1)} ${baseline.toFixed(1)} L${geometry.x(0).toFixed(1)} ${baseline.toFixed(1)} Z`}
                    fill={`url(#${gradientId}-${series.key})`}
                  />
                  <path
                    d={linePath(series.key)}
                    fill="none"
                    stroke={series.colour}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {data.map((p, i) => (
                    <circle
                      key={p.year}
                      cx={geometry.x(i).toFixed(1)}
                      cy={geometry.y(series.key, p[series.key]).toFixed(1)}
                      r={hover === i ? 6 : 3.2}
                      fill={hover === i ? "#fff" : series.colour}
                      stroke={series.colour}
                      strokeWidth={hover === i ? 2.4 : 0}
                    />
                  ))}

                  {/*
                    The end pill.

                    DEFECT 150 — this was a FIXED 82px rect with its text centred
                    inside it, so the pill fitted the number only by luck. `exact()`
                    prints the API's own figure in full, thousands separators and up
                    to three decimals included, and "1,444,012.261" is thirteen
                    characters — roughly 104px at this weight and size. The text
                    overflowed the rect symmetrically and ran past `VIEW.width`,
                    where the SVG viewport clips it: the last year's value, which is
                    the single number a reader comes to this chart for, was cut off
                    at the card's edge.

                    THE PILL IS NOW SIZED TO ITS TEXT and pinned so its right edge
                    can never leave the viewBox. `PILL_CHAR` is a measured advance
                    width for these digits at 14px/700 rather than a guess — SVG has
                    no intrinsic sizing to lean on here, and a `<foreignObject>` for
                    two labels would cost more than it returns.

                    IT PREFERS THE RESERVED GUTTER and only encroaches on the plot
                    when the number genuinely does not fit in it, which is the right
                    trade: a pill overlapping a few pixels of empty right-hand plot
                    is legible, and a clipped one is not.
                  */}
                  {(() => {
                    const lastPoint = data.at(-1);
                    if (!lastPoint) return null;
                    const label = exact(lastPoint[series.key]);
                    const y = geometry.y(series.key, lastPoint[series.key]);
                    const width = Math.max(
                      56,
                      label.length * PILL_CHAR + PILL_PAD * 2,
                    );
                    const x = Math.min(
                      VIEW.width - INSET.right + 10,
                      PILL_LIMIT - width,
                    );
                    return (
                      <g>
                        <rect
                          x={x}
                          y={y - 15}
                          width={width}
                          height="30"
                          rx="15"
                          fill={series.colour}
                        />
                        <text
                          x={x + width / 2}
                          y={y + 5}
                          textAnchor="middle"
                          fontSize="14"
                          fontWeight="700"
                          fill="#fff"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              ))}
            </svg>

            {/* tooltip, positioned over the crosshair */}
            {hover !== null && data[hover] ? (
              <div
                /*
                 * DEFECT 138 — the tooltip is pinned to the crosshair and flips
                 * side at the midpoint, which keeps it clear of the pointer but
                 * not inside the card: near either edge the flipped box still ran
                 * past it. `max-w` bounds it to the plot's own width and
                 * `clamp()` holds its left edge between the two insets, so the
                 * box stops travelling once it reaches an edge instead of hanging
                 * over it. The flip is unchanged, so it still never sits under
                 * the pointer.
                 */
                className="pointer-events-none absolute z-10 min-w-[190px] max-w-[min(260px,calc(100%-24px))] rounded-[10px] bg-mv-tooltip px-[14px] py-3 shadow-mv"
                style={{
                  left: `clamp(12px, ${(geometry.x(hover) / VIEW.width) * 100}%, calc(100% - 12px))`,
                  top: "52%",
                  transform:
                    geometry.x(hover) > VIEW.width / 2
                      ? "translate(calc(-100% - 14px), -50%)"
                      : "translate(14px, -50%)",
                }}
              >
                <p className="mb-2 text-[13px] font-extrabold text-white">
                  {data[hover].year}
                </p>
                {SERIES.map((series) => (
                  <p
                    key={series.key}
                    className="my-1 flex items-center justify-between gap-5 text-[13px]"
                  >
                    <span className="flex items-center gap-2 text-mv-on-deep-muted">
                      <span
                        aria-hidden="true"
                        className="h-[9px] w-[9px] rounded-full"
                        style={{ background: series.colour }}
                      />
                      {/* DEFECT 129 — the snap rings the gap between the series
                          name and its figure. A colon is what reads them as one
                          statement rather than two columns that happen to align. */}
                      {series.label}:
                    </span>
                    <b className="font-bold tabular-nums text-white">
                      {exact(data[hover][series.key])}
                      <small className="ml-[3px] font-semibold text-mv-on-deep-muted">
                        {unitFor(series.key)}
                      </small>
                    </b>
                  </p>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ---- the zoom range, under the x-axis ---- */}
      {all.length > 0 ? (
        <YearBrush
          years={all.map((p) => p.year)}
          values={all.map((p) => p.oil + p.gas)}
          zoom={zoom}
          onChange={(next) => {
            setZoom(next);
            setHover(null);
          }}
        />
      ) : null}

      {/*
        DEFECT 139 — the legend chips and the units footnote both stood here, and the
        snap ringed both. Neither carried anything the card was not already saying:

          the chips     named and coloured two series that the two KPI panels at the
                        top of the card already name, in the same two colours, with
                        their totals. They were plain spans, not toggles, so nothing
                        was interactive and nothing is lost.
          the footnote  read "Volumes as reported · oil in MBBL · gas in MMCF" while
                        the subtitle directly above the panels already reads
                        "· oil (MBBL), gas (MMCF)" from the same `unitFor`, and each
                        KPI panel prints its own unit beside its figure.

        The series are still identified for a screen reader: each `<path>` carries its
        own title, and the tooltip names both series with their units.
      */}
    </div>
  );
}
