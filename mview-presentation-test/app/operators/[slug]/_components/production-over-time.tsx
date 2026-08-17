"use client";

import { Droplet, Info } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

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
 * EVERYTHING IS IN MILLIONS. Raw barrels and Mcf are divided once, here, and every
 * figure below — axis, cards, tooltip, end pills — reads off the same scaled numbers.
 * The `MM` suffix rides on each gridline label, so the axis needs no caption of its
 * own; the strip above the plot names the applied county instead.
 *
 * THE PLOT IS ALWAYS AN AREA. The line/area toggle is gone on request, so the fill is
 * unconditional rather than a mode nothing can switch. Units are not lost with the old
 * "(bbl)" / "(Mcf)" labels: the subtitle and the footnote both still carry them.
 *
 * ZOOM IS A VISIBLE CONTROL. `YearBrush` under the x-axis owns the range: drag its
 * handles to narrow, drag inside to pan, press Reset or double-click to restore. The
 * wheel and the plot-area drag still work for anyone who reaches for them, but the
 * chart no longer depends on a gesture nothing on screen advertises and touch does not
 * have. All of them write the same `zoom` index window, so the two paths cannot
 * disagree about what is shown.
 */

const VIEW = { width: 1040, height: 400 } as const;
const INSET = { top: 22, right: 96, bottom: 46, left: 96 } as const;

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

/** Millions, two decimals — the design's `181.37MM`. */
const mm = (value: number) => (value / 1e6).toFixed(2);
/** Millions, two decimals with a single M — the design's end pills, `786.43M`. */
const pill = (value: number) => `${(value / 1e6).toFixed(2)}M`;

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
    county === ALL_COUNTIES ? "All counties" : `${titleCase(county)} County`;

  const graph = useProductionGraph({
    operatorNumber,
    county: apiCounty,
    range,
  });

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

  const geometry = useMemo(() => {
    const innerWidth = VIEW.width - INSET.left - INSET.right;
    const innerHeight = VIEW.height - INSET.top - INSET.bottom;
    const peak = data.reduce((top, p) => Math.max(top, p.oil, p.gas), 0) || 1;
    // Four gridlines above zero, on a round-ish step, so the top label is readable.
    const step = peak / 4;
    const last = data.length - 1 || 1;
    return {
      innerWidth,
      innerHeight,
      max: peak,
      step,
      x: (i: number) => INSET.left + (innerWidth * i) / last,
      y: (v: number) => INSET.top + innerHeight * (1 - v / peak),
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
          `${i === 0 ? "M" : "L"}${geometry.x(i).toFixed(1)} ${geometry.y(p[key]).toFixed(1)}`,
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

  const onWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      if (all.length < 4) return;
      event.preventDefault();
      setZoom((current) => {
        const start = current?.start ?? 0;
        const end = current?.end ?? all.length - 1;
        const span = end - start + 1;
        // In narrows, out widens, both anchored on the middle. Three years is the
        // floor — below that there is no line left to read.
        const next =
          event.deltaY < 0
            ? Math.max(3, span - 2)
            : Math.min(all.length, span + 2);
        if (next === span) return current;
        const centre = Math.round((start + end) / 2);
        let from = Math.max(0, centre - Math.floor(next / 2));
        const to = Math.min(all.length - 1, from + next - 1);
        from = Math.max(0, to - next + 1);
        return from === 0 && to === all.length - 1
          ? null
          : { start: from, end: to };
      });
    },
    [all.length],
  );

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
              Reported annual volumes across covered counties · oil (bbl), gas
              (Mcf)
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
                      {mm(value)}
                      <small className="ml-[1px] text-[12.5px] font-bold">
                        MM
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
        {appliedCounty}
        {data.length > 0 ? (
          <span className="ml-2 font-medium text-mv-muted">
            {data[0]?.year === data.at(-1)?.year
              ? data[0]?.year
              : `${data[0]?.year}–${data.at(-1)?.year}`}
          </span>
        ) : null}
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
              onWheel={onWheel}
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

              {/* dashed gridlines, MM labels */}
              {Array.from({ length: 5 }, (_, i) => {
                const value = geometry.step * i;
                const y = geometry.y(value);
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
                    <text
                      x={INSET.left - 12}
                      y={(y + 4).toFixed(1)}
                      textAnchor="end"
                      fontSize="13"
                      fill="var(--color-mv-placeholder)"
                    >
                      {i === 0 ? "0" : `${mm(value)}MM`}
                    </text>
                  </g>
                );
              })}

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
                      cy={geometry.y(p[series.key]).toFixed(1)}
                      r={hover === i ? 6 : 3.2}
                      fill={hover === i ? "#fff" : series.colour}
                      stroke={series.colour}
                      strokeWidth={hover === i ? 2.4 : 0}
                    />
                  ))}

                  {/* the end pill */}
                  {(() => {
                    const lastPoint = data.at(-1);
                    if (!lastPoint) return null;
                    const y = geometry.y(lastPoint[series.key]);
                    const x = VIEW.width - INSET.right + 12;
                    return (
                      <g>
                        <rect
                          x={x}
                          y={y - 15}
                          width="82"
                          height="30"
                          rx="15"
                          fill={series.colour}
                        />
                        <text
                          x={x + 41}
                          y={y + 5}
                          textAnchor="middle"
                          fontSize="14"
                          fontWeight="700"
                          fill="#fff"
                        >
                          {pill(lastPoint[series.key])}
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
                className="pointer-events-none absolute z-10 min-w-[190px] rounded-[10px] bg-mv-tooltip px-[14px] py-3 shadow-mv"
                style={{
                  left: `${(geometry.x(hover) / VIEW.width) * 100}%`,
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
                      {series.label}
                    </span>
                    <b className="font-bold tabular-nums text-white">
                      {mm(data[hover][series.key])}MM
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

      {/* ---- legend chips ---- */}
      <div className="mt-3 flex flex-wrap gap-[10px]">
        {SERIES.map((series) => (
          <span
            key={series.key}
            className="inline-flex items-center gap-2 rounded-full border px-[14px] py-[7px] text-[13px] font-semibold text-mv-ink-soft"
            style={{
              background: tinted(series.colour, "6%"),
              borderColor: tinted(series.colour, "24%"),
            }}
          >
            <span
              aria-hidden="true"
              className="h-[9px] w-[9px] rounded-full"
              style={{ background: series.colour }}
            />
            {series.label}
          </span>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-[7px] text-[12.5px] text-mv-muted">
        <Info
          aria-hidden="true"
          className="h-[14px] w-[14px] shrink-0"
          strokeWidth={1.9}
        />
        Oil in barrels (bbl) · Gas in thousand cubic feet (Mcf)
      </p>
    </div>
  );
}
